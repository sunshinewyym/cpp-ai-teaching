const express = require('express');
const db = require('../db');
const { auth, requireTeacher } = require('../middleware/auth');
const { chatStream } = require('../services/deepseek');

const router = express.Router();

// 学生提交练习记录
router.post('/submit', auth, (req, res) => {
  const { level, year, question_type, total_score, max_score, answers, duration_seconds } = req.body;
  if (!level || !year || !question_type || total_score === undefined || max_score === undefined || !answers) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const answersJson = JSON.stringify(answers);
  const result = db.prepare(
    'INSERT INTO practice_records (user_id, level, year, question_type, total_score, max_score, answers_json, duration_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, level, year, question_type, total_score, max_score, answersJson, duration_seconds || null);
  res.json({ id: Number(result.lastInsertRowid), message: '记录已保存' });
});

// 学生查看自己的历史记录
router.get('/my-history', auth, (req, res) => {
  const { level, year, question_type, limit } = req.query;
  let sql = 'SELECT * FROM practice_records WHERE user_id = ?';
  const params = [req.user.id];
  if (level) { sql += ' AND level = ?'; params.push(level); }
  if (year) { sql += ' AND year = ?'; params.push(year); }
  if (question_type) { sql += ' AND question_type = ?'; params.push(question_type); }
  sql += ' ORDER BY created_at DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(Number(limit)); }
  const records = db.prepare(sql).all(...params);
  res.json(records.map(r => ({ ...r, answers: JSON.parse(r.answers_json) })));
});

// 老师查看学生记录（数据隔离）
router.get('/all-records', auth, requireTeacher, (req, res) => {
  const { class_name, level, year, question_type, student_id, limit, offset } = req.query;
  let sql = `SELECT r.*, u.name as student_name, u.username as student_username, u.class_name
    FROM practice_records r JOIN users u ON r.user_id = u.id WHERE 1=1`;
  const params = [];

  // 数据隔离：非 admin 只能看自己创建的学生
  if (!req.user.is_admin) {
    sql += ' AND u.created_by = ?';
    params.push(req.user.id);
  }

  if (class_name) { sql += ' AND u.class_name = ?'; params.push(class_name); }
  if (level) { sql += ' AND r.level = ?'; params.push(level); }
  if (year) { sql += ' AND r.year = ?'; params.push(year); }
  if (question_type) { sql += ' AND r.question_type = ?'; params.push(question_type); }
  if (student_id) { sql += ' AND r.user_id = ?'; params.push(student_id); }
  sql += ' ORDER BY r.created_at DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(Number(limit)); }
  if (offset) { sql += ' OFFSET ?'; params.push(Number(offset)); }
  const records = db.prepare(sql).all(...params);
  res.json(records.map(r => ({ ...r, answers: JSON.parse(r.answers_json) })));
});

// 老师查看某个学生的记录
router.get('/student/:id', auth, requireTeacher, (req, res) => {
  const { id } = req.params;
  let sql = 'SELECT id, username, name, class_name FROM users WHERE id = ? AND role = ?';
  const params = [id, 'student'];
  if (!req.user.is_admin) {
    sql += ' AND created_by = ?';
    params.push(req.user.id);
  }
  const student = db.prepare(sql).get(...params);
  if (!student) return res.status(404).json({ error: '学生不存在或无权限' });
  const records = db.prepare('SELECT * FROM practice_records WHERE user_id = ? ORDER BY created_at DESC').all(id);
  res.json({ student, records: records.map(r => ({ ...r, answers: JSON.parse(r.answers_json) })) });
});

// 老师获取统计概览（数据隔离）
router.get('/stats', auth, requireTeacher, (req, res) => {
  let studentFilter = '';
  const params = [];
  if (!req.user.is_admin) {
    studentFilter = ' AND u.created_by = ?';
    params.push(req.user.id);
  }

  const totalStudents = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE role = ?' + (req.user.is_admin ? '' : ' AND created_by = ?')).get(...(req.user.is_admin ? ['student'] : ['student', req.user.id])).cnt;
  const totalRecords = db.prepare(`SELECT COUNT(*) as cnt FROM practice_records r JOIN users u ON r.user_id = u.id WHERE u.role = 'student'` + studentFilter).get(...params).cnt;
  const recentRecords = db.prepare(`
    SELECT r.*, u.name as student_name, u.class_name
    FROM practice_records r JOIN users u ON r.user_id = u.id
    WHERE u.role = 'student'` + studentFilter + ` ORDER BY r.created_at DESC LIMIT 20
  `).all(...params);
  const classStats = db.prepare(`
    SELECT u.class_name, COUNT(DISTINCT r.user_id) as active_students, COUNT(*) as total_practices,
      ROUND(AVG(r.total_score * 1.0 / r.max_score * 100), 1) as avg_score_rate
    FROM practice_records r JOIN users u ON r.user_id = u.id
    WHERE u.role = 'student'` + studentFilter + ` GROUP BY u.class_name
  `).all(...params);
  res.json({ totalStudents, totalRecords, recentRecords, classStats });
});

// AI 分析练习记录（SSE 流式）
router.post('/analyze', auth, async (req, res) => {
  const { record_id, answers, level, year, question_type, total_score, max_score } = req.body;

  // 如果传了 record_id，从数据库取
  let data = { answers, level, year, question_type, total_score, max_score };
  if (record_id) {
    const record = db.prepare('SELECT * FROM practice_records WHERE id = ?').get(record_id);
    if (!record) return res.status(404).json({ error: '记录不存在' });
    // 权限检查：学生只能分析自己的，老师可以分析自己学生的
    if (req.user.role === 'student' && record.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权查看该记录' });
    }
    data = { answers: JSON.parse(record.answers_json), level: record.level, year: record.year, question_type: record.question_type, total_score: record.total_score, max_score: record.max_score };
  }

  if (!data.answers?.questions?.length) {
    return res.status(400).json({ error: '没有可分析的答题数据' });
  }

  const questions = data.answers.questions;
  const wrongQuestions = questions.filter(q => !q.correct);
  const typeLabel = { choice: '选择题', reading: '阅读程序题', completion: '完善程序题' }[data.question_type] || data.question_type;

  const prompt = `你是一位经验丰富的 C++ 信息学竞赛教练。请根据以下学生的 CSP 练习答题情况，给出简洁的分析和建议。

练习信息：
- 级别：${data.level}
- 年份：${data.year} 年
- 题型：${typeLabel}
- 得分：${data.total_score}/${data.max_score}（得分率 ${Math.round(data.total_score / data.max_score * 100)}%）

答题详情：
${questions.map((q, i) => `第${q.number || i + 1}题：学生答案 ${q.user_answer || '未作答'}，正确答案 ${q.correct_answer}，${q.correct ? '正确' : '错误'}，得 ${q.score} 分`).join('\n')}

请按以下结构回复（简洁，总字数控制在 300 字以内）：
1. **总体评价**：一句话概括表现
2. **薄弱点分析**：根据错题指出可能薄弱的知识点
3. **改进建议**：给出 2-3 条具体可操作的练习建议

注意：语气鼓励为主，适合中小学生阅读。`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const response = await chatStream([
      { role: 'system', content: '你是一位温和、善于鼓励的信息学竞赛教练，面向中小学生。' },
      { role: 'user', content: prompt },
    ], { temperature: 0.7, max_tokens: 800 });

    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') { res.write('data: [DONE]\n\n'); return; }
          try {
            const json = JSON.parse(payload);
            const content = json.choices?.[0]?.delta?.content;
            if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
          } catch {}
        }
      }
    });

    response.data.on('end', () => { res.write('data: [DONE]\n\n'); res.end(); });
    response.data.on('error', (err) => { res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`); res.end(); });
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: 'AI 服务暂时不可用' })}\n\n`);
    res.end();
  }
});

module.exports = router;
