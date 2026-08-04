const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { loadQuestionBank } = require('../training/questionBank');

const router = express.Router();

function normalizeSelected(value) {
  const selected = Array.isArray(value) ? value : [value];
  return [...new Set(selected.map(item => String(item || '').trim()).filter(Boolean))].sort();
}

function sameAnswers(left, right) {
  const a = normalizeSelected(left);
  const b = normalizeSelected(right);
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function levelCode(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'CSP-J') return 'J';
  if (normalized === 'CSP-S') return 'S';
  const gesp = normalized.match(/^GESP-([1-8])$/);
  return gesp ? `GESP-${gesp[1]}` : '';
}

function trainingLevelCode(questionId) {
  if (/^csp-s-\d{4}-/i.test(String(questionId || ''))) return 'S';
  const match = /^gesp-cpp([2-8])-/i.exec(String(questionId || ''));
  return match ? `GESP-${match[1]}` : 'J';
}

function canonicalQuestionId(value) {
  const rawId = String(value || '').trim();
  const cspS = /^csp-s-(\d{4}-(?:choice|reading|completion)-\d+(?:-\d+)?)$/i.exec(rawId);
  return cspS ? cspS[1] : rawId;
}

function practiceQuestionKey(record, question, index) {
  const level = levelCode(record.level);
  const rawId = canonicalQuestionId(question.id);
  const baseId = /^\d{4}-(choice|reading|completion)-\d+/.test(rawId) || /^gesp-/i.test(rawId)
    ? rawId
    : `${record.year}-${record.question_type}-${question.number || rawId || index + 1}`;
  return `${level}:${baseId}`;
}

function getStudents(user, className) {
  let teacherId = null;
  if (user.role === 'student') {
    teacherId = db.prepare("SELECT created_by FROM users WHERE id = ? AND role = 'student'").get(user.id)?.created_by;
  } else if (!user.is_admin) {
    teacherId = user.id;
  }

  const params = [];
  let sql = "SELECT id, name, username, class_name, created_by FROM users WHERE role = 'student'";
  if (teacherId) {
    sql += ' AND created_by = ?';
    params.push(teacherId);
  } else if (user.role === 'student') {
    sql += ' AND id = ?';
    params.push(user.id);
  }
  const allStudents = db.prepare(`${sql} ORDER BY class_name, name`).all(...params);
  const classes = [...new Set(allStudents.map(item => item.class_name).filter(Boolean))];
  const students = user.role === 'teacher' && className
    ? allStudents.filter(item => item.class_name === className)
    : allStudents;
  return { students, classes, teacherId };
}

function getTrainingRange(user, teacherId) {
  let rows;
  if (user.is_admin) {
    rows = db.prepare('SELECT content_json FROM training_courses WHERE active = 1').all();
  } else if (teacherId) {
    rows = db.prepare(
      'SELECT content_json FROM training_courses WHERE teacher_id = ? AND active = 1'
    ).all(teacherId);
  } else {
    rows = [];
  }
  const dates = rows.flatMap(row => {
    try {
      return (JSON.parse(row.content_json).days || []).map(day => day.date).filter(Boolean);
    } catch {
      return [];
    }
  }).sort();
  return dates.length ? { start: dates[0], end: dates[dates.length - 1] } : null;
}

function inPeriod(createdAt, period, today, trainingRange) {
  const date = String(createdAt || '').slice(0, 10);
  if (period === 'today') return date === today;
  if (period === 'training') {
    return Boolean(trainingRange && date >= trainingRange.start && date <= trainingRange.end);
  }
  return true;
}

function addRanks(rows) {
  const practice = rows.filter(item => item.solvedCount > 0).sort(
    (a, b) => b.solvedCount - a.solvedCount
      || b.correctCount - a.correctCount
      || a.name.localeCompare(b.name, 'zh-CN')
  );
  practice.forEach((item, index) => {
    const previous = practice[index - 1];
    item.practiceRank = previous
      && previous.solvedCount === item.solvedCount
      && previous.correctCount === item.correctCount
      ? previous.practiceRank
      : index + 1;
  });

  const accuracy = rows.filter(item => item.eligible).sort(
    (a, b) => b.accuracyPercent - a.accuracyPercent
      || b.accuracyAnswered - a.accuracyAnswered
      || a.name.localeCompare(b.name, 'zh-CN')
  );
  accuracy.forEach((item, index) => {
    const previous = accuracy[index - 1];
    item.accuracyRank = previous
      && previous.accuracyPercent === item.accuracyPercent
      && previous.accuracyAnswered === item.accuracyAnswered
      ? previous.accuracyRank
      : index + 1;
  });
}

