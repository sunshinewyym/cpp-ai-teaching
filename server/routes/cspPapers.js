const express = require('express');
const db = require('../db');
const { auth, requireTeacher } = require('../middleware/auth');
const { gradeQuestion, loadQuestionBank } = require('../training/questionBank');
const { buildTrainingPracticeRecord } = require('../training/trainingRecord');

const router = express.Router();
const PAPER_YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
const QUESTION_ORDER = { choice: 0, reading: 1, completion: 2 };

function cleanText(value, maxLength = 200) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeLevel(value) {
  return String(value || '').toUpperCase() === 'CSP-S' ? 'CSP-S' : 'CSP-J';
}

function questionType(questionId) {
  const match = /-(choice|reading|completion)-(\d+)$/i.exec(String(questionId || ''));
  return match ? match[1].toLowerCase() : '';
}

function questionNumber(questionId) {
  const match = /-(?:choice|reading|completion)-(\d+)$/i.exec(String(questionId || ''));
  return match ? Number(match[1]) : 0;
}

function questionBelongsToPaper(questionId, level, year) {
  const prefix = normalizeLevel(level) === 'CSP-S' ? `csp-s-${Number(year)}` : `${Number(year)}`;
  return String(questionId || '').toLowerCase().startsWith(`${prefix.toLowerCase()}-`);
}

async function getPaperDefinition(level, year) {
  const normalizedLevel = normalizeLevel(level);
  const normalizedYear = Number(year);
  if (!PAPER_YEARS.includes(normalizedYear)) throw new Error('暂不支持该年份的 CSP 试卷');
  const bank = await loadQuestionBank();
  const ids = [...bank.keys()]
    .filter(id => questionBelongsToPaper(id, normalizedLevel, normalizedYear))
    .sort((left, right) => {
      const typeDiff = QUESTION_ORDER[questionType(left)] - QUESTION_ORDER[questionType(right)];
      return typeDiff || questionNumber(left) - questionNumber(right);
    });
  const counts = { choice: 0, reading: 0, completion: 0 };
  for (const id of ids) counts[questionType(id)] += 1;
  if (counts.choice !== 15 || counts.reading !== 3 || counts.completion !== 2) {
    throw new Error(`${normalizedLevel} ${normalizedYear} 题库不完整（选择 ${counts.choice}/15，阅读 ${counts.reading}/3，完善 ${counts.completion}/2）`);
  }
  const maxScore = ids.reduce((total, id) => {
    const definition = bank.get(id);
    return total + definition.parts.reduce((sum, part) => sum + Number(part.score || 0), 0);
  }, 0);
  return {
    level: normalizedLevel,
    year: normalizedYear,
    questionIds: ids,
    counts,
    maxScore,
  };
}

function parseQuestionIds(row) {
  try {
    const ids = JSON.parse(row?.question_ids_json || '[]');
    return Array.isArray(ids) ? ids.map(String) : [];
  } catch {
    return [];
  }
}

function parseAnswers(value) {
  try {
    const answers = JSON.parse(value || '{}');
    return answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
  } catch {
    return {};
  }
}

function normalizeAnswers(value) {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map(item => String(item || '').trim()).filter(Boolean))].sort();
}

function partView(part, answers) {
  const selected = normalizeAnswers(answers?.[part.id]);
  const correctAnswers = normalizeAnswers(part.answers);
  const correct = selected.length === correctAnswers.length
    && selected.every((item, index) => item === correctAnswers[index]);
  return {
    id: part.id,
    selected,
    correctAnswers,
    correct,
    score: correct ? Number(part.score || 0) : 0,
    maxScore: Number(part.score || 0),
  };
}

function isCorrectSubmission(submission, definition) {
  if (!submission || !definition) return false;
  const answers = parseAnswers(submission.answers_json);
  return definition.parts.every(part => partView(part, answers).correct);
}

function studentScope(req) {
  return req.user?.is_admin ? '' : ' AND u.created_by = ?';
}

function studentScopeParams(req, values) {
  return req.user?.is_admin ? values : [...values, req.user.id];
}

function findStudents(req, ids) {
  const uniqueIds = [...new Set((Array.isArray(ids) ? ids : [])
    .map(Number).filter(id => Number.isInteger(id) && id > 0))];
  if (!uniqueIds.length) return [];
  const placeholders = uniqueIds.map(() => '?').join(',');
  const sql = `SELECT id, name, username, class_name
    FROM users u WHERE u.role = 'student' AND u.id IN (${placeholders})${studentScope(req)}`;
  return db.prepare(sql).all(...studentScopeParams(req, uniqueIds));
}

