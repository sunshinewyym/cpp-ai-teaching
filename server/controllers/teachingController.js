const { chat } = require('../services/deepseek');
const { routePrompt } = require('../services/promptRouter');
const { augmentWithKnowledge } = require('../services/knowledge');
const { setupSSE, sendSSE, endSSE } = require('../utils/stream');
const { verifyCpp } = require('../services/codeRunner');
const { sanitizeChatContent } = require('./chatController');

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
  const { courseTopic, count = 10 } = req.body;

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
6. 只输出合法 JSON，不要输出 Markdown、代码块或额外说明
7. 题干或选项需要展示 C++ 代码时，在对应字符串中使用 \`\`\`cpp 和 \`\`\` 包裹代码；保留换行和缩进，JSON 中换行必须写成 \n

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

  await streamResponse(res, prompt, 0.5, 4096);
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

/**
 * POST /api/debug-code
 * Analyze and debug C++ code
 */
async function handleDebugCodeLegacy(req, res) {
  const { code, problem = '', errorMessage = '' } = req.body;

  if (!code) {
    return res.status(400).json({ error: '请粘贴学生 C++ 代码。' });
  }

  const prompt = `你是一位 C++ 代码调试专家。请分析以下代码，引导学生定位并修改问题。

## 学生代码
\`\`\`cpp
${code}
\`\`\`

${problem ? `## 题目要求\n${problem}\n` : ''}
${errorMessage ? `## 错误信息\n${errorMessage}\n` : ''}

## 分析要求
1. **语法错误**：编译能否通过
2. **逻辑错误**：算法是否正确
3. **边界问题**：数组越界、溢出等
4. **效率问题**：是否会出现 TLE
5. **代码风格**：可读性建议

## 输出格式
### 🔍 问题诊断
（列出所有发现的问题）

### ✅ 修复方案
（给出排查顺序和修改方向，不提供完整解题代码）

### 💡 学习建议
（给学生的改进建议）

请分析：`;

  await streamResponse(res, prompt, 0.4, 3000);
}

function buildNoRunnableSampleGuide(problem) {
  const manualTrace = '先准备一个最小的手工过程：每进入一层时记录「当前层数」「准备尝试的选择」「已保存的状态」，每返回一层时再检查这些状态是否恢复。';

  if (/\u516b\u7687\u540e|\u7687\u540e|\u68cb\u76d8/.test(problem)) {
    return `### 无输入回溯题调试清单\n\n这道题没有可运行的样例输入，不能自动对拍。${manualTrace}\n\n请按下面顺序逐项核对：\n\n1. **递归终点**：放完第 8 个皇后后，是记录一个完整答案，还是又继续进入下一层？\n2. **冲突判断**：每次尝试新位置时，是否和所有已经放好的皇后都比较了行、列和两条对角线？\n3. **回溯还原**：一次尝试结束返回上一层后，棋盘或标记数组是否恢复到了尝试前的状态？\n4. **搜索范围**：每一层是否把本层所有可选位置都尝试过，而不是提前跳过或重复尝试？\n5. **输出检查**：答案编号、每行的空格、换行以及解的顺序是否与题目示例一致？\n\n建议先在纸上只跟踪前两层递归，不要一次观察整棵搜索树。这里不会直接给出错误位置或解题代码。`;
  }

  if (/\u9012\u5f52|\u56de\u6eaf|\u5168\u6392\u5217|\u7ec4\u5408/.test(problem)) {
    return `### 无输入递归题调试清单\n\n这道题没有可运行的样例输入，不能自动对拍。${manualTrace}\n\n依次检查：递归终点是否恰好记录一次结果；每层的候选是否完整遍历；返回上一层时的数组、标记或计数器是否恢复；输出顺序和格式是否严格符合题意。\n\n这里不会直接给出错误位置或解题代码。`;
  }

  return `### 编译通过，但无法自动运行样例\n\n这道题没有提供可运行的样例输入，因此无法进行自动对拍。${manualTrace}\n\n请先用一组很小的数据或手算过程，逐步记录关键变量的变化；再检查循环或递归的起点、终点、每次变化以及输出格式是否符合题意。\n\n这里不会直接给出解题代码或错误位置。`;
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
      sendSSE(res, { content: `### 样例 ${failed.index} 未通过\n\n**样例输入：**\n\`\`\`text\n${failed.input}\n\`\`\`\n\n**期望输出：**\n\`\`\`text\n${failed.expectedOutput}\n\`\`\`\n\n**你的输出：**\n\`\`\`text\n${failed.actualOutput || '（没有输出）'}\n\`\`\`\n\n${runtime}\n\n请不要急着重写：先用这组数据逐步记录关键变量的变化，再检查输入、循环次数和输出格式是否与题意一致。\n\n可以按顺序自问：循环的起点、结束条件和每次变化是否都符合题意？每个等号是在保存新值，还是在进行条件判断？输出的时机和格式是否与样例一致？\n\n这里不会直接指出哪一行需要修改，也不会提供解题代码。` });
      return endSSE(res);
    }

    if (!runnable.length) {
      sendSSE(res, { content: buildNoRunnableSampleGuide(problem) });
      return endSSE(res);
    }

    const skipped = verification.results.filter((item) => item.skipped).length;
    sendSSE(res, {
      content: `### 样例验证通过\n\n已通过 ${runnable.length} 个可运行样例，正在生成边界测试点继续验证。`,
      nextAction: 'generate-edge-cases',
    });
    endSSE(res);
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
  return `### 进一步提示

这次回答包含了过多实现细节，已被系统拦截。请先锁定一个最小测试数据，逐步记录循环变量、数组下标和关键状态的变化，再检查它们第一次偏离预期的位置。`;
}

async function handleDebugHint(req, res) {
  const { code, problem = '', previousAdvice = '', edgeCases = [] } = req.body;
  if (!code) return res.status(400).json({ error: '请先粘贴学生代码。' });

  setupSSE(res);
  const prompt = `你是一位耐心但不会直接给答案的 C++ 竞赛调试老师。学生已经看过第一轮提示，但仍然无法定位问题。请给出比上一轮更具体的第二层提示。

## 题目
${problem || '未提供题目描述'}

## 学生代码
\`\`\`cpp
${code.slice(0, 20000)}
\`\`\`

## 第一轮提示
${previousAdvice.slice(-6000) || '无'}

## 已生成的边界测试点
${JSON.stringify(Array.isArray(edgeCases) ? edgeCases.slice(0, 4) : []).slice(0, 5000)}

## 输出要求
- 只根据题目、学生代码和已有提示分析，不要假设题目中没有出现的算法或数据结构。
- 指出最值得追踪的变量、条件、循环或状态，以及为什么值得检查。
- 给一个很小的手算数据，告诉学生每一步应该记录什么，不直接说出最终错误位置。
- 可以给伪代码或关键定义语句，但代码块最多 8 行。
- 绝不能给完整程序、完整函数、main、头文件、完整输入输出框架或可直接提交的解题代码。
- 不要重写学生代码，不要直接给最终修改答案。
- 使用中文，标题为“### 进一步提示”，内容简洁、具体、适合学生阅读。`;

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