router.get('/', auth, async (req, res, next) => {
  const requestedLevel = String(req.query.level || '').toUpperCase();
  const level = ['J', 'S'].includes(requestedLevel) || /^GESP-[1-8]$/.test(requestedLevel)
    ? requestedLevel
    : 'all';
  const period = ['today', 'training'].includes(String(req.query.period || ''))
    ? String(req.query.period)
    : 'all';
  const className = String(req.query.class_name || '').trim().slice(0, 100);
  const { students, classes, teacherId } = getStudents(req.user, className);
  const trainingRange = getTrainingRange(req.user, teacherId);
  const today = db.prepare("SELECT date('now','localtime') AS value").get().value;
  const threshold = period === 'today' ? 5 : 10;

  if (!students.length) {
    return res.json({ rows: [], classes, threshold, trainingRange, level, period });
  }

  try {
    const ids = students.map(item => item.id);
    const placeholders = ids.map(() => '?').join(',');
    const events = [];
    const practiceRows = db.prepare(`
      SELECT id, user_id, level, year, question_type, answers_json, duration_seconds, created_at
      FROM practice_records
      WHERE user_id IN (${placeholders})
      ORDER BY created_at, id
    `).all(...ids);
    for (const record of practiceRows) {
      const recordLevel = levelCode(record.level);
      if (!recordLevel) continue;
      if (level !== 'all' && recordLevel !== level) continue;
      let questions;
      try {
        questions = JSON.parse(record.answers_json).questions;
      } catch {
        continue;
      }
      if (!Array.isArray(questions)) continue;
      questions.forEach((question, index) => {
        events.push({
          studentId: record.user_id,
          key: practiceQuestionKey(record, question, index),
          level: recordLevel,
          correct: question.correct === true,
          visible: true,
          createdAt: record.created_at,
          order: `1:${record.id}:${index}`,
        });
      });
    }

    if (level === 'all' || level === 'J' || level === 'S' || /^GESP-[1-8]$/.test(level)) {
      const bank = await loadQuestionBank();
      const submissions = db.prepare(`
        SELECT s.id, s.question_id, s.answers_json, s.duration_seconds, s.submitted_at,
          a.student_id, a.course_id, a.day_number,
          CASE WHEN r.id IS NULL THEN 0 ELSE 1 END AS released
        FROM training_question_submissions s
        JOIN training_day_assignments a ON a.id = s.assignment_id
        LEFT JOIN training_question_releases r
          ON r.course_id = a.course_id
          AND r.day_number = a.day_number
          AND r.question_id = s.question_id
        WHERE a.student_id IN (${placeholders})
        ORDER BY s.submitted_at, s.id
      `).all(...ids);
      for (const submission of submissions) {
        const definition = bank.get(submission.question_id);
        if (!definition) continue;
        const questionType = submission.question_id.includes('-reading-')
          ? 'reading'
          : submission.question_id.includes('-completion-') ? 'completion' : 'choice';
        let answers;
        try {
          answers = JSON.parse(submission.answers_json);
        } catch {
          continue;
        }
        const submissionLevel = trainingLevelCode(submission.question_id);
        if (level !== 'all' && submissionLevel !== level) continue;
        definition.parts.forEach((part, index) => {
          events.push({
            studentId: submission.student_id,
            key: `${submissionLevel}:${canonicalQuestionId(part.id)}`,
            level: submissionLevel,
            correct: sameAnswers(answers[part.id], part.answers),
            visible: req.user.role === 'teacher' || Boolean(submission.released),
            createdAt: submission.submitted_at,
            order: `0:${submission.id}:${index}`,
          });
        });
      }
    }

    events.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.order.localeCompare(b.order));
    const firstAttempts = new Map(students.map(student => [student.id, new Map()]));
    for (const event of events) {
      const studentAttempts = firstAttempts.get(event.studentId);
      if (studentAttempts && !studentAttempts.has(event.key)) studentAttempts.set(event.key, event);
    }

    const rows = students.map(student => {
      const attempts = [...firstAttempts.get(student.id).values()].filter(
        event => (level === 'all' || event.level === level)
          && inPeriod(event.createdAt, period, today, trainingRange)
      );
      const visible = attempts.filter(event => event.visible);
      const correctCount = visible.filter(event => event.correct).length;
      const accuracyAnswered = visible.length;
      const accuracyPercent = accuracyAnswered
        ? Math.round(correctCount * 10000 / accuracyAnswered) / 100
        : null;
      return {
        id: student.id,
        name: student.name,
        username: student.username,
        className: student.class_name || '',
        isCurrentUser: student.id === req.user.id,
        solvedCount: attempts.length,
        correctCount,
        accuracyAnswered,
        accuracyPercent,
        eligible: accuracyAnswered >= threshold,
        practiceRank: null,
        accuracyRank: null,
      };
    });
    addRanks(rows);
    rows.sort((a, b) => (a.practiceRank || Number.MAX_SAFE_INTEGER)
      - (b.practiceRank || Number.MAX_SAFE_INTEGER)
      || a.name.localeCompare(b.name, 'zh-CN'));

    res.json({ rows, classes, threshold, trainingRange, level, period });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