function getTeacherAssignment(req, id) {
  return db.prepare(`
    SELECT * FROM csp_paper_assignments
    WHERE id = ? AND teacher_id = ?
  `).get(Number(id), req.user.id);
}

function getStudentAssignment(req, id) {
  return db.prepare(`
    SELECT a.*, ps.id AS assignment_student_id, ps.student_id, ps.completed_at
    FROM csp_paper_assignments a
    JOIN csp_paper_students ps ON ps.assignment_id = a.id
    WHERE a.id = ? AND ps.student_id = ?
  `).get(Number(id), req.user.id);
}

function assignmentRowsForTeacher(req) {
  return db.prepare(`
    SELECT a.*, COUNT(DISTINCT ps.id) AS student_count,
      COUNT(DISTINCT CASE WHEN ps.completed_at IS NOT NULL THEN ps.id END) AS completed_count,
      COUNT(s.id) AS submission_count
    FROM csp_paper_assignments a
    LEFT JOIN csp_paper_students ps ON ps.assignment_id = a.id
    LEFT JOIN csp_paper_submissions s ON s.assignment_student_id = ps.id
    WHERE a.teacher_id = ?
    GROUP BY a.id
    ORDER BY a.created_at DESC, a.id DESC
  `).all(req.user.id);
}

async function buildTeacherDetail(req, assignment) {
  const definition = await getPaperDefinition(assignment.level, assignment.year);
  const bank = await loadQuestionBank();
  const students = db.prepare(`
    SELECT ps.id AS assignmentStudentId, ps.student_id AS studentId, ps.assigned_at AS assignedAt,
      ps.completed_at AS completedAt, u.name, u.username, u.class_name AS className
    FROM csp_paper_students ps
    JOIN users u ON u.id = ps.student_id
    WHERE ps.assignment_id = ?
    ORDER BY u.class_name, u.name
  `).all(assignment.id);
  const submissions = db.prepare(`
    SELECT s.* FROM csp_paper_submissions s
    JOIN csp_paper_students ps ON ps.id = s.assignment_student_id
    WHERE ps.assignment_id = ?
  `).all(assignment.id);
  const submissionsByStudentQuestion = new Map(
    submissions.map(item => [`${item.assignment_student_id}:${item.question_id}`, item])
  );
  const questions = definition.questionIds.map(questionId => {
    const qDefinition = bank.get(questionId);
    const details = students.map(student => {
      const submission = submissionsByStudentQuestion.get(`${student.assignmentStudentId}:${questionId}`);
      const answers = parseAnswers(submission?.answers_json);
      const parts = submission ? qDefinition.parts.map(part => partView(part, answers)) : [];
      return {
        studentId: student.studentId,
        name: student.name,
        className: student.className || '',
        submitted: Boolean(submission),
        answers,
        submittedAt: submission?.submitted_at || null,
        score: parts.reduce((sum, part) => sum + part.score, 0),
        maxScore: qDefinition.parts.reduce((sum, part) => sum + Number(part.score || 0), 0),
        correct: submission ? isCorrectSubmission(submission, qDefinition) : false,
        parts,
      };
    });
    const answered = details.filter(item => item.submitted);
    const score = answered.reduce((sum, item) => sum + item.score, 0);
    const maxScore = answered.reduce((sum, item) => sum + item.maxScore, 0);
    return {
      questionId,
      type: questionType(questionId),
      number: questionNumber(questionId),
      submitted: answered.length,
      total: students.length,
      averagePercent: maxScore ? Math.round((score / maxScore) * 1000) / 10 : null,
      details,
    };
  });
  const studentResults = students.map(student => {
    const results = definition.questionIds.map(questionId => {
      const submission = submissionsByStudentQuestion.get(`${student.assignmentStudentId}:${questionId}`);
      if (!submission) return null;
      const qDefinition = bank.get(questionId);
      return qDefinition.parts.map(part => partView(part, parseAnswers(submission.answers_json)));
    }).filter(Boolean);
    const score = results.flat().reduce((sum, part) => sum + part.score, 0);
    return {
      ...student,
      submitted: results.length,
      total: definition.questionIds.length,
      score,
      maxScore: definition.maxScore,
      percent: definition.maxScore ? Math.round((score / definition.maxScore) * 1000) / 10 : null,
    };
  });
  return {
    id: assignment.id,
    title: assignment.title,
    level: assignment.level,
    year: assignment.year,
    deadline: assignment.deadline || '',
    analysisReleasedAt: assignment.analysis_released_at || null,
    questionIds: definition.questionIds,
    counts: definition.counts,
    maxScore: definition.maxScore,
    students: studentResults,
    questions,
  };
}

