const { chat } = require('../services/deepseek');
const { BUILTIN_PROBLEMS, fetchProblem, compileAndRun, runSamples } = require('../services/ojService');
const { setupSSE, sendSSE, endSSE } = require('../utils/stream');

const MAX_CODE_LENGTH = 10000;

// 系统开关状态
let systemEnabled = true;

/**
 * GET /api/oj/problems — 内置题目列表
 */
function handleProblems(req, res) {
  res.json({ problems: BUILTIN_PROBLEMS, system_enabled: systemEnabled });
}

/**
 * GET /api/oj/problem/:id — 抓取 OJ 题目
 */
async function handleGetProblem(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: '题号不能为空' });

  const problem = await fetchProblem(id);
  if (problem.error) {
    return res.status(problem.status || 500).json({ error: problem.error });
  }
  res.json(problem);
}

/**
 * POST /api/oj/submit — 提交代码：编译 + 样例测试 + AI 分析
 * Body: { problem_id, code }
 * SSE streaming
 */
async function handleSubmit(req, res) {
  const { problem_id, code } = req.body;

  if (!code) return res.status(400).json({ error: '请先输入代码' });
  if (code.length > MAX_CODE_LENGTH) return res.status(400).json({ error: '代码长度超过限制（10000字符）' });
  if (!systemEnabled) return res.status(403).json({ error: '系统当前未开放，请等待老师开放后使用', system_disabled: true });

  setupSSE(res);

  try {
    // 1. 获取题目
    let problem = null;
    if (problem_id) {
      problem = await fetchProblem(problem_id);
      if (problem.error) problem = null;
    }

    // 2. 编译并运行样例
    sendSSE(res, { type: 'status', message: '编译中...' });
    let sampleResults = null;
    let compileResult = null;

    if (problem && problem.samples && problem.samples.length > 0) {
      sampleResults = await runSamples(code, problem.samples);
      compileResult = {
        compile_success: sampleResults.results[0]?.status !== 'compile_error',
        compile_output: sampleResults.results[0]?.status === 'compile_error' ? sampleResults.results[0].message : '',
      };
    } else {
      // 没有样例，只编译
      compileResult = await compileAndRun(code, '');
      sampleResults = { results: [], all_pass: false, message: '无样例可测试' };
    }

    sendSSE(res, { type: 'compile', ...compileResult, sample_results: sampleResults });

    // 3. AI 分析
    sendSSE(res, { type: 'status', message: 'AI 分析中...' });

    const systemPrompt = `你是一位经验丰富且耐心的 C++ 编程教师，你的学生是中学生（初中到高中生），正在学习 C++ 编程。

你的任务是根据题目描述、学生代码和编译结果，给出分析。必须严格遵守以下规则：

## 输出格式（严格按此结构，用 Markdown）

### 关键错误（1–3 个）
只列出最可能导致当前结果的问题，按严重程度排序。每条错误用一句话概括。

### 错误定位与解释
对每个关键错误：
- 说明错误大概在代码的**哪一行或哪几行**
- 用通俗的语言解释**为什么错**

### 修改建议
对每个关键错误给出具体的修改方向：
- 给出**关键代码行的修改建议**（几行代码片段即可）
- 简要解释修改的**思路**
- **不要直接给出完整代码**，要给学生留有思考空间

### 小结
用一句鼓励性的话收尾。

## 语气要求
- 像面对面和学生讲解一样，用鼓励、友好的语气
- 避免说"你这里写错了"，改为"这里可以再想想，目前的问题是……"
- 适合中学生的理解水平，避免过于专业的术语`;

    let userPrompt = `请分析以下 C++ 代码：\n\n`;
    if (problem) {
      userPrompt += `【题目 #${problem.id}】\n${problem.description || '（未获取到题目描述）'}\n\n`;
    }
    userPrompt += `【编译结果】${compileResult.compile_success ? '编译成功' : '编译失败'}\n${compileResult.compile_output || ''}\n\n`;
    if (sampleResults && sampleResults.results.length > 0) {
      userPrompt += `【样例测试】${sampleResults.message}\n`;
      for (const r of sampleResults.results) {
        if (r.status !== 'compile_error') {
          userPrompt += `样例${r.index + 1}: ${r.message}`;
          if (r.status === 'fail') {
            userPrompt += ` (期望: ${r.expected.slice(0, 50)}, 实际: ${r.actual.slice(0, 50)})`;
          }
          userPrompt += '\n';
        }
      }
      userPrompt += '\n';
    }
    userPrompt += `【学生代码】\n\`\`\`cpp\n${code}\n\`\`\`\n\n请按照要求给出详细分析。`;

    const aiResult = await chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.3, max_tokens: 2000 });

    sendSSE(res, { type: 'analysis', content: aiResult });
    sendSSE(res, { type: 'complete' });
    endSSE(res);
  } catch (err) {
    console.error('[OJ Submit Error]', err.message);
    sendSSE(res, { type: 'error', error: err.message });
    endSSE(res);
  }
}

/**
 * POST /api/oj/hint — 思路提示
 * Body: { problem_id }
 */
