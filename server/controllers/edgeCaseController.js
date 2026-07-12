const { chat } = require('../services/deepseek');
const { setupSSE, sendSSE, endSSE } = require('../utils/stream');
const axios = require('axios');

/**
 * POST /api/edge-case
 * Body: { problem, code? }
 * Generates 3 extreme test cases for competition training
 */
async function handleEdgeCase(req, res) {
  const { problem, code = '' } = req.body;

  if (!problem) {
    return res.status(400).json({ error: '请输入题目描述。' });
  }

  const prompt = `你是一位 C++ 竞赛教学老师，擅长根据题目数据范围设计边界测试点。

## 任务
针对以下题目，生成 4 个边界测试点。这里的边界测试点指：
- 数据范围的最小值、最大值
- 特殊值，例如 0、1、空、只有一个元素
- 题意相关的特殊数据，例如 LIS 中全相同数组、严格递增、严格递减；图论中的孤点、重边、自环；迷宫中的不可达、起点等于终点
- 样例能过但隐藏测试容易错的情况：等号边界（刚好等于限制值）、重复值、多个最优答案、无解/不可达、顺序反转、所有值相同、只差 1 的临界值、输入规模达到上限但结构很特殊

## 题目描述
${problem}

${code ? `## 学生代码\n\`\`\`cpp\n${code}\n\`\`\`` : ''}

只输出合法 JSON，不要 Markdown，不要代码块。格式如下：
{
  "cases": [
    {
      "title": "测试点名称",
      "boundaryType": "覆盖的边界类型",
      "testInput": "完整测试输入",
      "expectedOutput": "完整测试输出。如果题目复杂无法确定，请写「需按题意/标程计算」",
      "reason": "为什么这个测试点重要"
    }
  ]
}

要求：
- testInput 必须符合题目输入格式。
- expectedOutput 能算就算出来，不要故意留空。
- 每个测试点覆盖不同边界，不要重复。
- 优先选择最可能导致「样例通过，提交显示解答错误」的测试点。
- testInput 和 expectedOutput 必须是 JSON 字符串，换行写成 \\n；必须填写具体可运行的数据。
- 严禁在 JSON 中出现 std::string(...)、变量、表达式、+ 拼接、省略号或「请自行计算」。
- 每个 testInput 最多 500 个字符。若最大数据规模无法完整列出，改用不超过 20 个元素的具体数据复现同类边界结构，不要生成超长数组。
- 只生成数据边界，不要讨论 WA/TLE/RE/MLE。`;

  setupSSE(res);

  try {
    let parsed = null;
    for (let attempt = 0; attempt < 2 && !parsed; attempt += 1) {
      try {
        const messages = attempt === 0
          ? [{ role: 'user', content: prompt }]
          : [
              {
                role: 'system',
                content: '请从头重写为合法 JSON。只输出 JSON 对象，不要 Markdown、代码块、表达式、省略号或“请自行计算”。至少输出 2 个、最多输出 4 个 cases；每个 testInput 和 expectedOutput 都必须是可以直接运行或直接核对的具体字符串，不能使用变量、拼接或 std::string(...)。规模上限过大时，用不超过 20 个元素的小数据复现同类边界；换行写成 \\n。',
              },
              { role: 'user', content: prompt },
            ];
        const content = await chat(messages, { temperature: 0.1, max_tokens: 3072, timeout: 90000 });
        parsed = parseJsonCandidate(content);
      } catch (err) {
        console.warn(`[EdgeCase Attempt ${attempt + 1}]`, err.message);
      }
    }
    if (!parsed) {
      sendSSE(res, { error: '边界测试点生成结果不完整，请重试。' });
      return endSSE(res);
    }
    sendSSE(res, { content: JSON.stringify(parsed) });
    endSSE(res);
  } catch (err) {
    console.error('[EdgeCase Error]', err.message);
    sendSSE(res, { error: err.message });
    endSSE(res);
  }
}

function parseJsonCandidate(content) {
  let cleaned = String(content || '').trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  if (!cleaned.startsWith('{') && cleaned.includes('"cases"')) cleaned = `{${cleaned}}`;
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    const cases = Array.isArray(parsed) ? parsed : parsed?.cases;
    if (!Array.isArray(cases)) return null;

    // 一个模型卡牌不合格时，不应让整批结果全部丢失。
    const validCases = cases
      .map(normalizeCase)
      .filter(isConcreteCase)
      .slice(0, 4);
    return validCases.length ? { cases: validCases } : null;
  } catch (err) {
    return null;
  }
}

function normalizeCase(item) {
  if (!item || typeof item !== 'object') return null;
  return {
    ...item,
    title: item.title == null ? '' : String(item.title),
    boundaryType: item.boundaryType == null ? '特殊数据' : String(item.boundaryType),
    testInput: item.testInput == null ? '' : String(item.testInput),
    expectedOutput: item.expectedOutput == null ? '' : String(item.expectedOutput),
    reason: item.reason == null ? '' : String(item.reason),
  };
}

function isConcreteCase(item) {
  if (!item || typeof item.testInput !== 'string' || typeof item.expectedOutput !== 'string') return false;
  if (!item.testInput.trim() || !item.expectedOutput.trim()) return false;
  if (item.testInput.length > 500) return false;
  return !/(std::string\s*\(|\bstring\s*\(|\.\.\.|请自行计算|\+\s*(?:std::|[A-Za-z_]))/.test(
    `${item.testInput}\n${item.expectedOutput}`,
  );
}

async function handleFetchProblem(req, res) {
  const { id } = req.params;
  if (!/^\d{4}$/.test(id)) {
    return res.status(400).json({ error: '题号必须是 4 位数字。' });
  }

  try {
    const url = `https://oj.czos.cn/p/${id}`;
    const resp = await axios.get(url, {
      timeout: 10000,
      responseType: 'text',
      responseEncoding: 'utf-8',
      headers: { 'User-Agent': 'cpp-ai-teaching/1.0' },
    });

    const problem = parseCzosProblem(resp.data, id, url);
    if (!problem.description) {
      return res.status(404).json({ error: '未能解析题目描述。' });
    }
    res.json(problem);
  } catch (err) {
    console.error('[Fetch Problem Error]', err.message);
    res.status(502).json({ error: '获取题目失败，请检查题号或稍后重试。' });
  }
}

