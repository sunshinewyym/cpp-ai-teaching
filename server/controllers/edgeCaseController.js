const { chat } = require('../services/deepseek');
const { setupSSE, sendSSE, endSSE } = require('../utils/stream');

/**
 * POST /api/edge-case
 * Body: { problem, code? }
 * Generates 3 extreme test cases for competition training
 */
async function handleEdgeCase(req, res) {
  const { problem, code = '' } = req.body;

  if (!problem) {
    return res.status(400).json({ error: 'problem is required' });
  }

  const prompt = `你是一位资深ACM/OI竞赛出题人，擅长构造极端测试数据（hack数据）。

## 任务
针对以下题目，生成3个极端测试点，用于检验代码的健壮性。

## 题目描述
${problem}

${code ? `## 学生代码\n\`\`\`cpp\n${code}\n\`\`\`` : ''}

## 输出格式（严格按此JSON格式）
每个测试点包含：
1. **testInput**：测试输入数据
2. **expectedOutput**：期望输出
3. **failureMode**：可能的失败模式（WA/TLE/RE/MLE）
4. **reason**：为什么这个测试点会让代码出错
5. **boundaryType**：覆盖的边界类型

## 必须覆盖的边界类型（至少包含2种）
- 空输入 / 最小值（0或1）
- 极大值（接近int上限 2147483647）
- 整数溢出场景
- 链式结构（退化为链表的树）
- 极端图结构（完全图、自环、重边）
- 全相同元素
- 已排序 / 逆序输入

请输出3个测试点，每个都要有独特价值，不要重复覆盖同一种边界。`;

  setupSSE(res);

  try {
    const content = await chat([{ role: 'user', content: prompt }], {
      temperature: 0.6,
      max_tokens: 2048,
    });
    sendSSE(res, { content });
    endSSE(res);
  } catch (err) {
    console.error('[EdgeCase Error]', err.message);
    sendSSE(res, { error: err.message });
    endSSE(res);
  }
}

module.exports = { handleEdgeCase };
