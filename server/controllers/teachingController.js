const { StringDecoder } = require('node:string_decoder');
const { randomUUID } = require('node:crypto');
const { chat, chatWithMeta } = require('../services/deepseek');
const { routePrompt } = require('../services/promptRouter');
const { augmentWithKnowledge } = require('../services/knowledge');
const { setupSSE, sendSSE, endSSE } = require('../utils/stream');
const { verifyCpp, formatRunnerError } = require('../services/codeRunner');
const { sanitizeChatContent } = require('./chatController');
const { createDebugGuideStream, buildDebugMessages } = require('../debug/guide');

const DEBUG_AI_TOTAL_TIMEOUT_MS = Number(process.env.DEBUG_AI_TOTAL_TIMEOUT_MS || 60000);
const DEBUG_AI_IDLE_TIMEOUT_MS = Number(process.env.DEBUG_AI_IDLE_TIMEOUT_MS || 20000);

function createRequestAbortSignal(req, res) {
  const controller = new AbortController();
  let cleaned = false;
  const abort = () => {
    if (!res.writableEnded) controller.abort();
  };
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    req.off('aborted', abort);
    res.off('close', abort);
    res.off('finish', cleanup);
  };
  req.once('aborted', abort);
  res.once('close', abort);
  res.once('finish', cleanup);
  return {
    signal: controller.signal,
    cleanup,
  };
}

/**
 * POST /api/generate-example
 * Generate a CSP-style example problem
 */
async function handleGenerateExample(req, res) {
  const { courseTopic, difficulty = 'CSP-J', count = 1 } = req.body;

  if (!courseTopic) {
    return res.status(400).json({ error: '请输入课程主题。' });
  }

  const prompt = `你是一位 CSP 竞赛出题专家。请为「${courseTopic}」生成 ${count} 道 ${difficulty} 风格的例题。

## 要求
1. 题目描述完整（输入格式、输出格式、样例）
2. 难度适中，适合课堂教学
3. 配有详细题解
4. 标注考察知识点

## 输出格式
### 题目 X：标题
**题目描述**：填写完整题目描述
**输入格式**：填写输入格式
**输出格式**：填写输出格式
**样例输入**：
**样例输出**：
**数据范围**：填写数据范围
**考察知识点**：填写考察知识点
**题解**：（思路 + C++代码）

请出题：`;

  await streamResponse(res, prompt, 0.7, 4096);
}

/**
 * POST /api/generate-exercise
 * Generate practice exercises
 */
async function handleGenerateExercise(req, res) {
  const { courseTopic, count = 10, excludeQuestions = [] } = req.body;

  if (!courseTopic) {
    return res.status(400).json({ error: '请输入课程主题。' });
  }

  const prompt = `请围绕「${courseTopic}」生成 ${count} 道 C++/算法单项选择题。

## 要求
1. 适合六年级、初中生
2. 由浅入深排列
3. 每题 4 个选项，只有 1 个正确答案
4. 每题必须给出简短解析
5. 题目尽量贴近「${courseTopic}」的核心概念、易错点、实际代码判断
6. 如果提供了“不要重复的题目”，新题必须换一个考点或问法，不要改几个字后重复生成
7. 只输出合法 JSON，不要输出 Markdown、代码块或额外说明
8. 题干或选项需要展示 C++ 代码时，在对应字符串中使用 \`\`\`cpp 和 \`\`\` 包裹代码；保留换行和缩进，JSON 中换行必须写成 \n

## 不要重复的题目
${Array.isArray(excludeQuestions) ? excludeQuestions.slice(0, 12).map((item, index) => `${index + 1}. ${String(item).slice(0, 600)}`).join('\n') : '无'}

JSON 格式：
{
  "title": "${courseTopic} 选择题自测",
  "questions": [
    {
      "id": 1,
      "question": "题干",
      "options": [
        { "id": "A", "text": "选项A" },
        { "id": "B", "text": "选项B" },
        { "id": "C", "text": "选项C" },
        { "id": "D", "text": "选项D" }
      ],
      "correctAnswer": "A",
      "explanation": "解析"
    }
  ]
}

请出题：`;

  await streamResponse(res, prompt, 0.5, count > 1 ? 6000 : 1800);
}

/**
 * POST /api/generate-script
 * Generate a teaching script/lecture notes
 */
