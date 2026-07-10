const { chat } = require('../services/deepseek');
const { routePrompt } = require('../services/promptRouter');
const { augmentWithKnowledge } = require('../services/knowledge');
const { setupSSE, sendSSE, endSSE } = require('../utils/stream');

/**
 * POST /api/generate-example
 * Generate a CSP-style example problem
 */
async function handleGenerateExample(req, res) {
  const { courseTopic, difficulty = 'CSP-J', count = 1 } = req.body;

  if (!courseTopic) {
    return res.status(400).json({ error: 'courseTopic is required' });
  }

  const prompt = `你是一位CSP竞赛出题专家。请为"${courseTopic}"生成${count}道${difficulty}风格的例题。

## 要求
1. 题目描述完整（输入格式、输出格式、样例）
2. 难度适中，适合课堂教学
3. 配有详细题解
4. 标注考察知识点

## 输出格式
### 题目X：标题
**题目描述**：...
**输入格式**：...
**输出格式**：...
**样例输入**：
**样例输出**：
**数据范围**：...
**考察知识点**：...
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
    return res.status(400).json({ error: 'courseTopic is required' });
  }

  const prompt = `请围绕"${courseTopic}"生成${count}道 C++ / 算法单项选择题。

## 要求
1. 适合六年级、初中生
2. 由浅入深排列
3. 每题 4 个选项，只有 1 个正确答案
4. 每题必须给出简短解析
5. 题目尽量贴近"${courseTopic}"的核心概念、易错点、实际代码判断
6. 只输出合法 JSON，不要 markdown，不要代码块，不要额外说明
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
  const { courseTopic, duration = 45, level = 'beginner' } = req.body;

  if (!courseTopic) {
    return res.status(400).json({ error: 'courseTopic is required' });
  }

  const systemPrompt = augmentWithKnowledge(routePrompt(courseTopic), courseTopic);

  const prompt = `请为"${courseTopic}"设计一份${duration}分钟的课堂讲稿。

## 要求
1. 面向${level === 'beginner' ? '零基础' : '有基础'}学生
2. 包含：导入（5分钟）→ 新课（25分钟）→ 练习（10分钟）→ 总结（5分钟）
3. 每个环节标注时间
4. 包含板书设计
5. 包含互动环节
6. 语言口语化，适合课堂讲授

## 输出格式
### 📋 课程基本信息
### 🎬 导入环节（X分钟）
### 📖 新课讲授（X分钟）
### ✏️ 课堂练习（X分钟）
### 📝 课堂总结（X分钟）

请设计讲稿：`;

  await streamResponse(res, prompt, 0.7, 4096, systemPrompt);
}

/**
 * POST /api/debug-code
 * Analyze and debug C++ code
 */
async function handleDebugCode(req, res) {
  const { code, problem = '', errorMessage = '' } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'code is required' });
  }

  const prompt = `你是一位C++代码调试专家。请分析以下代码，找出错误并给出修复方案。

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
4. **效率问题**：是否TLE
5. **代码风格**：可读性建议

## 输出格式
### 🔍 问题诊断
（列出所有发现的问题）

### ✅ 修复方案
（给出修改后的完整代码，带注释说明修改了什么）

### 💡 学习建议
（给学生的改进建议）

请分析：`;

  await streamResponse(res, prompt, 0.4, 3000);
}

/**
 * Helper: streaming response
 */
async function streamResponse(res, userPrompt, temperature = 0.7, maxTokens = 2048, systemOverride = null) {
  const systemPrompt = systemOverride || `你是一位专业的C++编程教师，擅长少儿编程教育。回答使用中文，代码用C++。`;

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
  handleDebugCode,
};