function parseCzosProblem(html, id, url) {
  const title = stripHtml(matchOne(html, /<h3>\s*<b>([\s\S]*?)<\/b>\s*<\/h3>/)) || `${id} 题`;
  const sections = {};
  let sampleHtml = '';
  const re = /<div class="content-header">\s*<span>\s*([^<]+)[\s\S]*?<\/div>\s*<div class="content-wrapper">([\s\S]*?)(?=<div class="content-header">|<div class="col-md-3|<\/div>\s*<\/div>\s*<\/div>)/g;
  let m;
  while ((m = re.exec(html))) {
    const name = stripHtml(m[1]).replace(/\s+/g, '');
    sections[name] = htmlToText(m[2]);
    if (name === '样例') sampleHtml = m[2];
  }

  const description = [
    `标题：${title}`,
    sections['题目描述'] && `\n【题目描述】\n${sections['题目描述']}`,
    sections['输入'] && `\n【输入】\n${sections['输入']}`,
    sections['输出'] && `\n【输出】\n${sections['输出']}`,
    sections['样例'] && `\n【样例】\n${sections['样例']}`,
    sections['提示'] && `\n【提示】\n${sections['提示']}`,
  ].filter(Boolean).join('\n');

  return { id, title, url, description, samples: parseSamples(sampleHtml) };
}

function parseSamples(html) {
  const source = String(html || '');
  const samples = [];
  const pairRe = /<div class="input">[\s\S]*?<pre[^>]*>([\s\S]*?)<\/pre>[\s\S]*?<div class="output">[\s\S]*?<pre[^>]*>([\s\S]*?)<\/pre>/gi;
  let pair;

  while ((pair = pairRe.exec(source))) {
    samples.push({
      index: samples.length + 1,
      input: cleanSampleText(pair[1]),
      output: cleanSampleText(pair[2]),
    });
  }

  if (samples.length) return samples;

  return source
    .split(/<div class="sample-test">/i)
    .slice(1)
    .map((block, index) => ({
      index: index + 1,
      input: extractSampleValue(block, 'input'),
      output: extractSampleValue(block, 'output'),
    }))
    .filter((sample) => sample.input || sample.output);
}

function extractSampleValue(html, className) {
  const match = String(html).match(new RegExp(`<div class="${className}">[\\s\\S]*?<pre[^>]*>([\\s\\S]*?)<\\/pre>`, 'i'));
  return match ? cleanSampleText(match[1]) : '';
}

function cleanSampleText(html) {
  return decodeHtml(String(html).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).trim();
}

function matchOne(text, re) {
  const m = text.match(re);
  return m ? m[1] : '';
}

function htmlToText(html) {
  const withMath = html.replace(
    /<span class="katex math (inline|display)">([\s\S]*?)<\/span>/gi,
    (_, type, content) => {
      const text = formatMathText(stripHtml(content));
      return type === 'display' ? `\n${text}\n` : text;
    }
  );

  return stripHtml(withMath
    .replace(/<pre[^>]*>/gi, '\n')
    .replace(/<\/pre>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h4>/gi, '\n'));
}

function stripHtml(text) {
  return decodeHtml(String(text || '').replace(/<[^>]+>/g, ' '))
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function decodeHtml(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function formatMathText(text) {
  return text
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\le/g, '≤')
    .replace(/\\ge/g, '≥')
    .replace(/\\lt/g, '<')
    .replace(/\\gt/g, '>')
    .replace(/\\neq/g, '≠')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\infty/g, '∞')
    .replace(/\\log/g, 'log')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { handleEdgeCase, handleFetchProblem };
