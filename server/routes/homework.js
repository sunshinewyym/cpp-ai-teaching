const express = require('express');
const db = require('../db');
const { auth, requireTeacher } = require('../middleware/auth');
const { loadQuestionBank, gradeQuestion } = require('../training/questionBank');
const { buildTrainingPracticeRecordFromSubmission } = require('../training/trainingRecord');

const router = express.Router();

const TYPE_LABELS = {
  choice: '选择题',
  judgment: '判断题',
  reading: '阅读程序题',
  completion: '完善程序题',
};
const ALLOWED_SOURCES = new Set(['CSP-J', 'CSP-S', 'GESP', 'NOIP']);

function parseJson(value, fallback) {
  try { return JSON.parse(value || ''); } catch { return fallback; }
}
function uniqueStrings(value) {
  const list = Array.isArray(value) ? value : [value];
  return [...new Set(list.map(item => String(item ?? '').trim()).filter(Boolean))];
}
function normalizeAnswers(value) {
  return uniqueStrings(value).sort();
}
function partOptionKeys(part) {
  if (Array.isArray(part?.options)) return uniqueStrings(part.options);
  if (part?.options && typeof part.options === 'object') return Object.keys(part.options);
  return [];
}
function parseQuestionIds(value) {
  return uniqueStrings(parseJson(value, []));
}
function questionMeta(id) {
  let match = /^gesp-cpp([2-8])-(\d{4})-(\d{2})-(choice|judgment)-(\d+)$/i.exec(id);
  if (match) {
    return {
      source: 'GESP', level: `GESP-${match[1]}`, year: Number(match[2]), session: `${match[2]}-${match[3]}`,
      type: match[4].toLowerCase(), number: Number(match[5]),
    };
  }
  match = /^noip-(\d{4})-(reading|completion)-(\d+)$/i.exec(id);
  if (match) {
    return {
      source: 'NOIP', level: 'NOIP', year: Number(match[1]), session: match[1],
      type: match[2].toLowerCase(), number: Number(match[3]),
    };
  }
  match = /^csp-s-(\d{4})-(choice|reading|completion)-(\d+)$/i.exec(id);
  if (match) {
    return {
      source: 'CSP-S', level: 'CSP-S', year: Number(match[1]), session: match[1],
      type: match[2].toLowerCase(), number: Number(match[3]),
    };
  }
  match = /^(\d{4})-(choice|reading|completion)-(\d+)$/i.exec(id);
  if (match) {
    return {
      source: 'CSP-J', level: 'CSP-J', year: Number(match[1]), session: match[1],
      type: match[2].toLowerCase(), number: Number(match[3]),
    };
  }
  return null;
}
function questionLabel(meta) {
  if (!meta) return '题目';
  return `${meta.source} ${meta.year}${meta.source === 'GESP' ? `-${meta.session.slice(5)}` : ''} ${TYPE_LABELS[meta.type] || meta.type}第${meta.number}题`;
}
function partSource(def) {
  return def?.parts?.[0]?.source || null;
}
function originalParts(def) {
  if (!Array.isArray(def?.parts)) return [];
  const originals = Array.isArray(def.parts[0]?.questions) ? def.parts[0].questions : null;
  if (originals?.length) return originals;
  return def.parts;
}
function inferTags(def) {
  const explicit = Array.isArray(def?.tags) ? def.tags.filter(Boolean) : [];
  const material = `${def?.question || ''}\n${def?.title || ''}\n${def?.description || ''}\n${def?.statement || ''}`.toLowerCase();
  const candidates = [
    ['指针与引用', /指针|引用|pointer|reference|\*/i],
    ['字符串', /字符串|string|char\s*\[/i],
    ['数组', /数组|array|\[[^\]]+\]/i],
    ['数据类型与运算', /数据类型|运算符|整数|浮点|取模|int\b|double\b/i],
    ['分支与循环', /循环|for\b|while\b|if\b|分支/i],
    ['递推', /递推|递归|fibonacci|阶乘/i],
    ['排序与查找', /排序|查找|sort|search|二分/i],
    ['树与二叉树', /二叉树|哈夫曼|树节点|前缀|后缀|表达式树/i],
    ['图论', /图论|最短路|连通|拓扑|图的遍历|bfs|dfs/i],
    ['动态规划', /动态规划|dp\b|背包/i],
    ['数学与数论', /数学|数论|质数|素数|最大公约数|组合|排列/i],
  ];
  const inferred = candidates.filter(([, pattern]) => pattern.test(material)).map(([tag]) => tag);
  return [...new Set([...explicit, ...inferred])].slice(0, 8);
}
function maxScore(def, meta) {
  if (!def) return 0;
  return originalParts(def).reduce((sum, part) => sum + Number(part.score || 0), 0) || (meta?.type === 'judgment' ? 1 : 2);
}
function optionMap(def) {
  return def?.options && typeof def.options === 'object' ? def.options : {};
}
function publicQuestion(def, meta, reveal = false) {
  if (!def || !meta) return null;
  const base = {
    id: def.id,
    label: questionLabel(meta),
    source: meta.source,
    level: meta.level,
    year: meta.year,
    session: meta.session,
    type: meta.type,
    number: meta.number,
    tags: inferTags(def),
    maxScore: maxScore(def, meta),
  };
  if (['choice', 'judgment'].includes(meta.type)) {
    const part = def.parts?.[0] || {};
    Object.assign(base, { question: def.question || '', options: optionMap(def) });
    if (reveal) {
      base.answer = normalizeAnswers(part.answers || part.answer)[0] || '';
      base.explanation = part.explanation || '';
    }
    return base;
  }
  Object.assign(base, {
    title: def.title || '',
    description: def.description || '',
    statement: def.statement || '',
    questions: originalParts(def).map((part, index) => {
      const item = {
        id: part.id,
        number: part.number || index + 1,
        text: part.text || part.question || '',
        options: part.options && typeof part.options === 'object'
          ? part.options
          : Object.fromEntries(uniqueStrings(part.options).map(key => [key, key])),
        score: Number(part.score || 1),
        multiple: normalizeAnswers(part.answers).length > 1,
      };
      if (reveal) {
        item.answers = normalizeAnswers(part.answers);
        item.explanation = part.explanation || '';
      }
      return item;
    }),
  });
  return base;
}
function catalogItem(def, meta) {
  const preview = (def.question || def.title || def.description || def.statement || '')
    .replace(/```[\s\S]*?```/g, '[代码]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
  return {
    id: def.id, label: questionLabel(meta), source: meta.source, level: meta.level, year: meta.year,
    session: meta.session, type: meta.type, number: meta.number, tags: inferTags(def),
    maxScore: maxScore(def, meta), preview,
  };
}
function deadlinePassed(value) {
  if (!value) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && Date.now() > time;
}
function jsonAnswers(value) { return parseJson(value, {}); }
function studentVisible(req, studentId) {
  const sql = req.user?.is_admin
    ? "SELECT 1 FROM users WHERE id = ? AND role = 'student'"
    : "SELECT 1 FROM users WHERE id = ? AND role = 'student' AND created_by = ?";
  const params = req.user?.is_admin ? [studentId] : [studentId, req.user.id];
  return Boolean(db.prepare(sql).get(...params));
}
function getTeacherAssignment(req, id) {
  let sql = 'SELECT * FROM homework_assignments WHERE id = ?';
  const params = [id];
  if (!req.user?.is_admin) { sql += ' AND teacher_id = ?'; params.push(req.user.id); }
  return db.prepare(sql).get(...params);
}
function getStudentAssignment(req, id) {
  return db.prepare(`
    SELECT a.*, hs.id AS assignment_student_id, hs.student_id, hs.completed_at
    FROM homework_assignments a
    JOIN homework_students hs ON hs.assignment_id = a.id
    WHERE a.id = ? AND hs.student_id = ?
  `).get(id, req.user.id);
}
function allCatalog() {
  return loadQuestionBank().then(bank => [...bank.values()].map(def => {
    const meta = questionMeta(def.id);
    return meta && ALLOWED_SOURCES.has(meta.source) ? { def, meta } : null;
  }).filter(Boolean));
}
function serializeStudentSubmission(row, reveal) {
  if (!row) return { submitted: false, answers: {} };
  const item = { submitted: Boolean(row.submitted_at), answers: jsonAnswers(row.answers_json), submittedAt: row.submitted_at || null };
  if (reveal) Object.assign(item, { score: Number(row.score || 0), maxScore: Number(row.max_score || 0) });
  return item;
}

router.get('/catalog', auth, requireTeacher, async (req, res, next) => {
  try {
    const source = String(req.query.source || 'all');
    const level = String(req.query.level || 'all');
    const year = String(req.query.year || 'all');
    const type = String(req.query.type || 'all');
    const tag = String(req.query.tag || 'all');
    const keyword = String(req.query.keyword || '').trim().toLowerCase();
    const entries = await allCatalog();
    const items = entries.filter(({ def, meta }) => {
      if (source !== 'all' && meta.source !== source) return false;
      if (level !== 'all' && meta.level !== level) return false;
      if (year !== 'all' && String(meta.year) !== year && meta.session !== year) return false;
      if (type !== 'all' && meta.type !== type) return false;
      const tags = inferTags(def);
      if (tag !== 'all' && !tags.includes(tag)) return false;
      if (keyword && !`${questionLabel(meta)} ${def.question || ''} ${def.title || ''} ${def.description || ''} ${tags.join(' ')}`.toLowerCase().includes(keyword)) return false;
      return true;
    }).map(({ def, meta }) => catalogItem(def, meta));
    const tags = [...new Set(entries.flatMap(({ def }) => inferTags(def)))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    const years = [...new Set(entries.flatMap(({ meta }) => [String(meta.year || ''), meta.session].filter(Boolean)))].sort((a, b) => b.localeCompare(a, 'zh-CN'));
    res.json({ items, tags, years });
  } catch (error) { next(error); }
});

router.get('/assignments', auth, requireTeacher, (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT a.*, COUNT(DISTINCT hs.student_id) AS student_count,
        COUNT(DISTINCT CASE WHEN hs.completed_at IS NOT NULL THEN hs.student_id END) AS completed_count,
        COUNT(s.id) AS submission_count
      FROM homework_assignments a
      LEFT JOIN homework_students hs ON hs.assignment_id = a.id
      LEFT JOIN homework_submissions s ON s.assignment_student_id = hs.id AND s.submitted_at IS NOT NULL
      ${req.user.is_admin ? '' : 'WHERE a.teacher_id = ?'}
      GROUP BY a.id ORDER BY a.created_at DESC
    `).all(...(req.user.is_admin ? [] : [req.user.id]));
    res.json(rows.map(row => ({
      ...row,
      questionIds: parseQuestionIds(row.question_ids_json),
      questionCount: parseQuestionIds(row.question_ids_json).length,
      analysisReleased: Boolean(row.analysis_released_at),
    })));
  } catch (error) { next(error); }
});

router.post('/assignments', auth, requireTeacher, async (req, res, next) => {
  try {
    const title = String(req.body?.title || '').trim();
    const questionIds = uniqueStrings(req.body?.questionIds);
    const studentIds = [...new Set((Array.isArray(req.body?.studentIds) ? req.body.studentIds : []).map(Number).filter(Number.isInteger))];
    if (!title) return res.status(400).json({ error: '请输入作业名称' });
    if (!questionIds.length || questionIds.length > 500) return res.status(400).json({ error: '请选择 1 到 500 道题目' });
    if (!studentIds.length || studentIds.length > 200) return res.status(400).json({ error: '请选择至少 1 名学生' });
    const catalog = await allCatalog();
    const allowed = new Set(catalog.map(item => item.def.id));
    if (questionIds.some(id => !allowed.has(id))) return res.status(400).json({ error: '包含不存在或不支持的题目' });
    if (studentIds.some(id => !studentVisible(req, id))) return res.status(403).json({ error: '包含无权限的学生' });
    const result = db.prepare(`INSERT INTO homework_assignments (teacher_id,title,question_ids_json,deadline,lock_practice) VALUES (?,?,?,?,?)`)
      .run(req.user.id, title, JSON.stringify(questionIds), String(req.body?.deadline || ''), req.body?.lockPractice === false ? 0 : 1);
    const assignmentId = Number(result.lastInsertRowid);
    const insertStudent = db.prepare('INSERT INTO homework_students (assignment_id,student_id) VALUES (?,?)');
    db.exec('BEGIN IMMEDIATE');
    try { for (const studentId of studentIds) insertStudent.run(assignmentId, studentId); db.exec('COMMIT'); }
    catch (error) { db.exec('ROLLBACK'); db.prepare('DELETE FROM homework_assignments WHERE id = ?').run(assignmentId); throw error; }
    res.status(201).json({ id: assignmentId, message: '作业已布置' });
  } catch (error) { next(error); }
});

router.get('/assignments/:id', auth, requireTeacher, async (req, res, next) => {
  try {
    const assignment = getTeacherAssignment(req, Number(req.params.id));
    if (!assignment) return res.status(404).json({ error: '作业不存在或无权限' });
    const entries = await allCatalog();
    const map = new Map(entries.map(item => [item.def.id, item]));
    const questionIds = parseQuestionIds(assignment.question_ids_json);
    const students = db.prepare(`
      SELECT hs.id AS assignmentStudentId, hs.student_id AS studentId, hs.completed_at, u.name, u.username, u.class_name
      FROM homework_students hs JOIN users u ON u.id = hs.student_id WHERE hs.assignment_id = ? ORDER BY u.name
    `).all(assignment.id);
    const submissions = db.prepare(`
      SELECT s.*, hs.student_id AS studentId FROM homework_submissions s
      JOIN homework_students hs ON hs.id = s.assignment_student_id
      WHERE hs.assignment_id = ? ORDER BY s.question_id, hs.student_id
    `).all(assignment.id);
    const byStudent = new Map(students.map(student => [student.studentId, { ...student, submitted: 0, total: questionIds.length, score: 0, maxScore: 0 }]));
    const byQuestion = new Map(questionIds.map(id => {
      const entry = map.get(id); const meta = entry?.meta;
      return [id, { questionId: id, label: meta ? questionLabel(meta) : id, type: TYPE_LABELS[meta?.type] || '题目', number: meta?.number || '', submitted: 0, total: students.length, averagePercent: null, details: [], maxScore: maxScore(entry?.def, meta) }];
    }));
    for (const row of submissions) {
      const q = byQuestion.get(row.question_id); const student = byStudent.get(row.studentId);
      if (!q || !student) continue;
      if (!row.submitted_at) continue;
      const answers = jsonAnswers(row.answers_json);
      const entry = map.get(row.question_id);
      q.submitted += 1;
      q.details.push({ studentId: row.studentId, name: student.name, submitted: true, score: Number(row.score || 0), maxScore: Number(row.max_score || q.maxScore), correct: Number(row.score || 0) === Number(row.max_score || q.maxScore), answers });
      student.submitted += 1; student.score += Number(row.score || 0); student.maxScore += Number(row.max_score || q.maxScore);
    }
    for (const q of byQuestion.values()) {
      q.averagePercent = q.submitted ? Math.round(q.details.reduce((sum, item) => sum + (item.maxScore ? item.score / item.maxScore * 100 : 0), 0) / q.submitted) : null;
      for (const student of students) if (!q.details.some(item => item.studentId === student.studentId)) q.details.push({ studentId: student.studentId, name: student.name, submitted: false, score: 0, maxScore: q.maxScore, correct: false, answers: {} });
    }
    res.json({
      id: assignment.id, teacherId: assignment.teacher_id, title: assignment.title, deadline: assignment.deadline || '',
      lockPractice: Boolean(assignment.lock_practice), analysisReleasedAt: assignment.analysis_released_at,
      questionIds, questionCount: questionIds.length, questions: questionIds.map(id => publicQuestion(map.get(id)?.def, map.get(id)?.meta, true)).filter(Boolean),
      students: [...byStudent.values()], stats: [...byQuestion.values()],
    });
  } catch (error) { next(error); }
});

router.put('/assignments/:id', auth, requireTeacher, (req, res, next) => {
  try {
    const assignment = getTeacherAssignment(req, Number(req.params.id));
    if (!assignment) return res.status(404).json({ error: '作业不存在或无权限' });
    const title = String(req.body?.title ?? assignment.title).trim();
    const deadline = String(req.body?.deadline ?? assignment.deadline ?? '');
    if (!title) return res.status(400).json({ error: '作业名称不能为空' });
    db.prepare("UPDATE homework_assignments SET title = ?, deadline = ?, lock_practice = ?, updated_at = datetime('now','localtime') WHERE id = ?")
      .run(title, deadline, req.body?.lockPractice === undefined ? assignment.lock_practice : (req.body.lockPractice ? 1 : 0), assignment.id);
    res.json({ message: '作业已更新' });
  } catch (error) { next(error); }
});

router.delete('/assignments/:id', auth, requireTeacher, (req, res, next) => {
  try {
    const assignment = getTeacherAssignment(req, Number(req.params.id));
    if (!assignment) return res.status(404).json({ error: '作业不存在或无权限' });
    const count = db.prepare('SELECT COUNT(*) AS count FROM homework_submissions s JOIN homework_students hs ON hs.id = s.assignment_student_id WHERE hs.assignment_id = ? AND s.submitted_at IS NOT NULL').get(assignment.id).count;
    if (Number(count)) return res.status(409).json({ error: '已有学生提交，不能删除；可保留历史记录' });
    db.prepare('DELETE FROM homework_assignments WHERE id = ?').run(assignment.id);
    res.json({ message: '作业已删除' });
  } catch (error) { next(error); }
});

router.post('/assignments/:id/students', auth, requireTeacher, (req, res, next) => {
  try {
    const assignment = getTeacherAssignment(req, Number(req.params.id));
    if (!assignment) return res.status(404).json({ error: '作业不存在或无权限' });
    const studentIds = [...new Set((Array.isArray(req.body?.studentIds) ? req.body.studentIds : []).map(Number).filter(Number.isInteger))];
    if (!studentIds.length || studentIds.some(id => !studentVisible(req, id))) return res.status(400).json({ error: '请选择有权限的学生' });
    const insert = db.prepare('INSERT OR IGNORE INTO homework_students (assignment_id,student_id) VALUES (?,?)');
    for (const id of studentIds) insert.run(assignment.id, id);
    res.json({ message: '学生已加入作业' });
  } catch (error) { next(error); }
});

router.post('/assignments/:id/release', auth, requireTeacher, (req, res, next) => {
  try {
    const assignment = getTeacherAssignment(req, Number(req.params.id));
    if (!assignment) return res.status(404).json({ error: '作业不存在或无权限' });
    db.prepare("UPDATE homework_assignments SET analysis_released_at = COALESCE(analysis_released_at, datetime('now','localtime')), updated_at = datetime('now','localtime') WHERE id = ?").run(assignment.id);
    res.json({ message: '已开放已提交题目的解析' });
  } catch (error) { next(error); }
});

router.get('/student/assignments', auth, (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT a.*, hs.id AS assignment_student_id, hs.completed_at
      FROM homework_assignments a JOIN homework_students hs ON hs.assignment_id = a.id
      WHERE hs.student_id = ? ORDER BY a.created_at DESC
    `).all(req.user.id);
    const result = rows.map(row => {
      const total = parseQuestionIds(row.question_ids_json).length;
      const submitted = db.prepare('SELECT COUNT(*) AS count FROM homework_submissions WHERE assignment_student_id = ? AND submitted_at IS NOT NULL').get(row.assignment_student_id).count;
      const score = db.prepare('SELECT COALESCE(SUM(score),0) AS score, COALESCE(SUM(max_score),0) AS maxScore FROM homework_submissions WHERE assignment_student_id = ? AND submitted_at IS NOT NULL').get(row.assignment_student_id);
      return { id: row.id, title: row.title, deadline: row.deadline || '', submittedCount: Number(submitted), total, completed: Number(submitted) === total, analysisReleasedAt: row.analysis_released_at, score: row.analysis_released_at ? Number(score.score) : null, maxScore: row.analysis_released_at ? Number(score.maxScore) : null };
    });
    res.json(result);
  } catch (error) { next(error); }
});

