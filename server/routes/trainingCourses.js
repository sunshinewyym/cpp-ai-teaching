const express = require('express');
const db = require('../db');
const { auth, requireTeacher, requireAdmin } = require('../middleware/auth');
const { cloneTrainingCourseTemplate } = require('../training/trainingCourseTemplate');
const { cloneTrainingCourseProgressTemplate } = require('../training/trainingCourseProgressTemplate');
const { gradeQuestion } = require('../training/questionBank');
const { buildTrainingPracticeRecord } = require('../training/trainingRecord');
const { isLeaderboardDurationValid } = require('../leaderboardRules');

const router = express.Router();

function cleanText(value, maxLength = 2000) {
  return String(value || '').trim().slice(0, maxLength);
}

function cleanList(value, pattern, maxItems = 50) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => String(item).trim()).filter(item => pattern.test(item)))].slice(0, maxItems);
}

function cleanSession(value) {
  const session = value && typeof value === 'object' ? value : {};
  return {
    theme: cleanText(session.theme, 100),
    timing: cleanText(session.timing, 500),
    goals: cleanText(session.goals),
    knowledge: cleanText(session.knowledge),
    practice: cleanText(session.practice, 1200),
    notes: cleanText(session.notes),
  };
}

const choiceQuestionPattern = /^(?:\d{4}-choice-\d+|gesp-cpp[2-8]-\d{4}-\d{2}-(?:choice|judgment)-\d+|csp-s-\d{4}-choice-\d+)$/i;
const readingQuestionPattern = /^(?:\d{4}-reading-\d+|csp-s-\d{4}-reading-\d+)$/i;
const completionQuestionPattern = /^(?:\d{4}-completion-\d+|csp-s-\d{4}-completion-\d+)$/i;

function normalizeCourse(body) {
  const title = cleanText(body?.title, 100);
  const sourceDays = Array.isArray(body?.days) ? body.days : [];
  if (!title) throw new Error('课程名称不能为空');
  if (sourceDays.length < 1 || sourceDays.length > 20) throw new Error('课程天数必须在 1—20 天之间');

  const days = sourceDays.map((item, index) => {
    const questions = item?.questions && typeof item.questions === 'object' ? item.questions : {};
    const programming = item?.programming && typeof item.programming === 'object' ? item.programming : {};
    return {
      day: Number.isInteger(Number(item?.day)) && Number(item.day) > 0 ? Number(item.day) : index + 1,
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(item?.date || '')) ? String(item.date) : '',
      morning: cleanSession(item?.morning),
      questions: {
        choice: cleanList(questions.choice, choiceQuestionPattern),
        reading: cleanList(questions.reading, readingQuestionPattern),
        completion: cleanList(questions.completion, completionQuestionPattern),
      },
      afternoon: cleanSession(item?.afternoon),
      programming: {
        basic: cleanList(programming.basic, /^P\d{4,6}$/i).map(id => id.toUpperCase()),
        advanced: cleanList(programming.advanced, /^P\d{4,6}$/i).map(id => id.toUpperCase()),
        luoguBasic: cleanList(programming.luoguBasic, /^P\d{4,6}$/i).map(id => id.toUpperCase()),
        luoguAdvanced: cleanList(programming.luoguAdvanced, /^P\d{4,6}$/i).map(id => id.toUpperCase()),
      },
    };
  });
  if (new Set(days.map(item => item.day)).size !== days.length) {
    throw new Error('课程日期编号不能重复');
  }

  return {
    title,
    summary: cleanText(body?.summary, 1000),
    days,
  };
}

function parseContent(row) {
  return JSON.parse(row.content_json);
}

