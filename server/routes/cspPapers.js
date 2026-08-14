const express = require('express');
const db = require('../db');
const { auth, requireTeacher } = require('../middleware/auth');
const { chatWithMeta } = require('../services/deepseek');
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

const PAPER_SECTION_LABELS = {
  choice: '选择题',
  reading: '阅读程序题',
  completion: '完善程序题',
};

function emptyPaperSection(type) {
  return {
    type,
    label: PAPER_SECTION_LABELS[type] || type,
    totalQuestions: 0,
    submittedQuestions: 0,
    score: 0,
    maxScore: 0,
    percent: null,
  };
}

// CSP 历年题库没有统一的知识点字段；优先使用题库已有标签，缺失时
// 根据题干、选项或程序描述提取可解释的主题，供教师分析错题时参考。
function inferQuestionKnowledge(question) {
  const explicit = Array.isArray(question?.tags) ? question.tags.filter(Boolean) : [];
  const text = [
    question?.question,
    question?.title,
    question?.description,
    question?.statement,
    ...Object.values(question?.options || {}),
  ].filter(Boolean).join(' ').toLowerCase();
  const rules = [
    ['递归与递推', /递归|递推|斐波那契|factorial|fibonacci/],
    ['分支与循环', /循环|for\s*\(|while\s*\(|if\s*\(|switch\s*\(|条件/],
    ['数组与字符串', /数组|字符串|string|char|strlen|字符|vector/],
    ['指针与引用', /指针|引用|pointer|reference|\*[a-z_]|&[a-z_]/],
    ['排序与查找', /排序|sort|二分|binary|查找|search/],
    ['数学与数论', /质数|因数|最大公约数|最小公倍数|进制|取模|素数|factor|gcd|模运算/],
    ['图论与搜索', /图论|图\s*遍历|bfs|dfs|广度优先|深度优先|最短路|连通/],
    ['动态规划', /动态规划|\bdp\b|背包|状态转移/],
    ['树与二叉树', /二叉树|哈夫曼|树节点|树的高度|前序|中序|后序/],
    ['数据类型与运算', /数据类型|整型|浮点|运算符|位运算|sizeof|ascii|整数除法/],
    ['复杂度分析', /复杂度|时间复杂度|空间复杂度|o\s*\(/],
  ];
  const inferred = rules.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  return [...new Set([...explicit, ...inferred])].slice(0, 4).length
    ? [...new Set([...explicit, ...inferred])].slice(0, 4)
    : ['综合程序分析'];
}

function buildPaperScoreSummary(definition, bank, submissions) {
  const byQuestion = new Map(submissions.map(item => [item.question_id, item]));
  const sections = {
    choice: emptyPaperSection('choice'),
    reading: emptyPaperSection('reading'),
    completion: emptyPaperSection('completion'),
  };
  const wrongQuestions = [];
  let score = 0;
  let maxScore = 0;

  for (const questionId of definition.questionIds) {
    const type = questionType(questionId);
    const section = sections[type] || (sections[type] = emptyPaperSection(type));
    const qDefinition = bank.get(questionId);
    if (!qDefinition) continue;
    const questionMaxScore = qDefinition.parts.reduce((sum, part) => sum + Number(part.score || 0), 0);
    section.totalQuestions += 1;
    section.maxScore += questionMaxScore;
    maxScore += questionMaxScore;

    const submission = byQuestion.get(questionId);
    if (!submission) continue;
    const parts = qDefinition.parts.map(part => partView(part, parseAnswers(submission.answers_json)));
    const questionScore = parts.reduce((sum, part) => sum + part.score, 0);
    section.submittedQuestions += 1;
    section.score += questionScore;
    score += questionScore;
    if (questionScore < questionMaxScore) {
      const questionText = [
        qDefinition.question,
        qDefinition.title,
        qDefinition.description,
        qDefinition.statement,
      ].filter(Boolean).join('\n').trim();
      const optionText = Object.entries(qDefinition.options || {})
        .map(([key, value]) => `${key}. ${value}`)
        .join('\n');
      wrongQuestions.push({
        questionId,
        type,
        typeLabel: PAPER_SECTION_LABELS[type] || type,
        number: questionNumber(questionId),
        score: questionScore,
        maxScore: questionMaxScore,
        knowledgeTags: inferQuestionKnowledge(qDefinition),
        questionText: questionText.slice(0, 700),
        optionText: optionText.slice(0, 500),
        parts: parts.filter(part => !part.correct).map(part => ({
          id: part.id,
          selected: part.selected,
          correctAnswers: part.correctAnswers,
        })),
      });
    }
  }

  for (const section of Object.values(sections)) {
    section.percent = section.maxScore
      ? Math.round(section.score * 1000 / section.maxScore) / 10
      : null;
  }
  return {
    score,
    maxScore,
    percent: maxScore ? Math.round(score * 1000 / maxScore) / 10 : null,
    submittedCount: submissions.length,
    totalQuestions: definition.questionIds.length,
    sections,
    wrongQuestions,
  };
}

async function buildStudentPaperSummary(row) {
  const definition = await getPaperDefinition(row.level, row.year);
  const bank = await loadQuestionBank();
  const submissions = db.prepare(`
    SELECT * FROM csp_paper_submissions
    WHERE assignment_student_id = ?
  `).all(row.assignmentStudentId);
  return {
    assignmentId: row.id,
    assignmentStudentId: row.assignmentStudentId,
    title: row.title,
    level: row.level,
    year: row.year,
    deadline: row.deadline || '',
    assignedAt: row.assignedAt || null,
    completedAt: row.completedAt || null,
    analysisReleasedAt: row.analysisReleasedAt || null,
    ...buildPaperScoreSummary(definition, bank, submissions),
  };
}

function getTeacherStudent(req, studentId) {
  const id = Number(studentId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const sql = `SELECT u.id, u.name, u.username, u.class_name AS className
    FROM users u WHERE u.id = ? AND u.role = 'student'${studentScope(req)}`;
  return db.prepare(sql).get(...studentScopeParams(req, [id]));
}

async function buildStudentPaperHistory(req, studentId) {
  const student = getTeacherStudent(req, studentId);
  if (!student) return null;
  const rows = db.prepare(`
    SELECT a.id, a.title, a.level, a.year, a.deadline,
      a.analysis_released_at AS analysisReleasedAt,
      ps.id AS assignmentStudentId, ps.assigned_at AS assignedAt,
      ps.completed_at AS completedAt
    FROM csp_paper_students ps
    JOIN csp_paper_assignments a ON a.id = ps.assignment_id
    WHERE a.teacher_id = ? AND ps.student_id = ?
    ORDER BY a.created_at DESC, a.id DESC
  `).all(req.user.id, student.id);
  const papers = [];
  for (const row of rows) papers.push(await buildStudentPaperSummary(row));
  return { student, papers };
}

function paperPromptSummary(paper, includeWrongQuestions = true, maxWrongQuestions = 12) {
  const sectionText = Object.values(paper.sections)
    .map(section => `${section.label}${section.score}/${section.maxScore}分（完成${section.submittedQuestions}/${section.totalQuestions}题）`)
    .join('；');
  const wrongText = includeWrongQuestions && paper.wrongQuestions.length
    ? paper.wrongQuestions.slice(0, maxWrongQuestions).map(item => {
      const parts = item.parts.map(part => `${part.id}：作答${part.selected.join('/') || '未答'}，正确${part.correctAnswers.join('/')}`).join('；');
      const tags = item.knowledgeTags?.length ? `；知识点：${item.knowledgeTags.join('、')}` : '';
      const source = [item.questionText, item.optionText ? `选项：\n${item.optionText}` : '']
        .filter(Boolean)
        .join('\n');
      return `${item.typeLabel}第${item.number}题 ${item.score}/${item.maxScore}分${tags}${parts ? `（${parts}）` : ''}${source ? `\n题面：${source}` : ''}`;
    }).join('\n')
    : '无已提交错题';
  return `试卷：${paper.level} ${paper.year}《${paper.title}》\n总分：${paper.score}/${paper.maxScore}（${paper.percent ?? '—'}%）\n分部分数：${sectionText}\n错题明细：\n${wrongText}`;
}

function buildPaperAnalysisPrompt(paper, student) {
  return `你是一位经验丰富的信息学竞赛教师，请分析学生「${student.name}」这一次 CSP 整卷练习。

${paperPromptSummary(paper)}

请严格使用 Markdown 输出，且只使用二级标题、普通段落和列表，不要输出代码块或额外开场白。必须包含以下四个标题：
## 总体表现
结合总分、各部分得分和完成数量，说明优势与主要问题；如果只完成了部分题目，请明确指出样本不完整。
## 错题知识点
先按知识点聚合错题，列出出现次数和对应题号，再逐题解释失分原因。题面、选项或程序描述已给出时，必须引用其中的具体变量、数字、条件、代码行或选项差异；若单条题面确实为空，请明确指出缺少哪一项字段，不得把有题面的错题笼统写成“题库未提供足够信息”。
## 分数分析
比较选择题、阅读程序题和完善程序题的得分占比，指出最需要优先讲解的部分。
## 后续建议
给出 2-4 条具体、可执行的复习或课堂讲解建议，并对应到上面的知识点和题号；建议必须包含练习动作或讲解重点，不要写“加强练习”等空话。
不要把未提交的题目写成错题，也不要重复套用通用模板。只输出分析正文。`;
}

function buildHistoryAnalysisPrompt(history) {
  const papers = history.papers.slice(0, 30);
  const text = papers.length
    ? papers.map((paper, index) => `第${index + 1}次：${paperPromptSummary(paper, true, 12)}\n主要错题：${paper.wrongQuestions.slice(0, 8).map(item => `${item.typeLabel}第${item.number}题（${item.knowledgeTags?.join('、') || '知识点未知'}）`).join('、') || '无'}`).join('\n\n')
    : '暂无已布置的 CSP 整卷记录。';
  return `你是一位经验丰富的信息学竞赛教师，请分析学生「${history.student.name}」的 CSP 整卷历史练习情况。

${text}

请严格使用 Markdown 输出，且只使用二级标题、普通段落和列表，不要输出代码块或额外开场白。必须包含以下四个标题：
## 总体趋势
比较有提交记录的各次总分和三部分得分变化；忽略未提交试卷。
## 反复失分知识点
根据每次记录中提供的错题知识点和题面，按主题统计出现次数、涉及试卷及题号；题面存在时必须指出具体概念或代码行为，不能用“题库未提供足够信息”代替分析。
## 当前问题
说明样本数量、完成度和最需要关注的部分。
## 后续建议
给出分层、可执行的训练与讲解安排，明确先讲哪些知识点、用哪些题号复盘、下一次训练如何验证改进。
只输出分析正文。`;
}

function writeSse(res, payload) {
  if (payload === '[DONE]') {
    res.write('data: [DONE]\n\n');
    return;
  }
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function streamPaperAnalysis(res, prompt) {
  try {
    // AI 分析不需要逐字输出；一次性返回可避免代理/浏览器吞掉流式空帧。
    const result = await chatWithMeta([
      { role: 'system', content: '你是温和、严谨、重视证据的信息学竞赛教师。' },
      { role: 'user', content: prompt },
    ], {
      temperature: 0.45,
      max_tokens: 1600,
      timeout: 90000,
      thinking: { type: 'disabled' },
    });
    if (!result.content?.trim()) {
      return res.status(502).json({ error: 'AI 服务未返回分析正文，请稍后重试' });
    }
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    writeSse(res, { content: result.content });
    writeSse(res, '[DONE]');
    res.end();
  } catch (error) {
    if (res.headersSent) return res.end();
    res.status(502).json({ error: error.message || 'AI 服务暂时不可用' });
  }
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

router.put('/assignments/:id', auth, requireTeacher, async (req, res, next) => {
  try {
    const assignment = getTeacherAssignment(req, req.params.id);
    if (!assignment) return res.status(404).json({ error: '整卷任务不存在' });
    const title = cleanText(req.body?.title, 120) || assignment.title;
    const deadline = cleanText(req.body?.deadline, 40);
    db.prepare(`
      UPDATE csp_paper_assignments
      SET title = ?, deadline = ?, updated_at = datetime('now','localtime')
      WHERE id = ? AND teacher_id = ?
    `).run(title, deadline, assignment.id, req.user.id);
    res.json(await buildTeacherDetail(req, getTeacherAssignment(req, assignment.id)));
  } catch (error) {
    next(error);
  }
});

router.delete('/assignments/:id', auth, requireTeacher, (req, res, next) => {
  try {
    const assignment = getTeacherAssignment(req, req.params.id);
    if (!assignment) return res.status(404).json({ error: '整卷任务不存在' });
    db.exec('BEGIN IMMEDIATE');
    try {
      // 删除整卷时同步删除它产生的练习记录，避免排行榜留下孤立数据。
      db.prepare(`
        DELETE FROM practice_records
        WHERE paper_submission_id IN (
          SELECT s.id
          FROM csp_paper_submissions s
          JOIN csp_paper_students ps ON ps.id = s.assignment_student_id
          WHERE ps.assignment_id = ?
        )
      `).run(assignment.id);
      db.prepare('DELETE FROM csp_paper_assignments WHERE id = ? AND teacher_id = ?')
        .run(assignment.id, req.user.id);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    res.json({ deleted: true, id: assignment.id });
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

router.get('/students/:studentId/history', auth, requireTeacher, async (req, res, next) => {
  try {
    const history = await buildStudentPaperHistory(req, req.params.studentId);
    if (!history) return res.status(404).json({ error: '学生不存在或无权查看' });
    res.json(history);
  } catch (error) {
    next(error);
  }
});

router.post('/assignments/:id/students/:studentId/analyze', auth, requireTeacher, async (req, res, next) => {
  try {
    const assignment = getTeacherAssignment(req, req.params.id);
    if (!assignment) return res.status(404).json({ error: '整卷任务不存在' });
    const studentId = Number(req.params.studentId);
    const row = db.prepare(`
      SELECT a.id, a.title, a.level, a.year, a.deadline,
        a.analysis_released_at AS analysisReleasedAt,
        ps.id AS assignmentStudentId, ps.assigned_at AS assignedAt,
        ps.completed_at AS completedAt
      FROM csp_paper_students ps
      JOIN csp_paper_assignments a ON a.id = ps.assignment_id
      WHERE a.id = ? AND a.teacher_id = ? AND ps.student_id = ?
    `).get(assignment.id, req.user.id, studentId);
    if (!row) return res.status(404).json({ error: '该学生不在此整卷任务中' });
    const student = getTeacherStudent(req, studentId);
    if (!student) return res.status(404).json({ error: '学生不存在或无权查看' });
    const paper = await buildStudentPaperSummary(row);
    if (!paper.submittedCount) {
      return res.status(400).json({ error: '该学生尚未提交这份试卷，暂不能进行 AI 分析' });
    }
    return streamPaperAnalysis(res, buildPaperAnalysisPrompt(paper, student));
  } catch (error) {
    next(error);
  }
});

router.post('/students/:studentId/history/analyze', auth, requireTeacher, async (req, res, next) => {
  try {
    const history = await buildStudentPaperHistory(req, req.params.studentId);
    if (!history) return res.status(404).json({ error: '学生不存在或无权查看' });
    const submittedHistory = {
      ...history,
      papers: history.papers.filter(paper => paper.submittedCount > 0),
    };
    if (!submittedHistory.papers.length) {
      return res.status(400).json({ error: '该学生还没有提交过整卷题目，暂不能进行 AI 分析' });
    }
    return streamPaperAnalysis(res, buildHistoryAnalysisPrompt(submittedHistory));
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