router.get('/student/assignments/:id', auth, async (req, res, next) => {
  try {
    const assignment = getStudentAssignment(req, Number(req.params.id));
    if (!assignment) return res.status(404).json({ error: '作业不存在或未布置给你' });
    const entries = await allCatalog();
    const map = new Map(entries.map(item => [item.def.id, item]));
    const questionIds = parseQuestionIds(assignment.question_ids_json);
    const rows = db.prepare('SELECT * FROM homework_submissions WHERE assignment_student_id = ?').all(assignment.assignment_student_id);
    const rowMap = new Map(rows.map(row => [row.question_id, row]));
    const questions = questionIds.map(id => {
      const entry = map.get(id); const reveal = Boolean(assignment.analysis_released_at && rowMap.get(id)?.submitted_at);
      return publicQuestion(entry?.def, entry?.meta, reveal);
    }).filter(Boolean);
    const submissions = Object.fromEntries(questionIds.map(id => [id, serializeStudentSubmission(rowMap.get(id), Boolean(assignment.analysis_released_at && rowMap.get(id)?.submitted_at))]));
    const score = rows.filter(row => row.submitted_at).reduce((sum, row) => sum + Number(row.score || 0), 0);
    const max = rows.filter(row => row.submitted_at).reduce((sum, row) => sum + Number(row.max_score || 0), 0);
    res.json({ id: assignment.id, title: assignment.title, deadline: assignment.deadline || '', lockPractice: Boolean(assignment.lock_practice), analysisReleasedAt: assignment.analysis_released_at, questionIds, questions, submissions, submittedCount: rows.filter(row => row.submitted_at).length, total: questionIds.length, score: assignment.analysis_released_at ? score : null, maxScore: assignment.analysis_released_at ? max : null });
  } catch (error) { next(error); }
});