async function handleHint(req, res) {
  const { problem_id } = req.body;
  if (!problem_id) return res.status(400).json({ error: '请提供题号' });
  if (!systemEnabled) return res.status(403).json({ error: '系统当前未开放', system_disabled: true });

  setupSSE(res);

  try {
    const problem = await fetchProblem(problem_id);
    if (problem.error) {
      sendSSE(res, { type: 'error', error: problem.error });
      return endSSE(res);
    }

    const systemPrompt = `你是一位经验丰富的 C++ 编程教师，你的学生是中学生。

学生正在做一道编程题，请给出解题思路提示。必须严格遵守以下规则：

## 输出格式（Markdown）

### 题目理解
用一两句话概括这道题在问什么，帮助学生确认自己是否读懂了题。

### 思路引导
分步骤引导学生思考：
1. 先问一个关键问题（不要直接给答案）
2. 给出思考方向
3. 再进一步提示

### 涉及知识点
列出这道题涉及的知识点，用 2-3 句话简要说明。

### 伪代码参考
用简洁的伪代码描述算法流程。
- 使用自然语言混合简单控制结构的写法
- 不要用 C++ 具体语法，不要写头文件和 main 函数

## 严格禁止
- 绝对不能给出完整 C++ 代码
- 不能给出具体的函数名、变量名让学生直接抄
- "思路引导"部分只能给方向性提示，不能直接给答案

## 语气要求
- 像面对面引导学生一样，循循善诱
- 鼓励式语气，适合中学生的理解水平`;

    const userPrompt = `请为以下题目给出解题思路提示：\n\n【题目 #${problem.id}】\n${problem.description}`;

    const hint = await chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.4, max_tokens: 1500 });

    sendSSE(res, { type: 'hint', content: hint });
    sendSSE(res, { type: 'complete' });
    endSSE(res);
  } catch (err) {
    console.error('[OJ Hint Error]', err.message);
    sendSSE(res, { type: 'error', error: err.message });
    endSSE(res);
  }
}

/**
 * POST /api/oj/debug-hint — 调试引导
 * Body: { problem_id?, code, compile_output? }
 */
async function handleDebugHint(req, res) {
  const { problem_id, code, compile_output } = req.body;
  if (!code) return res.status(400).json({ error: '请先输入代码' });
  if (!systemEnabled) return res.status(403).json({ error: '系统当前未开放', system_disabled: true });

  setupSSE(res);

  try {
    let problemDesc = '（未获取到题目描述）';
    if (problem_id) {
      const problem = await fetchProblem(problem_id);
      if (!problem.error) problemDesc = problem.description;
    }

    const hasCompileError = compile_output && (compile_output.includes('error:') || compile_output.includes('错误'));

    const systemPrompt = `你是一位经验丰富的 C++ 编程教师，你的学生是中学生，正在学习调试代码。

学生提交了一段 C++ 代码，可能有编译错误或逻辑错误。你的任务是引导学生**自己调试**，而不是直接告诉他们答案。

## 输出格式（严格按此结构，用 Markdown）

### 先检查一下
用 1-2 句话，提醒学生调试前先做哪件最关键的事。

### 调试方向
给出 2-3 个具体的调试步骤，每一步格式如下：
- **步骤描述**：告诉学生在哪里加调试输出，或者检查什么
- 给出 1-2 行具体的 \`cout\` 打印语句（只是示意，不要修正他们的逻辑）
- 解释：加了这个打印后，学生应该观察什么

### 思考问题
提出 1-2 个引导性问题，让学生思考（不要给答案）。

## 严格禁止
- 不能直接说"第 X 行有错误"或"你的 XXX 写错了"
- 不能给出修改后的代码
- 不能直接说出错误原因
- 只能给出观察方向和调试方法

## 语气要求
- 像侦探一样引导学生"追踪"问题
- 轻松鼓励，不要让学生觉得被批评`;

    let userPrompt = `请给这位同学调试建议，引导他自己找问题：\n\n`;
    userPrompt += `【题目】\n${problemDesc}\n\n`;

    if (hasCompileError) {
      userPrompt += `【编译输出（有错误）】\n${compile_output}\n\n注意：这是编译错误，请引导学生看编译错误信息，理解错误类型。\n\n`;
    } else {
      userPrompt += `【编译状态】编译成功，但可能存在逻辑错误\n\n注意：代码能编译，重点引导学生通过打印中间变量来检查逻辑。\n\n`;
    }

    userPrompt += `【学生代码】\n\`\`\`cpp\n${code}\n\`\`\`\n\n请按照要求给出调试引导，记住：不要直接说出错误，只给调试方向！`;

    const hint = await chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.4, max_tokens: 1200 });

    sendSSE(res, { type: 'debug_hint', content: hint });
    sendSSE(res, { type: 'complete' });
    endSSE(res);
  } catch (err) {
    console.error('[OJ DebugHint Error]', err.message);
    sendSSE(res, { type: 'error', error: err.message });
    endSSE(res);
  }
}

/**
 * POST /api/oj/switch — 系统开关
 * Body: { enabled }
 */
function handleSwitch(req, res) {
  const { enabled } = req.body;
  systemEnabled = !!enabled;
  res.json({ system_enabled: systemEnabled });
}

module.exports = {
  handleProblems,
  handleGetProblem,
  handleSubmit,
  handleHint,
  handleDebugHint,
  handleSwitch,
};