async function handleGenerateScript(req, res) {
  const { courseTopic, duration = 135 } = req.body;

  if (!courseTopic) {
    return res.status(400).json({ error: '请输入课程主题。' });
  }

  const systemPrompt = augmentWithKnowledge(routePrompt(courseTopic), courseTopic);

  const prompt = `请为「${courseTopic}」设计一份 ${duration} 分钟的课堂讲稿。

## 要求
1. 面向 10～18 岁学生，兼顾小学高年级、初中和高中学生的理解能力
2. 总课时为 135 分钟，包含：导入（10 分钟）→ 新课讲授（50 分钟）→ 分组练习与互动（50 分钟）→ 总结与测评（25 分钟）
3. 每个环节标注时间
4. 包含板书设计
5. 包含互动环节
6. 语言口语化，适合课堂讲授

## 输出格式
### 📋 课程基本信息
### 🎬 导入环节（X 分钟）
### 📖 新课讲授（X 分钟）
### ✏️ 课堂练习（X 分钟）
### 📝 课堂总结（X 分钟）

请设计讲稿：`;

  await streamResponse(res, prompt, 0.7, 4096, systemPrompt);
}

function sanitizeNoSolutionCode(content, title = '### 思路提示') {
  const sanitized = sanitizeChatContent(String(content || ''));
  const looksLikeSolution = /#include|using\s+namespace|\bmain\s*\(|\b(?:void|int|long\s+long|auto)\s+\w+\s*\([^)]*\)\s*\{|\bcin\s*>>|\bcout\s*<</.test(sanitized);
  if (!looksLikeSolution) return sanitized;
  return `${title}

这次回答包含了过多实现细节，系统已拦截。请先按下面的顺序思考：

1. 题目要我们求什么？答案是一个数、一个序列，还是判断结果？
2. 输入规模决定能不能暴力枚举。先估算最慢的做法会跑多少步。
3. 找一个最小样例，手算每一步状态变化。
4. 写出关键状态或关键变量，不要急着写完整程序。
5. 最后只把核心转移、判断条件或循环范围补进自己的代码。`;
}

async function handleGenerateHint(req, res) {
  const { problem } = req.body;

  if (!problem) {
    return res.status(400).json({ error: '请先输入题目描述。' });
  }

  setupSSE(res);

  const prompt = `你是一位 C++ 竞赛课老师。请根据下面的题目，给学生生成“思路提示”，帮助学生自己想出解法。

## 题目
${String(problem).slice(0, 20000)}

## 输出要求
- 面向 10～18 岁学生，语言清楚、自然、具体。
- 不要给完整 C++ 代码，不要给 main、头文件、完整输入输出框架，也不要给可直接提交的函数。
- 可以给不超过 8 行伪代码，或 1～3 行关键定义语句。
- 不要直接替学生写最终答案，要用引导式提示。
- 重点说明：读题抓手、如何建模、关键状态/变量、核心转移或核心判断、手算小样例、易错提醒。
- 如果题目适合多种做法，优先给最适合课堂讲解和学生实现的做法，再简单提一句替代思路。
- 使用 Markdown，按下面结构输出：

### 读题先抓什么
### 可以怎么建模
### 关键变量或状态
### 核心思路
### 伪代码提示
### 手算一个小例子
### 易错提醒`;

  try {
    const content = await chat([{ role: 'user', content: prompt }], {
      temperature: 0.35,
      max_tokens: 2600,
      timeout: 90000,
    });
    sendSSE(res, { content: sanitizeNoSolutionCode(content) });
  } catch (err) {
    console.error('[Generate Hint Error]', err.message);
    sendSSE(res, { error: '思路提示生成失败，请稍后重试。' });
  }
  endSSE(res);
}