async function buildStudentDetail(req, assignment) {
  const definition = await getPaperDefinition(assignment.level, assignment.year);
  const bank = await loadQuestionBank();
  const rows = db.prepare(`
    SELECT * FROM csp_paper_submissions
    WHERE assignment_student_id = ?
  `).all(assignment.assignment_student_id);
  const byQuestion = new Map(rows.map(row => [row.question_id, row]));
  const submissions = {};
  for (const questionId of definition.questionIds) {
    const submission = byQuestion.get(questionId);
    if (!submission) continue;
    const item = {
      submitted: true,
      answers: parseAnswers(submission.answers_json),
      submittedAt: submission.submitted_at,
    };
    if (assignment.analysis_released_at) {
      const qDefinition = bank.get(questionId);
      item.parts = qDefinition.parts.map(part => partView(part, item.answers));
      item.score = item.parts.reduce((sum, part) => sum + part.score, 0);
      item.maxScore = item.parts.reduce((sum, part) => sum + part.maxScore, 0);
      item.correct = isCorrectSubmission(submission, qDefinition);
    }
    submissions[questionId] = item;
  }
  return {
    id: assignment.id,
    title: assignment.title,
    level: assignment.level,
    year: assignment.year,
    deadline: assignment.deadline || '',
    analysisReleasedAt: assignment.analysis_released_at || null,
    completedAt: assignment.completed_at || null,
    questionIds: definition.questionIds,
    counts: definition.counts,
    maxScore: definition.maxScore,
    submittedCount: rows.length,
    total: definition.questionIds.length,
    submissions,
  };
}

router.get('/available', auth, async (req, res, next) => {
  try {
    const papers = [];
    for (const level of ['CSP-J', 'CSP-S']) {
      for (const year of PAPER_YEARS) {
        try {
          const definition = await getPaperDefinition(level, year);
          papers.push({
            level,
            year,
            title: `${level} ${year} 第一轮真题`,
            counts: definition.counts,
            questionCount: definition.questionIds.length,
            maxScore: definition.maxScore,
          });
        } catch {
          // 题库不完整的年份不出现在可布置列表中。
        }
      }
    }
    res.json(papers);
  } catch (error) {
    next(error);
  }
});

router.get('/assignments', auth, requireTeacher, (req, res) => {
  res.json(assignmentRowsForTeacher(req));
});

