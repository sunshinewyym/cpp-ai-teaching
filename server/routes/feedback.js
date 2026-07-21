const express = require('express');
const axios = require('axios');
const db = require('../db');
const { auth, requireTeacher } = require('../middleware/auth');
const { chatStream } = require('../services/deepseek');

const router = express.Router();

// 默认课评风格规则（从「课评自动生成」规则提炼，老师可在页面上覆盖）
const DEFAULT_STYLE = `【输出模板】
家长您好，以下是本次课堂内容分享：

上课时间：{日期}
✨上课主题：{主题}
🎯课程目标：
1、{目标1，≤15字，动词开头}
2、{目标2，≤15字，动词开头}

📌 课堂情况反馈
【课程知识点】：{≤50字，正式风格}
【课堂表现】：
· {学生名}{表现}
· {学生名}{表现}
【后续建议】：{1-2条可操作建议}

【风格规则】
1. 课程目标每条≤15字，动词开头（掌握/学会/熟练运用），共2条，覆盖本课核心。
2. 知识点用正式风格，模板「本节课重点训练……，为后续……建立操作基础」，不写「这节课练了」「以后就不慌了」这类大白话。
3. 课堂表现分点符号用「· 」，题号一律替换为题目名称，绝不出现数字题号。
4. 学生名字自然融入每条，至少出现1-2次，语气亲切专业、像老师跟家长聊天但不口语化。
5. 表现结尾不固定，按实际表现灵活收尾：扎实→「基础很扎实 👍」；有进步→「慢慢上道了」；需改进→如实描述+鼓励。不要每篇都用「继续保持 👏」。
6. 按用户给的素材写，不硬凑每道题；素材不够时再自主补充。
7. 涉及调试习惯提醒时，话术：「建议先尝试 cout 中间变量自行定位，或用样例跑一遍验证——自己排查出来的问题记得更牢」。
8. 后续建议要具体可操作（如「写完代码先跑样例」「用 cout 定位问题」），不说「加强练习」这类空话。`;

// 抓取东方博宜 OJ 题目名称
async function fetchProblemTitle(id) {
  try {
    const resp = await axios.get(`https://oj.czos.cn/p/${id}`, {
      timeout: 8000,
      responseType: 'text',
      responseEncoding: 'utf-8',
    });
    const html = resp.data || '';
    const m = html.match(/<title>([^<]*)<\/title>/i);
    if (!m) return null;
    let title = m[1].trim();
    title = title.replace(/[-–—]\s*东方博宜\s*OJ\s*$/i, '').trim();
    title = title.replace(new RegExp(`^${id}\\s*[-–—]\\s*`), '').trim();
    return title || null;
  } catch (e) {
    return null;
  }
}

// 校验学生归属（数据隔离），返回学生行或 null
function getOwnedStudent(teacherUser, studentId) {
  let sql = 'SELECT id, name, class_name FROM users WHERE id = ? AND role = ?';
  const params = [studentId, 'student'];
  if (!teacherUser.is_admin) {
    sql += ' AND created_by = ?';
    params.push(teacherUser.id);
  }
  return db.prepare(sql).get(...params);
}