async function streamDebugGuide(res, context, req = null) {
  req = req || res.req || null;
  const requestId = randomUUID();
  const startedAt = Date.now();
  let upstream;
  let ended = false;
  let idleTimer;
  let totalTimer;
  let heartbeat;
  let buffer = '';
  let resolveStream;
  const decoder = new StringDecoder('utf8');

  const finish = (errorMessage = '') => {
    if (ended) return;
    ended = true;
    clearTimeout(idleTimer);
    clearTimeout(totalTimer);
    clearInterval(heartbeat);
    if (errorMessage && !res.writableEnded) sendSSE(res, { error: errorMessage });
    endSSE(res);
    console.info(`[Debug Guide] ${requestId} status=${errorMessage ? 'failed' : 'completed'} durationMs=${Date.now() - startedAt}`);
    if (resolveStream) resolveStream();
  };

  const touchIdleTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (upstream) upstream.destroy(new Error('AI response idle timeout'));
      finish('AI 长时间没有返回内容，请稍后重试。');
    }, DEBUG_AI_IDLE_TIMEOUT_MS);
  };

  const onClientClose = () => {
    if (ended || res.writableEnded) return;
    ended = true;
    clearTimeout(idleTimer);
    clearTimeout(totalTimer);
    clearInterval(heartbeat);
    if (upstream) upstream.destroy();
    if (resolveStream) resolveStream();
  };
  res.once('close', onClientClose);

  const consume = (flush = false) => {
    const lines = buffer.split('\n');
    buffer = flush ? '' : (lines.pop() || '');
    for (const rawLine of lines) {
      const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      if (data === '[DONE]') {
        finish();
        return true;
      }
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content && !ended) sendSSE(res, { content: content.replace(/\$/g, '') });
      } catch (error) {
        console.warn(`[Debug Guide Parse] ${requestId}:`, error.message);
      }
    }
    return false;
  };

  try {
    sendSSE(res, { type: 'status', status: 'ai_started', requestId });
    const response = await createDebugGuideStream(context);
    upstream = response.data;
    touchIdleTimer();
    totalTimer = setTimeout(() => {
      if (upstream) upstream.destroy(new Error('AI response timeout'));
      finish('AI 讲解生成超时，本地验证结果已保留。');
    }, DEBUG_AI_TOTAL_TIMEOUT_MS);
    heartbeat = setInterval(() => {
      if (!ended && !res.writableEnded) sendSSE(res, { type: 'heartbeat' });
    }, 10000);

    await new Promise((resolve) => {
      resolveStream = resolve;
      upstream.on('data', (chunk) => {
        touchIdleTimer();
        buffer += decoder.write(chunk);
        if (consume() && ended) resolve();
      });
      upstream.on('end', () => {
        buffer += decoder.end();
        consume(true);
        finish();
        resolve();
      });
      upstream.on('error', (error) => {
        if (!ended) {
          console.error(`[Debug Guide Stream] ${requestId}:`, error.message);
          finish('AI 讲解生成中断，本地验证结果已保留。');
        }
        resolve();
      });
    });
  } catch (error) {
    console.error(`[Debug Guide Error] ${requestId}:`, error.message);
    finish(/timeout|ECONNABORTED/i.test(`${error.code || ''} ${error.message}`)
      ? '连接 AI 超时，本地验证结果已保留。'
      : 'AI 调试讲义暂时无法生成，本地验证结果已保留。');
  } finally {
    res.off('close', onClientClose);
  }
}

function getDebugAiErrorMessage(error) {
  const status = error?.response?.status;
  if (status === 401 || status === 403) return 'AI 服务鉴权失败，请检查模型服务配置。';
  if (status === 429) return 'AI 服务当前请求较多，请稍后重试。';
  if (error?.code === 'ECONNABORTED' || /timeout|超时/i.test(String(error?.message || ''))) {
    return 'AI 分析超时，本地验证结果已保留。';
  }
  return 'AI 分析暂时不可用，本地验证结果已保留。';
}

function normalizeDebugAnalysis(meta = {}) {
  const content = sanitizeDebugHint(meta.content).trim();
  if (content) {
    return {
      ok: true,
      status: 'ready',
      content,
      model: meta.model || null,
      finishReason: meta.finishReason || null,
    };
  }

  const truncated = meta.finishReason === 'length';
  return {
    ok: false,
    status: truncated ? 'truncated' : 'empty',
    message: truncated
      ? 'AI 在本次分析预算内没有生成可展示的结论，请重试或更换适合短文本的模型。'
      : 'AI 没有返回可展示的分析，本地验证结果不受影响。',
    retryable: true,
    model: meta.model || null,
    finishReason: meta.finishReason || null,
  };
}

async function generateDebugAnalysis({ code, problem = '', verification, signal }) {
  const options = {
    temperature: 0.25,
    // ponytail: one bounded AI call; local verification remains the fallback.
    max_tokens: Math.min(4000, Math.max(1000, Number(process.env.DEBUG_AI_MAX_TOKENS || 1600))),
    timeout: Number(process.env.DEBUG_AI_TIMEOUT_MS || 60000),
    signal,
  };
  if (String(process.env.AI_PROVIDER || 'deepseek').toLowerCase() === 'deepseek') {
    options.thinking = { type: process.env.DEBUG_AI_THINKING || 'disabled' };
  }
  if (process.env.DEBUG_AI_MODEL) options.model = process.env.DEBUG_AI_MODEL;

  const meta = await chatWithMeta(
    buildDebugMessages({ code, problem, verification: verification || { status: 'not_run' } }),
    options,
  );
  return normalizeDebugAnalysis(meta);
}