// Reapplying a template must not erase questions that already have submissions.
// Keep the submitted question ids in their original day; unsubmitted custom
// additions are intentionally replaced by the selected template.
function mergeSubmittedQuestions(template, existingRow) {
  const current = parseContent(existingRow);
  const submitted = db.prepare(`
    SELECT a.day_number, s.question_id
    FROM training_question_submissions s
    JOIN training_day_assignments a ON a.id = s.assignment_id
    WHERE a.course_id = ?
    GROUP BY a.day_number, s.question_id
  `).all(existingRow.id);
  const sourceDays = new Map((current.days || []).map(day => [Number(day.day), day]));
  const targetDays = new Map((template.days || []).map(day => [Number(day.day), day]));

  for (const item of submitted) {
    const dayNumber = Number(item.day_number);
    const sourceDay = sourceDays.get(dayNumber);
    let targetDay = targetDays.get(dayNumber);
    if (!sourceDay) continue;
    if (!targetDay) {
      targetDay = JSON.parse(JSON.stringify(sourceDay));
      template.days.push(targetDay);
      targetDays.set(dayNumber, targetDay);
    }
    for (const type of ['choice', 'reading', 'completion']) {
      const targetIds = targetDay.questions[type] || (targetDay.questions[type] = []);
      for (const questionId of sourceDay.questions?.[type] || []) {
        if (submitted.some(answer => Number(answer.day_number) === dayNumber && answer.question_id === questionId)
          && !targetIds.includes(questionId)) {
          targetIds.push(questionId);
        }
      }
    }
  }
  return template;
}

function rowToCourse(row) {
  const content = parseContent(row);
  return {
    id: row.id,
    variant: row.variant || 'advanced',
    title: row.title,
    summary: content.summary || '',
    days: content.days || [],
    assigned_at: row.assigned_at,
    updated_at: row.updated_at,
  };
}

function getTeacherCourse(teacherId) {
  return db.prepare('SELECT * FROM training_courses WHERE teacher_id = ? AND active = 1').get(teacherId);
}

function getCourseDay(row, dayNumber) {
  const day = parseContent(row).days?.find(item => Number(item.day) === Number(dayNumber));
  if (!day) throw new Error('课程中没有这一天');
  return day;
}

function dayQuestionIds(day) {
  return ['choice', 'reading', 'completion'].flatMap(type => day.questions?.[type] || []);
}

function publicSession(session) {
  return {
    theme: session?.theme || '',
    goals: session?.goals || '',
    knowledge: session?.knowledge || '',
    practice: session?.practice || '',
  };
}

function getStudentQuestionAssignment(studentId, courseId, dayNumber, questionId) {
  const assignment = db.prepare(`
    SELECT a.*, c.content_json
    FROM training_day_assignments a
    JOIN training_courses c ON c.id = a.course_id
    WHERE a.student_id = ? AND a.course_id = ? AND a.day_number = ? AND c.active = 1
  `).get(studentId, Number(courseId), Number(dayNumber));
  if (!assignment) return null;
  const day = parseContent(assignment).days?.find(
    item => Number(item.day) === Number(assignment.day_number)
  );
  return day && dayQuestionIds(day).includes(questionId) ? assignment : null;
}

function teacherOwnsStudent(user, studentId) {
  const sql = user.is_admin
    ? "SELECT id FROM users WHERE id = ? AND role = 'student'"
    : "SELECT id FROM users WHERE id = ? AND role = 'student' AND created_by = ?";
  return user.is_admin
    ? db.prepare(sql).get(studentId)
    : db.prepare(sql).get(studentId, user.id);
}