router.post('/assignments', auth, requireTeacher, async (req, res, next) => {
  try {
    const level = normalizeLevel(req.body?.level);
    const year = Number(req.body?.year);
    const definition = await getPaperDefinition(level, year);
    const students = findStudents(req, req.body?.studentIds);
    if (!students.length) return res.status(400).json({ error: '请至少选择一名学生' });
    const title = cleanText(req.body?.title, 120) || `${level} ${year} 第一轮整卷任务`;
    const deadline = cleanText(req.body?.deadline, 40);
    db.exec('BEGIN IMMEDIATE');
    try {
      const saved = db.prepare(`
        INSERT INTO csp_paper_assignments
          (teacher_id, level, year, title, question_ids_json, deadline)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(req.user.id, level, year, title, JSON.stringify(definition.questionIds), deadline);
      const assignmentId = Number(saved.lastInsertRowid);
      const insertStudent = db.prepare(
        'INSERT INTO csp_paper_students (assignment_id, student_id) VALUES (?, ?)'
      );
      for (const student of students) insertStudent.run(assignmentId, student.id);
      db.exec('COMMIT');
      const assignment = getTeacherAssignment(req, assignmentId);
      res.status(201).json(await buildTeacherDetail(req, assignment));
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    if (error.message.includes('题库') || error.message.includes('选择')) return res.status(400).json({ error: error.message });
    next(error);
  }
});

router.get('/assignments/:id', auth, requireTeacher, async (req, res, next) => {
  try {
    const assignment = getTeacherAssignment(req, req.params.id);
    if (!assignment) return res.status(404).json({ error: '整卷任务不存在' });
    res.json(await buildTeacherDetail(req, assignment));
  } catch (error) {
    next(error);
  }
});

router.post('/assignments/:id/students', auth, requireTeacher, async (req, res, next) => {
  try {
    const assignment = getTeacherAssignment(req, req.params.id);
    if (!assignment) return res.status(404).json({ error: '整卷任务不存在' });
    const students = findStudents(req, req.body?.studentIds);
    if (!students.length) return res.status(400).json({ error: '请至少选择一名学生' });
    const insertStudent = db.prepare('INSERT OR IGNORE INTO csp_paper_students (assignment_id, student_id) VALUES (?, ?)');
    for (const student of students) insertStudent.run(assignment.id, student.id);
    res.json(await buildTeacherDetail(req, assignment));
  } catch (error) {
    next(error);
  }
});

router.post('/assignments/:id/release', auth, requireTeacher, async (req, res, next) => {
  try {
    const assignment = getTeacherAssignment(req, req.params.id);
    if (!assignment) return res.status(404).json({ error: '整卷任务不存在' });
    db.prepare(`
      UPDATE csp_paper_assignments
      SET analysis_released_at = COALESCE(analysis_released_at, datetime('now','localtime')),
          updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(assignment.id);
    const updated = getTeacherAssignment(req, assignment.id);
    res.json(await buildTeacherDetail(req, updated));
  } catch (error) {
    next(error);
  }
});

router.get('/student/assignments', auth, async (req, res, next) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: '需要学生账号' });
  try {
    const rows = db.prepare(`
      SELECT a.id, a.title, a.level, a.year, a.deadline, a.analysis_released_at AS analysisReleasedAt,
        ps.id AS assignmentStudentId, ps.completed_at AS completedAt,
        COUNT(s.id) AS submittedCount
      FROM csp_paper_students ps
      JOIN csp_paper_assignments a ON a.id = ps.assignment_id
      LEFT JOIN csp_paper_submissions s ON s.assignment_student_id = ps.id
      WHERE ps.student_id = ?
      GROUP BY a.id
      ORDER BY a.created_at DESC, a.id DESC
    `).all(req.user.id);
    const result = [];
    const bank = await loadQuestionBank();
    const studentSubmissions = db.prepare('SELECT * FROM csp_paper_submissions WHERE assignment_student_id = ?');
    for (const row of rows) {
      const definition = await getPaperDefinition(row.level, row.year);
      const { assignmentStudentId, ...assignment } = row;
      const score = row.analysisReleasedAt
        ? studentSubmissions.all(row.assignmentStudentId).reduce((total, submission) => {
          const question = bank.get(submission.question_id);
          if (!question) return total;
          const answers = parseAnswers(submission.answers_json);
          return total + question.parts.reduce((sum, part) => sum + partView(part, answers).score, 0);
        }, 0)
        : null;
      result.push({
        ...assignment,
        submittedCount: Number(row.submittedCount || 0),
        total: definition.questionIds.length,
        maxScore: definition.maxScore,
        score,
      });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/student/assignments/:id', auth, async (req, res, next) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: '需要学生账号' });
  try {
    const assignment = getStudentAssignment(req, req.params.id);
    if (!assignment) return res.status(404).json({ error: '没有找到这份整卷任务' });
    res.json(await buildStudentDetail(req, assignment));
  } catch (error) {
    next(error);
  }
});

router.post('/student/assignments/:id/questions/:questionId/start', auth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: '需要学生账号' });
  const assignment = getStudentAssignment(req, req.params.id);
  const questionId = String(req.params.questionId || '');
  if (!assignment || !parseQuestionIds(assignment).includes(questionId)) return res.status(404).json({ error: '题目不属于这份整卷任务' });
  db.prepare(`
    INSERT OR IGNORE INTO csp_paper_question_attempts (assignment_student_id, question_id)
    VALUES (?, ?)
  `).run(assignment.assignment_student_id, questionId);
  res.json({ started: true });
});