async function handleDebugAnalyze(req, res) {
  const { code, problem = '', verification } = req.body || {};
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: '请粘贴学生 C++ 代码。' });
  }

  const requestId = randomUUID();
  const startedAt = Date.now();
  const request = createRequestAbortSignal(req, res);
  try {
    const analysis = await generateDebugAnalysis({
      code,
      problem,
      verification,
      signal: request.signal,
    });
    console.info(`[Debug AI] ${requestId} status=${analysis.status} finish=${analysis.finishReason || 'none'} durationMs=${Date.now() - startedAt}`);
    if (!res.writableEnded && !res.destroyed) res.json({ ...analysis, requestId });
  } catch (error) {
    console.error(`[Debug AI Error] ${requestId}:`, error.message);
    if (!res.writableEnded && !res.destroyed) {
      res.json({
        ok: false,
        status: 'unavailable',
        message: getDebugAiErrorMessage(error),
        retryable: true,
        requestId,
      });
    }
  } finally {
    request.cleanup();
  }
}

async function handleDebugVerify(req, res) {
  const { code, samples = [] } = req.body || {};
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: '请粘贴学生 C++ 代码。' });
  }

  const requestId = randomUUID();
  const startedAt = Date.now();
  const request = createRequestAbortSignal(req, res);
  try {
    const verification = await verifyCpp(code, Array.isArray(samples) ? samples : [], { signal: request.signal });
    console.info(`[Debug Verify] ${requestId} runner=${verification.runner || 'unknown'} compiled=${Boolean(verification.compiled)} durationMs=${Date.now() - startedAt}`);
    if (!res.writableEnded) res.json({ ...verification, requestId });
  } catch (error) {
    console.error(`[Debug Verify Error] ${requestId}:`, error.message);
    if (!res.writableEnded) res.status(503).json({ error: formatRunnerError(error), requestId });
  } finally {
    request.cleanup();
  }
}

async function handleDebugExplain(req, res) {
  const { code, problem = '', verification } = req.body || {};
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: '请粘贴学生 C++ 代码。' });
  }

  setupSSE(res);
  const request = createRequestAbortSignal(req, res);
  try {
    const analysis = await generateDebugAnalysis({
      code,
      problem,
      verification,
      signal: request.signal,
    });
    sendSSE(res, analysis);
  } catch (error) {
    sendSSE(res, {
      ok: false,
      status: 'unavailable',
      message: getDebugAiErrorMessage(error),
      retryable: true,
    });
  } finally {
    endSSE(res);
    request.cleanup();
  }
}