function assignmentOverview(course, day) {
  const students = db.prepare(`
    SELECT a.id AS assignment_id, u.id, u.name, u.username, u.class_name
    FROM training_day_assignments a
    JOIN users u ON u.id = a.student_id
    WHERE a.course_id = ? AND a.day_number = ?
    ORDER BY u.class_name, u.name
  `).all(course.id, day.day);
  const submissions = db.prepare(`
    SELECT s.question_id, s.assignment_id, s.answers_json, s.score, s.max_score, s.submitted_at,
      a.student_id, u.name, u.username, u.class_name
    FROM training_question_submissions s
    JOIN training_day_assignments a ON a.id = s.assignment_id
    JOIN users u ON u.id = a.student_id
    WHERE a.course_id = ? AND a.day_number = ?
  `).all(course.id, day.day);
  const releases = new Map(db.prepare(`
    SELECT question_id, released_at
    FROM training_question_releases
    WHERE course_id = ? AND day_number = ?
  `).all(course.id, day.day).map(item => [item.question_id, item.released_at]));

  const byQuestion = new Map();
  for (const item of submissions) {
    if (!byQuestion.has(item.question_id)) byQuestion.set(item.question_id, []);
    byQuestion.get(item.question_id).push(item);
  }

  return {
    students,
    questions: dayQuestionIds(day).map(questionId => {
      const submitted = byQuestion.get(questionId) || [];
      const submittedIds = new Set(submitted.map(item => item.assignment_id));
      const maxTotal = submitted.reduce((sum, item) => sum + Number(item.max_score), 0);
      const scoreTotal = submitted.reduce((sum, item) => sum + Number(item.score), 0);
      const submittedByStudent = new Map(submitted.map(item => [item.student_id, item]));
      return {
        questionId,
        submitted: submitted.length,
        total: students.length,
        released: releases.has(questionId),
        releasedAt: releases.get(questionId) || null,
        averagePercent: maxTotal ? Math.round(scoreTotal * 100 / maxTotal) : null,
        details: students.map(student => {
          const submission = submittedByStudent.get(student.id);
          let answers = null;
          if (submission) {
            try {
              answers = JSON.parse(submission.answers_json);
            } catch {
              answers = null;
            }
          }
          return {
            studentId: student.id,
            name: student.name,
            username: student.username,
            className: student.class_name || '',
            submitted: Boolean(submission),
            score: submission ? Number(submission.score) : null,
            maxScore: submission ? Number(submission.max_score) : null,
            correct: submission ? Number(submission.score) === Number(submission.max_score) : null,
            submittedAt: submission?.submitted_at || null,
            answers,
          };
        }),
        missingStudents: students
          .filter(item => !submittedIds.has(item.assignment_id))
          .map(item => ({ id: item.id, name: item.name })),
      };
    }),
  };
}

router.get('/access', auth, requireTeacher, (req, res) => {
  const course = db.prepare('SELECT id, variant, title FROM training_courses WHERE teacher_id = ? AND active = 1').get(req.user.id);
  res.json({
    hasAccess: Boolean(course),
    variant: course?.variant || null,
    title: course?.title || null,
  });
});

router.get('/me', auth, requireTeacher, (req, res) => {
  const row = db.prepare('SELECT * FROM training_courses WHERE teacher_id = ? AND active = 1').get(req.user.id);
  if (!row) return res.status(404).json({ error: '管理员尚未给当前账号分配集训课程' });
  try {
    res.json(rowToCourse(row));
  } catch {
    res.status(500).json({ error: '课程内容读取失败，请联系管理员' });
  }
});