router.post('/student/assignments/:id/questions/:questionId/submit', auth, async (req, res, next) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: '需要学生账号' });
  try {
    const assignment = getStudentAssignment(req, req.params.id);
    const questionId = String(req.params.questionId || '');
    if (!assignment || !parseQuestionIds(assignment).includes(questionId)) return res.status(404).json({ error: '题目不属于这份整卷任务' });
    if (assignment.deadline) {
      const deadlineMs = Date.parse(String(assignment.deadline).replace(' ', 'T'));
      if (Number.isFinite(deadlineMs) && Date.now() > deadlineMs) return res.status(409).json({ error: '这份整卷已经超过截止时间' });
    }
    const existing = db.prepare(`
      SELECT * FROM csp_paper_submissions
      WHERE assignment_student_id = ? AND question_id = ?
    `).get(assignment.assignment_student_id, questionId);
    if (assignment.analysis_released_at && existing) return res.status(409).json({ error: '整卷解析已经开放，答案不能再修改' });
    const bank = await loadQuestionBank();
    const definition = bank.get(questionId);
    if (!definition) return res.status(404).json({ error: '题目不存在' });
    const result = await gradeQuestion(questionId, req.body?.answers);
    const timing = db.prepare(`
      SELECT MAX(0, CAST((julianday('now','localtime') - julianday(started_at)) * 86400 AS INTEGER)) AS duration_seconds
      FROM csp_paper_question_attempts
      WHERE assignment_student_id = ? AND question_id = ?
    `).get(assignment.assignment_student_id, questionId);
    const duration = Number.isFinite(timing?.duration_seconds) ? timing.duration_seconds : 0;
    db.exec('BEGIN IMMEDIATE');
    try {
      const current = db.prepare(`
        SELECT * FROM csp_paper_submissions
        WHERE assignment_student_id = ? AND question_id = ?
      `).get(assignment.assignment_student_id, questionId);
      const released = db.prepare('SELECT analysis_released_at FROM csp_paper_assignments WHERE id = ?').get(assignment.id)?.analysis_released_at;
      if (released && current) {
        db.exec('ROLLBACK');
        return res.status(409).json({ error: '整卷解析已经开放，答案不能再修改' });
      }
      let submissionId;
      if (current) {
        db.prepare(`
          UPDATE csp_paper_submissions
          SET answers_json = ?, score = ?, max_score = ?, duration_seconds = ?, submitted_at = datetime('now','localtime')
          WHERE id = ?
        `).run(JSON.stringify(result.answers), result.score, result.maxScore, duration, current.id);
        submissionId = current.id;
      } else {
        const saved = db.prepare(`
          INSERT INTO csp_paper_submissions
            (assignment_student_id, question_id, answers_json, score, max_score, duration_seconds)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(assignment.assignment_student_id, questionId, JSON.stringify(result.answers), result.score, result.maxScore, duration);
        submissionId = Number(saved.lastInsertRowid);
      }
      const record = buildTrainingPracticeRecord(questionId, result, duration);
      if (record) {
        record.answers.source = 'CSP整卷';
        record.answers.paper_assignment_id = assignment.id;
        record.answers.paper_submission_id = submissionId;
        const existingRecord = db.prepare('SELECT id FROM practice_records WHERE paper_submission_id = ?').get(submissionId);
        if (existingRecord) {
          db.prepare(`
            UPDATE practice_records
            SET user_id = ?, level = ?, year = ?, question_type = ?, total_score = ?, max_score = ?,
              answers_json = ?, duration_seconds = ?, created_at = datetime('now','localtime')
            WHERE id = ?
          `).run(req.user.id, record.level, record.year, record.question_type, record.total_score, record.max_score,
            JSON.stringify(record.answers), record.duration_seconds, existingRecord.id);
        } else {
          db.prepare(`
            INSERT INTO practice_records
              (user_id, level, year, question_type, total_score, max_score, answers_json, duration_seconds, paper_submission_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(req.user.id, record.level, record.year, record.question_type, record.total_score, record.max_score,
            JSON.stringify(record.answers), record.duration_seconds, submissionId);
        }
      }
      const questionIds = parseQuestionIds(assignment);
      const submittedCount = db.prepare('SELECT COUNT(*) AS count FROM csp_paper_submissions WHERE assignment_student_id = ?').get(assignment.assignment_student_id).count;
      if (Number(submittedCount) >= questionIds.length) {
        db.prepare(`UPDATE csp_paper_students SET completed_at = COALESCE(completed_at, datetime('now','localtime')) WHERE id = ?`).run(assignment.assignment_student_id);
      }
      db.exec('COMMIT');
      const releasedAfter = Boolean(released);
      res.json({
        submitted: true,
        released: releasedAfter,
        completed: Number(submittedCount) >= questionIds.length,
        ...(releasedAfter ? { score: result.score, maxScore: result.maxScore, parts: result.parts } : {}),
      });
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    if (error.message.includes('题库') || error.message.includes('完成本题')) return res.status(400).json({ error: error.message });
    next(error);
  }
});

module.exports = router;
