const db = require('../db');

// NOIP 专题位于 CSP-J/S 练习模块，沿用该模块的答案锁定。
const CSP_PRACTICE_LEVELS = new Set(['CSP-J', 'CSP-S', 'NOIP']);
const CSP_PRACTICE_LOCK_MESSAGE = '你有一份尚未开放解析的 CSP 整卷测评，完成整卷并等待老师开放解析后，才能提交或查看 CSP-J/S 练习答案与解析。';
const GESP_PRACTICE_LOCK_MESSAGE = '你有一份尚未开放解析的 GESP 整卷测评，完成整卷并等待老师开放解析后，才能提交或查看 GESP 练习答案与解析。';

function isCspPracticeLevel(level) {
  return CSP_PRACTICE_LEVELS.has(String(level || '').trim().toUpperCase());
}

function isGespPracticeLevel(level) {
  return /^GESP(?:-[2-8])?$/i.test(String(level || '').trim());
}

function isCspPracticeQuestionId(questionId) {
  return /^(?:csp-[js]-)?\d{4}-(?:choice|reading|completion)-\d+(?:-|$)/i.test(String(questionId || ''));
}

function isGespPracticeQuestionId(questionId) {
  return /^gesp-cpp[2-8]-20\d{2}-(?:03|06|09|12)-(?:choice|judgment)-\d+$/i.test(String(questionId || ''));
}

function getPendingCspPaper(userId, role = 'student', paperType = 'CSP') {
  if (role !== 'student') return null;
  const type = String(paperType || 'CSP').toUpperCase() === 'GESP' ? 'GESP' : 'CSP';
  return db.prepare(`
    SELECT a.id, a.title, a.level, a.year, a.paper_type AS paperType, a.paper_key AS paperKey, a.deadline
    FROM csp_paper_students ps
    JOIN csp_paper_assignments a ON a.id = ps.assignment_id
    WHERE ps.student_id = ?
      AND COALESCE(a.paper_type, 'CSP') = ?
      AND a.analysis_released_at IS NULL
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT 1
  `).get(userId, type) || null;
}

function questionMatchesLevel(questionId, level) {
  const value = String(questionId || '').trim();
  const normalized = String(level || '').trim().toUpperCase();
  if (normalized === 'NOIP') return /^noip-\d{4}-(?:reading|completion)-\d+(?:-|$)/i.test(value);
  if (normalized === 'CSP-J') return /^(?:csp-j-)?\d{4}-(?:choice|reading|completion)-\d+(?:-|$)/i.test(value);
  if (normalized === 'CSP-S') return /^csp-s-\d{4}-(?:choice|reading|completion)-\d+(?:-|$)/i.test(value);
  if (normalized === 'GESP') return /^gesp-cpp[2-8]-20\d{2}-(?:03|06|09|12)-(?:choice|judgment)-\d+(?:-|$)$/i.test(value);
  const gesp = /^GESP-([2-8])$/i.exec(normalized);
  return gesp ? new RegExp(`^gesp-cpp${gesp[1]}-20\\d{2}-(?:03|06|09|12)-(?:choice|judgment)-\\d+(?:-|$)$`, 'i').test(value) : false;
}

function getPendingHomeworkQuestions(userId, level, role = 'student') {
  if (role !== 'student') return { questionIds: [], assignments: [] };
  const rows = db.prepare(`
    SELECT a.id, a.title, a.deadline, a.lock_practice AS lockPractice, a.question_ids_json
    FROM homework_assignments a
    JOIN homework_students hs ON hs.assignment_id = a.id
    WHERE hs.student_id = ? AND a.lock_practice = 1 AND a.analysis_released_at IS NULL
    ORDER BY a.created_at DESC, a.id DESC
  `).all(userId);
  const assignments = [];
  const questionIds = new Set();
  for (const row of rows) {
    let ids = [];
    try { ids = JSON.parse(row.question_ids_json || '[]'); } catch { ids = []; }
    ids = [...new Set(ids.map(id => String(id || '').trim()).filter(id => questionMatchesLevel(id, level)))];
    if (!ids.length) continue;
    ids.forEach(id => questionIds.add(id));
    assignments.push({ id: row.id, title: row.title, deadline: row.deadline || '', questionIds: ids });
  }
  return { questionIds: [...questionIds], assignments };
}

function parentQuestionId(questionId, pendingIds) {
  let value = String(questionId || '').trim();
  if (pendingIds.has(value)) return value;
  while (/-\d+$/.test(value)) {
    value = value.replace(/-\d+$/, '');
    if (pendingIds.has(value)) return value;
  }
  return null;
}

function intersectHomeworkQuestions(answers, pendingQuestionIds) {
  const pending = new Set(pendingQuestionIds || []);
  const questions = Array.isArray(answers?.questions) ? answers.questions : [];
  return [...new Set(questions.map(item => parentQuestionId(item?.id, pending)).filter(Boolean))];
}

function homeworkLockPayload(homework, questionIds) {
  const ids = [...new Set(questionIds || [])];
  return {
    locked: false,
    questionIds: ids,
    homeworkAssignments: homework?.assignments || [],
    code: 'HOMEWORK_QUESTION_LOCKED',
    message: '这些题目已布置在未开放解析的作业中，请先完成作业后再查看练习答案与解析。',
  };
}

function lockPayload(assignment) {
  if (!assignment) return { locked: false };
  const message = String(assignment.paperType || '').toUpperCase() === 'GESP'
    ? GESP_PRACTICE_LOCK_MESSAGE
    : CSP_PRACTICE_LOCK_MESSAGE;
  return {
    locked: true,
    code: 'CSP_PAPER_ANALYSIS_LOCKED',
    error: message,
    message,
    assignment,
  };
}

module.exports = {
  CSP_PRACTICE_LOCK_MESSAGE,
  isCspPracticeLevel,
  isGespPracticeLevel,
  isCspPracticeQuestionId,
  isGespPracticeQuestionId,
  getPendingCspPaper,
  questionMatchesLevel,
  getPendingHomeworkQuestions,
  parentQuestionId,
  intersectHomeworkQuestions,
  lockPayload,
  homeworkLockPayload,
};