router.put('/me', auth, requireTeacher, (req, res) => {
  const existing = getTeacherCourse(req.user.id);
  if (!existing) return res.status(403).json({ error: '当前账号没有集训课程权限' });

  let course;
  try {
    course = normalizeCourse(req.body);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const submitted = db.prepare(`
    SELECT a.day_number, s.question_id
    FROM training_question_submissions s
    JOIN training_day_assignments a ON a.id = s.assignment_id
    WHERE a.course_id = ?
    GROUP BY a.day_number, s.question_id
  `).all(existing.id);
  for (const item of submitted) {
    const day = course.days.find(candidate => Number(candidate.day) === Number(item.day_number));
    if (!day || !dayQuestionIds(day).includes(item.question_id)) {
      return res.status(409).json({ error: `题目 ${item.question_id} 已有学生作答，不能删除` });
    }
  }

  db.prepare(`
    UPDATE training_courses
    SET title = ?, content_json = ?, updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(course.title, JSON.stringify({ summary: course.summary, days: course.days }), existing.id);

  const row = db.prepare('SELECT * FROM training_courses WHERE id = ?').get(existing.id);
  res.json(rowToCourse(row));
});

router.get('/days/:day/assignments', auth, requireTeacher, (req, res) => {
  const course = getTeacherCourse(req.user.id);
  if (!course) return res.status(403).json({ error: '当前账号没有集训课程权限' });
  try {
    const day = getCourseDay(course, req.params.day);
    res.json(assignmentOverview(course, day));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/days/:day/assignments', auth, requireTeacher, (req, res) => {
  const course = getTeacherCourse(req.user.id);
  if (!course) return res.status(403).json({ error: '当前账号没有集训课程权限' });

  let day;
  try {
    day = getCourseDay(course, req.params.day);
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }

  const studentIds = [...new Set((Array.isArray(req.body?.studentIds) ? req.body.studentIds : [])
    .map(Number)
    .filter(Number.isInteger))].slice(0, 200);
  for (const studentId of studentIds) {
    if (!teacherOwnsStudent(req.user, studentId)) {
      return res.status(403).json({ error: '学生不存在或不属于当前教师' });
    }
  }

  const current = db.prepare(`
    SELECT id, student_id
    FROM training_day_assignments
    WHERE course_id = ? AND day_number = ?
  `).all(course.id, day.day);
  const currentIds = new Set(current.map(item => item.student_id));
  const requestedIds = new Set(studentIds);
  const additions = studentIds.filter(id => !currentIds.has(id));
  const removals = current.filter(item => !requestedIds.has(item.student_id));

  if (additions.length) {
    const released = db.prepare(`
      SELECT 1 FROM training_question_releases
      WHERE course_id = ? AND day_number = ?
      LIMIT 1
    `).get(course.id, day.day);
    if (released) {
      return res.status(409).json({ error: '本日已有题目开放解析，不能再新增学生' });
    }
  }

  for (const assignment of removals) {
    const answered = db.prepare(
      'SELECT 1 FROM training_question_submissions WHERE assignment_id = ? LIMIT 1'
    ).get(assignment.id);
    if (answered) {
      return res.status(409).json({ error: '已有学生开始作答，不能取消其课程' });
    }
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO training_day_assignments
        (course_id, teacher_id, day_number, student_id)
      VALUES (?, ?, ?, ?)
    `);
    for (const studentId of additions) insert.run(course.id, req.user.id, day.day, studentId);
    const remove = db.prepare('DELETE FROM training_day_assignments WHERE id = ?');
    for (const assignment of removals) remove.run(assignment.id);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  res.json(assignmentOverview(course, day));
});

router.post('/days/:day/questions/:questionId/release', auth, requireTeacher, (req, res) => {
  const course = getTeacherCourse(req.user.id);
  if (!course) return res.status(403).json({ error: '当前账号没有集训课程权限' });

  let day;
  try {
    day = getCourseDay(course, req.params.day);
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
  const questionId = String(req.params.questionId || '');
  if (!dayQuestionIds(day).includes(questionId)) {
    return res.status(404).json({ error: '本日课程中没有这道题' });
  }

  const total = db.prepare(`
    SELECT COUNT(*) AS count
    FROM training_day_assignments
    WHERE course_id = ? AND day_number = ?
  `).get(course.id, day.day).count;
  const submitted = db.prepare(`
    SELECT COUNT(*) AS count
    FROM training_question_submissions s
    JOIN training_day_assignments a ON a.id = s.assignment_id
    WHERE a.course_id = ? AND a.day_number = ? AND s.question_id = ?
  `).get(course.id, day.day, questionId).count;
  if (!total) return res.status(400).json({ error: '请先把本日课程布置给学生' });
  if (submitted < total) {
    return res.status(409).json({ error: `还有 ${total - submitted} 名学生未提交，暂不能开放解析` });
  }

  db.prepare(`
    INSERT OR IGNORE INTO training_question_releases
      (course_id, day_number, question_id, released_by)
    VALUES (?, ?, ?, ?)
  `).run(course.id, day.day, questionId, req.user.id);
  res.json({ message: '本题答案与解析已开放' });
});

router.get('/student/access', auth, (req, res) => {
  if (req.user.role !== 'student') return res.json({ hasAccess: false });
  const assignment = db.prepare(`
    SELECT 1
    FROM training_day_assignments a
    JOIN training_courses c ON c.id = a.course_id
    WHERE a.student_id = ? AND c.active = 1
    LIMIT 1
  `).get(req.user.id);
  res.json({ hasAccess: Boolean(assignment) });
});

router.get('/student', auth, (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: '需要学生账号' });
  const rows = db.prepare(`
    SELECT DISTINCT c.*, u.name AS teacher_name
    FROM training_courses c
    JOIN training_day_assignments a ON a.course_id = c.id
    JOIN users u ON u.id = c.teacher_id
    WHERE a.student_id = ? AND c.active = 1
    ORDER BY c.assigned_at
  `).all(req.user.id);

  const courses = rows.map(row => {
    const content = parseContent(row);
    const assigned = db.prepare(`
      SELECT id, day_number
      FROM training_day_assignments
      WHERE course_id = ? AND student_id = ?
      ORDER BY day_number
    `).all(row.id, req.user.id);
    const assignmentByDay = new Map(assigned.map(item => [item.day_number, item]));
    const releases = new Map(db.prepare(`
      SELECT day_number, question_id, released_at
      FROM training_question_releases
      WHERE course_id = ?
    `).all(row.id).map(item => [`${item.day_number}:${item.question_id}`, item.released_at]));

    return {
      id: row.id,
      title: row.title,
      variant: row.variant || 'advanced',
      summary: content.summary || '',
      teacherName: row.teacher_name,
      days: (content.days || []).filter(day => assignmentByDay.has(Number(day.day))).map(day => {
        const assignment = assignmentByDay.get(Number(day.day));
        const submissions = new Map(db.prepare(`
          SELECT question_id, answers_json, score, max_score, submitted_at
          FROM training_question_submissions
          WHERE assignment_id = ?
        `).all(assignment.id).map(item => [item.question_id, item]));
        const states = {};
        for (const questionId of dayQuestionIds(day)) {
          const submission = submissions.get(questionId);
          const releasedAt = releases.get(`${day.day}:${questionId}`);
          states[questionId] = {
            submitted: Boolean(submission),
            submittedAt: submission?.submitted_at || null,
            answers: submission ? JSON.parse(submission.answers_json) : null,
            released: Boolean(releasedAt),
            releasedAt: releasedAt || null,
            ...(releasedAt && submission ? {
              score: submission.score,
              maxScore: submission.max_score,
            } : {}),
          };
        }
        return {
          day: day.day,
          date: day.date,
          morning: publicSession(day.morning),
          afternoon: publicSession(day.afternoon),
          questions: day.questions,
          programming: day.programming,
          states,
        };
      }),
    };
  });
  res.json({ courses });
});