async function handleDebugCode(req, res) {
  const { code, samples = [], problem = '' } = req.body;

  if (!code) {
    return res.status(400).json({ error: '请粘贴学生 C++ 代码。' });
  }

  setupSSE(res);
  const request = createRequestAbortSignal(req, res);

  try {
    const verification = await verifyCpp(code, Array.isArray(samples) ? samples : [], { signal: request.signal });

    if (!verification.compiled) {
      sendSSE(res, { content: `### 编译未通过\n\n编译器报错如下，请先根据**第一条报错**检查括号、分号、变量名和类型是否一致。\n\n\`\`\`text\n${verification.compilerError}\n\`\`\`\n\n修改后再点击「分析代码」。这里不会提供改好的代码。` });
      return endSSE(res);
    }

    const runnable = verification.results.filter((item) => !item.skipped);
    const failed = runnable.find((item) => !item.passed);

    if (failed) {
      const runtime = failed.timedOut
        ? '程序运行超时。请手动跟踪循环或递归是否能停下来。'
        : (failed.runtimeError || '输出与期望输出不同。');
      sendSSE(res, { content: `## 本地验证结果\n\n### 样例 ${failed.index} 未通过\n\n**样例输入：**\n\`\`\`text\n${failed.input}\n\`\`\`\n\n**期望输出：**\n\`\`\`text\n${failed.expectedOutput}\n\`\`\`\n\n**你的输出：**\n\`\`\`text\n${failed.actualOutput || '（没有输出）'}\n\`\`\`\n\n${runtime}\n\n---\n\n` });
      return streamDebugGuide(res, {
        code,
        problem,
        verification: {
          status: failed.timedOut ? 'sample_timeout' : 'sample_failed',
          sample: {
            index: failed.index,
            input: failed.input,
            expectedOutput: failed.expectedOutput,
            actualOutput: failed.actualOutput,
            runtimeError: failed.runtimeError,
          },
        },
      });
    }

    if (!runnable.length) {
      sendSSE(res, { content: '## 本地验证结果\n\n### 编译通过，但没有可运行样例\n\n题面没有提供可自动运行的样例输入。下面会直接结合题意和代码，用一组合法小数据整理调试路线。\n\n---\n\n' });
      return streamDebugGuide(res, {
        code,
        problem,
        verification: { status: 'no_runnable_samples' },
      });
    }

    const skipped = verification.results.filter((item) => item.skipped).length;
    sendSSE(res, { content: `## 本地验证结果\n\n### 样例验证通过\n\n已通过 ${runnable.length} 个可运行样例${skipped ? `，另有 ${skipped} 个样例因缺少输入而跳过` : ''}。下面会直接比较题目要求和代码中的假设，继续整理调试路线。\n\n---\n\n` });
    return streamDebugGuide(res, {
      code,
      problem,
      verification: {
        status: 'samples_passed',
        runnableCount: runnable.length,
        skippedCount: skipped,
        samples: runnable.slice(0, 3).map((item) => ({
          input: item.input,
          expectedOutput: item.expectedOutput,
          actualOutput: item.actualOutput,
        })),
      },
    });
  } catch (err) {
    console.error('[Debug Verify Error]', err.message);
    sendSSE(res, { error: formatRunnerError(err) });
    endSSE(res);
  }
}

function sanitizeDebugHint(content) {
  const sanitized = sanitizeChatContent(String(content || ''));
  const looksLikeSolution = /#include|using\s+namespace|\bmain\s*\(|\b(?:void|int|long\s+long|auto)\s+\w+\s*\([^)]*\)\s*\{|\bcin\s*>>|\bcout\s*<</.test(sanitized);
  if (!looksLikeSolution) return sanitized;
  return `### 更进一步

这次生成的内容包含了可直接使用的完整实现，系统已经隐藏。请继续沿上一层调试路线，只追踪其中最可疑的变量或条件：把失败样例逐步代入，记录它每次变化后的值，找到它第一次与题意不一致的时刻。`;
}

async function handleDebugHint(req, res) {
  const { code, problem = '', previousAdvice = '' } = req.body;
  if (!code) return res.status(400).json({ error: '请先粘贴学生代码。' });

  setupSSE(res);
  const request = createRequestAbortSignal(req, res);
  try {
    const analysis = await generateDebugAnalysis({
      code,
      problem,
      verification: {
        status: 'follow_up',
        previousAdvice: String(previousAdvice || '').slice(-6000),
      },
      signal: request.signal,
    });
    sendSSE(res, analysis);
  } catch (err) {
    console.error('[Debug Hint Error]', err.message);
    sendSSE(res, {
      ok: false,
      status: 'unavailable',
      message: getDebugAiErrorMessage(err),
      retryable: true,
    });
  } finally {
    request.cleanup();
  }
  endSSE(res);
}

/**
 * Helper: streaming response
 */
async function streamResponse(res, userPrompt, temperature = 0.7, maxTokens = 2048, systemOverride = null) {
  const systemPrompt = systemOverride || `你是一位专业的 C++ 编程教师，擅长少儿编程教育。回答使用中文，代码使用 C++。`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  setupSSE(res);

  try {
    const { chatStream } = require('../services/deepseek');
    const response = await chatStream(messages, { temperature, max_tokens: maxTokens });
    const stream = response.data;

    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            endSSE(res);
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              sendSSE(res, { content });
            }
          } catch (e) {}
        }
      }
    });

    stream.on('end', () => endSSE(res));
    stream.on('error', (err) => {
      sendSSE(res, { error: err.message });
      endSSE(res);
    });
  } catch (err) {
    sendSSE(res, { error: err.message });
    endSSE(res);
  }
}

module.exports = {
  handleGenerateExample,
  handleGenerateExercise,
  handleGenerateScript,
  handleGenerateHint,
  handleDebugVerify,
  handleDebugAnalyze,
  handleDebugExplain,
  handleDebugCode,
  handleDebugHint,
  normalizeDebugAnalysis,
  sanitizeDebugHint,
  sanitizeNoSolutionCode,
};