// 将上游 DeepSeek 的 SSE 流转发给前端。
// 关键：按字节缓冲，只在完整的 0x0A 行边界处解码，避免跨 chunk 的
// UTF-8 多字节字符或被截断的 data 行导致内容丢失 / 格式错乱。
function relaySSE(upstream, res) {
  let pending = Buffer.alloc(0);

  const handleLine = (rawLine) => {
    const line = rawLine.replace(/\r$/, '');
    if (!line.startsWith('data: ')) return;
    const payload = line.slice(6).trim();
    if (payload === '[DONE]') {
      res.write('data: [DONE]\n\n');
      return;
    }
    try {
      const json = JSON.parse(payload);
      const content = json.choices?.[0]?.delta?.content;
      if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
    } catch {}
  };

  upstream.on('data', (chunk) => {
    pending = Buffer.concat([pending, chunk]);
    let idx;
    while ((idx = pending.indexOf(0x0a)) !== -1) {
      const lineBuf = pending.slice(0, idx);
      pending = pending.slice(idx + 1);
      handleLine(lineBuf.toString('utf-8'));
    }
  });

  upstream.on('end', () => {
    if (pending.length) {
      handleLine(pending.toString('utf-8'));
      pending = Buffer.alloc(0);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  });

  upstream.on('error', (err) => {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  });
}

// 读取当前老师的课评风格规则
router.get('/style', auth, requireTeacher, (req, res) => {
  const row = db.prepare('SELECT feedback_style FROM users WHERE id = ?').get(req.user.id);
  res.json({ style: row?.feedback_style || '', defaultStyle: DEFAULT_STYLE });
});

// 保存当前老师的课评风格规则
router.put('/style', auth, requireTeacher, (req, res) => {
  const { style } = req.body;
  if (typeof style !== 'string') return res.status(400).json({ error: '参数错误' });
  db.prepare('UPDATE users SET feedback_style = ? WHERE id = ?').run(style, req.user.id);
  res.json({ message: '已保存' });
});

// 生成课后反馈（SSE 流式）
router.post('/generate', auth, requireTeacher, async (req, res) => {
  const { date, topic, problemIds, performance, style } = req.body;
  if (!topic || !performance) {
    return res.status(400).json({ error: '请填写上课主题和课堂表现' });
  }

  const ids = String(problemIds || '')
    .split(/[,，、\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const titleMap = {};
  await Promise.all(
    ids.map(async (id) => {
      const t = await fetchProblemTitle(id);
      if (t) titleMap[id] = t;
    })
  );
  const titleList = ids.length
    ? ids
        .map((id) =>
          titleMap[id]
            ? `题号 ${id} 对应题目名称《${titleMap[id]}》`
            : `题号 ${id}（未获取到题目名称，正文中请用「第 ${id} 题」之类的说法代替，不要直接写数字题号）`
        )
        .join('\n')
    : '（本次未提供题号）';

  const styleRules = (style && style.trim()) || DEFAULT_STYLE;

  const prompt = `你是一位经验丰富的少儿编程 / 信息学奥赛（C++）老师，现在要为家长写一段课堂反馈（课评）。

本次课堂信息：
- 上课时间：${date || '今天'}
- 上课主题：${topic}
- 题号与题目名称对照：
${titleList}
- 学生课堂表现素材：
${performance}

请严格遵守以下课评风格规则：
${styleRules}

【输出格式硬性要求】（必须逐条遵守，格式错误视为不合格）：
1. 每个字段单独成行；字段名后用全角冒号「：」，冒号后直接接内容，不要把多个字段挤在同一行。
2. 「上课时间：」「✨上课主题：」「🎯课程目标：」「📌 课堂情况反馈」各占独立一行。
3. 课程目标用「1、」「2、」编号（数字后是顿号「、」，不是英文点号），每条单独成行。
4. 段落之间用空行分隔：开头问候语、上课时间/主题/目标、课堂情况反馈 三大块之间各空一行。
5. 「【课程知识点】：」「【课堂表现】：」「【后续建议】：」三个小标题各占独立一行，使用全角冒号「：」。
6. 课堂表现的每一条以「· 」（间隔号 + 空格）开头，单独成行。
7. 正文中绝不出现数字题号，必须用上面给出的题目名称替换。
8. 只输出课评正文本身，不要任何解释、前言或 markdown 代码块包裹。

【参考范例】（请严格模仿它的换行与标点，不要照抄内容）：
家长您好，以下是本次课堂内容分享：

上课时间：7月21日
✨上课主题：GESP 二级 · 最大公约数与最小公倍数
🎯课程目标：
1、掌握辗转相除法求最大公约数
2、学会用公式推导最小公倍数

📌 课堂情况反馈
【课程知识点】：本节课重点训练辗转相除法的原理与实现，并延伸到最小公倍数的求解，为后续数论与递归建立操作基础。
【课堂表现】：
· 子希在《最大公约数》一题中思路清晰，能独立写出辗转相除循环，基础很扎实 👍
· 在《最小公倍数》一题中能套用公式 a*b/gcd 求解，慢慢上道了。
【后续建议】：建议写完代码先用样例跑一遍验证边界，遇到死循环时用 cout 打印中间变量自行定位。

现在请严格按上述格式输出本次课评正文：`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const response = await chatStream(
      [
        { role: 'system', content: '你是一位温和、专业、善于鼓励的少儿编程老师，面向家长写课堂反馈。你必须严格遵守用户给出的输出格式：每个字段单独成行、使用全角冒号、课程目标用「1、」「2、」编号、段落之间空行分隔。' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.7, max_tokens: 1200 }
    );
    relaySSE(response.data, res);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: 'AI 服务暂时不可用' })}\n\n`);
    res.end();
  }
});

// 保存课评到学生历史记录
router.post('/save', auth, requireTeacher, (req, res) => {
  const { student_id, date, topic, problem_ids, performance, content } = req.body;
  if (!student_id || !content) {
    return res.status(400).json({ error: '请先选择学生并生成课评' });
  }
  const student = getOwnedStudent(req.user, student_id);
  if (!student) return res.status(403).json({ error: '学生不存在或无权限' });
  const result = db
    .prepare(
      'INSERT INTO feedback_records (teacher_id, student_id, date, topic, problem_ids, performance, content) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(req.user.id, student_id, date || '', topic || '', problem_ids || '', performance || '', content);
  res.json({ id: Number(result.lastInsertRowid), message: '已保存到历史记录' });
});

// 获取某学生的历史课评
router.get('/history', auth, requireTeacher, (req, res) => {
  const { student_id } = req.query;
  if (!student_id) return res.status(400).json({ error: '缺少 student_id' });
  const student = getOwnedStudent(req.user, student_id);
  if (!student) return res.status(403).json({ error: '学生不存在或无权限' });
  const records = db
    .prepare(
      'SELECT fr.*, u.name AS teacher_name FROM feedback_records fr JOIN users u ON fr.teacher_id = u.id WHERE fr.student_id = ? ORDER BY fr.created_at DESC, fr.id DESC'
    )
    .all(student_id);
  res.json({ student, records });
});

// 删除某条历史课评
router.delete('/history/:id', auth, requireTeacher, (req, res) => {
  const row = db.prepare('SELECT * FROM feedback_records WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '记录不存在' });
  if (!req.user.is_admin && row.teacher_id !== req.user.id) {
    return res.status(403).json({ error: '无权限删除' });
  }
  db.prepare('DELETE FROM feedback_records WHERE id = ?').run(req.params.id);
  res.json({ message: '已删除' });
});

// AI 阶段表现分析（SSE 流式）
router.post('/analyze-student', auth, requireTeacher, async (req, res) => {
  const { student_id } = req.body;
  if (!student_id) return res.status(400).json({ error: '缺少 student_id' });
  const student = getOwnedStudent(req.user, student_id);
  if (!student) return res.status(403).json({ error: '学生不存在或无权限' });
  const records = db
    .prepare('SELECT * FROM feedback_records WHERE student_id = ? ORDER BY created_at ASC, id ASC')
    .all(student_id);
  if (!records.length) return res.status(400).json({ error: '该学生还没有课评记录，无法分析' });

  const timeline = records
    .map((r, i) => `【第 ${i + 1} 次｜${r.date || (r.created_at || '').slice(5, 16)}｜主题：${r.topic || '未填写'}】\n${r.content}`)
    .join('\n\n');

  const prompt = `你是一位经验丰富的少儿编程 / 信息学奥赛（C++）老师。下面是学生「${student.name}」历次课堂反馈（课评）记录，按时间先后排列。请基于这些记录，写一段面向家长的阶段性表现分析。

学生：${student.name}${student.class_name ? `（${student.class_name}）` : ''}
共有 ${records.length} 次课评记录：

${timeline}

请按以下结构输出（简洁专业，语气鼓励，总字数控制在 400 字以内）：
1. **阶段总评**：一句话概括这段时间的整体表现。
2. **进步轨迹**：对比早期和近期课评，指出明显的进步或变化。
3. **持续薄弱点**：如果某些问题在多次课评中反复出现，请指出来。
4. **下阶段建议**：给出 2-3 条具体可操作的提升建议。

注意：只输出分析正文，不要额外前言或 markdown 代码块包裹；若记录不足以判断某项，可如实说明。`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const response = await chatStream(
      [
        { role: 'system', content: '你是一位温和、专业、善于鼓励的少儿编程老师，擅长从多次课堂反馈中总结学生的阶段性成长。' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.6, max_tokens: 1000 }
    );
    relaySSE(response.data, res);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: 'AI 服务暂时不可用' })}\n\n`);
    res.end();
  }
});

module.exports = router;
module.exports.DEFAULT_STYLE = DEFAULT_STYLE;