router.post('/student/courses/:courseId/days/:day/questions/:questionId/start', auth, (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: '需要学生账号' });
  const questionId = String(req.params.questionId || '');
  const assignment = getStudentQuestionAssignment(
    req.user.id,
    req.params.courseId,
    req.params.day,
    questionId
  );
  if (!assignment) return res.status(404).json({ error: '这道题尚未布置给你' });

  db.prepare(`
    INSERT OR IGNORE INTO training_question_attempts (assignment_id, question_id)
    VALUES (?, ?)
  `).run(assignment.id, questionId);
  res.json({ started: true });
});

router.post('/student/courses/:courseId/days/:day/questions/:questionId/submit', auth, async (req, res, next) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: '需要学生账号' });
  const questionId = String(req.params.questionId || '');
  const assignment = getStudentQuestionAssignment(
    req.user.id,
    req.params.courseId,
    req.params.day,
    questionId
  );
  if (!assignment) return res.status(404).json({ error: '这道题尚未布置给你' });
  const existing = db.prepare(`
    SELECT id FROM training_question_submissions
    WHERE assignment_id = ? AND question_id = ?
  `).get(assignment.id, questionId);
  if (existing) return res.status(409).json({ error: '本题已经提交，不能重复修改' });
  const released = db.prepare(`
    SELECT 1 FROM training_question_releases
    WHERE course_id = ? AND day_number = ? AND question_id = ?
  `).get(assignment.course_id, assignment.day_number, questionId);
  if (released) return res.status(409).json({ error: '本题解析已经开放，不能再提交' });

  try {
    const result = await gradeQuestion(questionId, req.body?.answers);
    const timing = db.prepare(`
      SELECT MAX(0, CAST((julianday('now','localtime') - julianday(started_at)) * 86400 AS INTEGER))
        AS duration_seconds
      FROM training_question_attempts
      WHERE assignment_id = ? AND question_id = ?
    `).get(assignment.id, questionId);
    const duration = Number.isFinite(timing?.duration_seconds) ? timing.duration_seconds : 0;
    const record = buildTrainingPracticeRecord(questionId, result, duration);
    const questionType = record?.question_type || (questionId.includes('-reading-')
      ? 'reading'
      : questionId.includes('-completion-') ? 'completion' : 'choice');
    const itemCount = result.parts.length;

    db.exec('BEGIN IMMEDIATE');
    try {
      const savedSubmission = db.prepare(`
      INSERT INTO training_question_submissions
        (assignment_id, question_id, answers_json, score, max_score, duration_seconds)
      VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        assignment.id,
        questionId,
        JSON.stringify(result.answers),
        result.score,
        result.maxScore,
        duration
      );
      let recordId = null;
      if (record) {
        record.training_submission_id = Number(savedSubmission.lastInsertRowid);
        const savedRecord = db.prepare(`
          INSERT INTO practice_records
            (user_id, level, year, question_type, total_score, max_score, answers_json, duration_seconds, training_submission_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          req.user.id,
          record.level,
          record.year,
          record.question_type,
          record.total_score,
          record.max_score,
          JSON.stringify(record.answers),
          record.duration_seconds,
          record.training_submission_id
        );
        recordId = Number(savedRecord.lastInsertRowid);
      }
      db.exec('COMMIT');
      res.json({
        message: '本题已提交，请等待教师开放答案解析',
        submitted: true,
        recordId,
        leaderboardEligible: isLeaderboardDurationValid(questionType, itemCount, duration),
      });
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    if (error.message.includes('题库') || error.message.includes('完成本题')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/assign/:teacherId', auth, requireAdmin, (req, res) => {
  const teacherId = Number(req.params.teacherId);
  const teacher = db.prepare(
    "SELECT id, name FROM users WHERE id = ? AND role = 'teacher' AND is_admin = 0"
  ).get(teacherId);
  if (!teacher) return res.status(404).json({ error: '教师账号不存在' });

  const variant = req.body?.variant === 'progress' ? 'progress' : 'advanced';
  const template = variant === 'progress'
    ? cloneTrainingCourseProgressTemplate()
    : cloneTrainingCourseTemplate();
  const existing = db.prepare(
    'SELECT id, variant, content_json FROM training_courses WHERE teacher_id = ?'
  ).get(teacherId);

  if (existing && (existing.variant || 'advanced') !== variant) {
    const submitted = db.prepare(`
      SELECT COUNT(*) AS count
      FROM training_question_submissions s
      JOIN training_day_assignments a ON a.id = s.assignment_id
      WHERE a.course_id = ?
    `).get(existing.id).count;
    if (Number(submitted) > 0) {
      return res.status(409).json({ error: '该教师的课程已有学生作答，暂不能切换课程版本' });
    }
    db.prepare(`
      UPDATE training_courses
      SET title = ?, content_json = ?, variant = ?, active = 1,
          assigned_by = ?, assigned_at = datetime('now','localtime'),
          updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(
      template.title,
      JSON.stringify({ summary: template.summary, days: template.days }),
      variant,
      req.user.id,
      existing.id
    );
  } else if (existing) {
    const refreshedTemplate = mergeSubmittedQuestions(template, existing);
    db.prepare(`
      UPDATE training_courses
      SET title = ?, content_json = ?, active = 1,
          assigned_by = ?, assigned_at = datetime('now','localtime'),
          updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(
      refreshedTemplate.title,
      JSON.stringify({ summary: refreshedTemplate.summary, days: refreshedTemplate.days }),
      req.user.id,
      existing.id
    );
  } else {
    db.prepare(`
      INSERT INTO training_courses (teacher_id, title, content_json, variant, active, assigned_by)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(
      teacherId,
      template.title,
      JSON.stringify({ summary: template.summary, days: template.days }),
      variant,
      req.user.id
    );
  }

  const label = variant === 'progress' ? '进阶组' : '高阶组';
  res.json({ message: `已给 ${teacher.name} 分配${label}集训课程`, variant });
});

router.delete('/assign/:teacherId', auth, requireAdmin, (req, res) => {
  const teacherId = Number(req.params.teacherId);
  const result = db.prepare(`
    UPDATE training_courses
    SET active = 0, updated_at = datetime('now','localtime')
    WHERE teacher_id = ? AND active = 1
  `).run(teacherId);
  if (Number(result.changes) === 0) return res.status(404).json({ error: '该教师当前没有集训课程' });
  res.json({ message: '已取消分配，教师修改的课程内容仍然保留' });
});

module.exports = router;