async function getStudentQuestion(req, assignmentId, questionId) {
  const assignment = getStudentAssignment(req, assignmentId);
  if (!assignment) return { error: '作业不存在或未布置给你' };
  const questionIds = parseQuestionIds(assignment.question_ids_json);
  if (!questionIds.includes(questionId)) return { error: '该题不属于本次作业' };
  const bank = await loadQuestionBank();
  const def = bank.get(questionId); const meta = questionMeta(questionId);
  if (!def || !meta || !ALLOWED_SOURCES.has(meta.source)) return { error: '题目不存在' };
  return { assignment, def, meta, questionIds };
}
function validateDraft(def, answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return { error: '答案格式不正确' };
  const parts = originalParts(def);
  const allowed = new Map(parts.map(part => [part.id, new Set(partOptionKeys(part))]));
  for (const [id, value] of Object.entries(answers)) {
    if (!allowed.has(id)) return { error: '包含无效的小题' };
    const selected = normalizeAnswers(value);
    if (selected.some(key => !allowed.get(id).has(key))) return { error: '包含无效选项' };
  }
  return { answers: Object.fromEntries(Object.entries(answers).map(([id, value]) => [id, normalizeAnswers(value)])) };
}

router.put('/student/assignments/:id/questions/:questionId', auth, async (req, res, next) => {
  try {
    const item = await getStudentQuestion(req, Number(req.params.id), req.params.questionId);
    if (item.error) return res.status(404).json({ error: item.error });
    const existing = db.prepare('SELECT * FROM homework_submissions WHERE assignment_student_id = ? AND question_id = ?').get(item.assignment.assignment_student_id, req.params.questionId);
    if (item.assignment.analysis_released_at && existing?.submitted_at) return res.status(423).json({ error: '解析已开放，已提交题目不能修改' });
    if (deadlinePassed(item.assignment.deadline)) return res.status(410).json({ error: '已超过作业截止时间' });
    const checked = validateDraft(item.def, req.body?.answers);
    if (checked.error) return res.status(400).json({ error: checked.error });
    const answersJson = JSON.stringify(checked.answers);
    db.prepare(`
      INSERT INTO homework_submissions (assignment_student_id,question_id,answers_json,max_score,updated_at)
      VALUES (?,?,?,?,datetime('now','localtime'))
      ON CONFLICT(assignment_student_id,question_id) DO UPDATE SET answers_json=excluded.answers_json, max_score=excluded.max_score, updated_at=datetime('now','localtime')
    `).run(item.assignment.assignment_student_id, req.params.questionId, answersJson, maxScore(item.def, item.meta));
    res.json({ message: '草稿已保存' });
  } catch (error) { next(error); }
});

