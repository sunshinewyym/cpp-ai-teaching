const db = require('../db');

const CSP_PRACTICE_LEVELS = new Set(['CSP-J', 'CSP-S']);
const CSP_PRACTICE_LOCK_MESSAGE = '你有一份尚未开放解析的 CSP 整卷测评，完成整卷并等待老师开放解析后，才能提交或查看 CSP-J/S 练习答案与解析。';

function isCspPracticeLevel(level) {
  return CSP_PRACTICE_LEVELS.has(String(level || '').trim().toUpperCase());
}

function isCspPracticeQuestionId(questionId) {
  return /^(?:csp-[js]-)?\d{4}-(?:choice|reading|completion)-\d+(?:-|$)/i.test(String(questionId || ''));
}

function getPendingCspPaper(userId, role = 'student') {
  if (role !== 'student') return null;
  return db.prepare(`
    SELECT a.id, a.title, a.level, a.year, a.deadline
    FROM csp_paper_students ps
    JOIN csp_paper_assignments a ON a.id = ps.assignment_id
    WHERE ps.student_id = ?
      AND a.level IN ('CSP-J', 'CSP-S')
      AND a.analysis_released_at IS NULL
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT 1
  `).get(userId) || null;
}

function lockPayload(assignment) {
  if (!assignment) return { locked: false };
  return {
    locked: true,
    code: 'CSP_PAPER_ANALYSIS_LOCKED',
    error: CSP_PRACTICE_LOCK_MESSAGE,
    message: CSP_PRACTICE_LOCK_MESSAGE,
    assignment,
  };
}

module.exports = {
  CSP_PRACTICE_LOCK_MESSAGE,
  isCspPracticeLevel,
  isCspPracticeQuestionId,
  getPendingCspPaper,
  lockPayload,
};
