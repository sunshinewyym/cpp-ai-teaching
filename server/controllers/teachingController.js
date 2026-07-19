const { chat } = require('../services/deepseek');
const { routePrompt } = require('../services/promptRouter');
const { augmentWithKnowledge } = require('../services/knowledge');
const { setupSSE, sendSSE, endSSE } = require('../utils/stream');
const { verifyCpp } = require('../services/codeRunner');
const { sanitizeChatContent } = require('./chatController');
const { createDebugGuideStream } = require('../debug/guide');

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

async function streamDebugGuide(res, context) {
  try {
    const response = await createDebugGuideStream(context);
    await new Promise((resolve) => {
      let buffer = '';
      let ended = false;
      const finish = () => {
        if (ended) return;
        ended = true;
        endSSE(res);
        resolve();
      };

      response.data.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') return finish();
          try {
            const content = JSON.parse(data).choices?.[0]?.delta?.content;
            if (content) sendSSE(res, { content: content.replace(/\$/g, '') });
          } catch {}
        }
      });
      response.data.on('end', finish);
      response.data.on('error', (error) => {
        console.error('[Debug Guide Stream]', error.message);
        sendSSE(res, { error: '调试讲义生成中断，请重新分析。' });
        finish();
      });
    });
  } catch (error) {
    console.error('[Debug Guide Error]', error.message);
    sendSSE(res, {
      error: /timeout|ECONNABORTED/i.test(`${error.code || ''} ${error.message}`)
        ? '连接 AI 超时，请重新分析。'
        : 'AI 调试讲义暂时无法生成，请稍后重试。',
    });
    endSSE(res);
  }
}

async function handleDebugCode(req, res) {
  const { code, samples = [], problem = '' } = req.body;

  if (!code) {
    return res.status(400).json({ error: '请粘贴学生 C++ 代码。' });
  }

  setupSSE(res);

  try {
    const verification = await verifyCpp(code, Array.isArray(samples) ? samples : []);

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
    sendSSE(res, { error: '代码验证失败，请检查本机 C++ 编译环境后重试。' });
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
  const prompt = `你是一位经验丰富的 C++ 竞赛调试老师。学生已经看过一份基于当前题目和代码的调试路线，但仍然无法定位问题。请沿着上一层路线给出更具体的一层提示，不要重新从头检查。

## 题目
${problem || '未提供题目描述'}

## 学生代码
\`\`\`cpp
${code.slice(0, 20000)}
\`\`\`

## 已有调试路线
${previousAdvice.slice(-6000) || '无'}

## 输出要求
- 只根据当前题目、学生代码和已有路线分析，不要假设题目中没有出现的算法或数据结构。
- 从已有路线中选择一个最可疑的变量、条件、循环或状态继续深入，不要重复上一层内容。
- 使用已有失败样例，或给一个合法小数据，连续手算 3～5 步，写清每一步的状态变化。
- 必须点名学生代码中的具体变量或表达式，并说明学生应该观察到什么现象。
- 不输出 C++ 代码块。需要引用变量或表达式时使用行内代码，只解释它应满足的关系，不写替换后的完整语句。
- 绝不能给完整程序、完整函数、main、头文件、完整输入输出框架或可直接提交的解题代码。
- 不要重写学生代码，不要直接给最终修改答案。
- 不生成边界测试点，不建议跳转到其他模块。
- 使用中文，标题为“### 更进一步”，内容具体、适合学生阅读，约 500～800 个汉字。`;

  try {
    const content = await chat([{ role: 'user', content: prompt }], {
      temperature: 0.3,
      max_tokens: 1800,
      timeout: 90000,
    });
    sendSSE(res, { content: sanitizeDebugHint(content) });
  } catch (err) {
    console.error('[Debug Hint Error]', err.message);
    sendSSE(res, { error: '进一步提示生成失败，请稍后重试。' });
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
  handleDebugCode,
  handleDebugHint,
  sanitizeDebugHint,
  sanitizeNoSolutionCode,
};