router.post('/student/assignments/:id/questions/:questionId/submit', auth, async (req, res, next) => {
  try {
    const questionId = req.params.questionId;
    const item = await getStudentQuestion(req, Number(req.params.id), questionId);
    if (item.error) return res.status(404).json({ error: item.error });
    const existing = db.prepare('SELECT * FROM homework_submissions WHERE assignment_student_id = ? AND question_id = ?').get(item.assignment.assignment_student_id, questionId);
    if (item.assignment.analysis_released_at && existing?.submitted_at) return res.status(423).json({ error: '解析已开放，已提交题目不能修改' });
    if (deadlinePassed(item.assignment.deadline)) return res.status(410).json({ error: '已超过作业截止时间' });
    const checked = validateDraft(item.def, req.body?.answers);
    if (checked.error) return res.status(400).json({ error: checked.error });
    const result = await gradeQuestion(questionId, checked.answers);
    const duration = Number.isFinite(Number(req.body?.durationSeconds)) ? Math.max(0, Math.round(Number(req.body.durationSeconds))) : 0;
    const saved = db.prepare(`
      INSERT INTO homework_submissions (assignment_student_id,question_id,answers_json,score,max_score,duration_seconds,submitted_at,updated_at)
      VALUES (?,?,?,?,?,?,datetime('now','localtime'),datetime('now','localtime'))
      ON CONFLICT(assignment_student_id,question_id) DO UPDATE SET answers_json=excluded.answers_json, score=excluded.score, max_score=excluded.max_score, duration_seconds=excluded.duration_seconds, submitted_at=datetime('now','localtime'), updated_at=datetime('now','localtime')
    `).run(item.assignment.assignment_student_id, questionId, JSON.stringify(result.answers), result.score, result.maxScore, duration);
    const submission = db.prepare('SELECT id FROM homework_submissions WHERE assignment_student_id = ? AND question_id = ?').get(item.assignment.assignment_student_id, questionId);
    const record = buildTrainingPracticeRecordFromSubmission(questionId, item.def, result.answers, result.score, result.maxScore, duration, Number(submission.id));
    if (record) {
      record.answers.source = '课后作业';
      record.answers.homework_assignment_id = Number(item.assignment.id);
      record.answers.homework_submission_id = Number(submission.id);
      const existingRecord = db.prepare('SELECT id FROM practice_records WHERE homework_submission_id = ?').get(Number(submission.id));
      if (existingRecord) {
        db.prepare("UPDATE practice_records SET user_id = ?, level = ?, year = ?, question_type = ?, total_score = ?, max_score = ?, answers_json = ?, duration_seconds = ?, created_at = datetime('now','localtime') WHERE id = ?")
          .run(req.user.id, record.level, record.year, record.question_type, record.total_score, record.max_score, JSON.stringify(record.answers), record.duration_seconds, existingRecord.id);
      } else {
        db.prepare(`
          INSERT INTO practice_records (user_id,level,year,question_type,total_score,max_score,answers_json,duration_seconds,homework_submission_id)
          VALUES (?,?,?,?,?,?,?,?,?)
        `).run(req.user.id, record.level, record.year, record.question_type, record.total_score, record.max_score, JSON.stringify(record.answers), record.duration_seconds, Number(submission.id));
      }
    }
    const total = item.questionIds.length;
    const submittedCount = db.prepare('SELECT COUNT(*) AS count FROM homework_submissions WHERE assignment_student_id = ? AND submitted_at IS NOT NULL').get(item.assignment.assignment_student_id).count;
    if (Number(submittedCount) >= total) db.prepare("UPDATE homework_students SET completed_at = COALESCE(completed_at, datetime('now','localtime')) WHERE id = ?").run(item.assignment.assignment_student_id);
    const response = { message: '本题已提交', score: result.score, maxScore: result.maxScore, submittedCount: Number(submittedCount), total };
    if (item.assignment.analysis_released_at) Object.assign(response, { answers: result.answers, parts: result.parts, explanation: item.def.parts?.[0]?.explanation || '' });
    res.json(response);
  } catch (error) { next(error); }
});

module.exports = router;
