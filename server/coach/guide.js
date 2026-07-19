const fs = require('node:fs');
const path = require('node:path');
const { jsonrepair } = require('jsonrepair');
const { chat } = require('../services/deepseek');
const { analyzeProblem } = require('./engine');

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, '../prompts/algorithmCoachGuide.md'),
  'utf8',
);

const SECTION_KINDS = [
  'problem_picture',
  'key_insight',
  'method',
  'walkthrough',
  'implementation_review',
];

const GUIDE_SCHEMA = {
  headline: '贴合题目的讲义标题',
  lead: '用大白话概括这道题和最关键的突破口',
  core: '一句话说清本题的核心矛盾和方法方向',
  sections: SECTION_KINDS.map((kind) => ({
    kind,
    title: '本节标题',
    summary: '本节 1～2 个短段落，用换行分隔',
  })),
  method_steps: [{ title: '步骤名', detail: '具体动作、原因和结果' }],
  walkthrough: {
    label: '例子名称',
    input: '例子数据',
    steps: ['第 1 步', '第 2 步', '第 3 步'],
    result: '推演结果以及它验证了什么',
  },
  implementation_snippet: '不超过 8 行的局部伪代码，可留空',
  checkpoint: {
    question: '只检查最关键关系的 1 个问题',
    choices: [
      { id: 'A', text: '选项 A' },
      { id: 'B', text: '选项 B' },
      { id: 'C', text: '选项 C' },
    ],
    answer: 'A',
    explanation: '为什么这个选项正确，以及其他思路错在哪里',
  },
};

function normalizeProblem(input = {}) {
  const problem = typeof input === 'string' ? { text: input } : input;
  const text = String(problem.text || problem.description || '').trim();
  if (!text) {
    const error = new Error('请先输入题目描述。');
    error.status = 400;
    throw error;
  }
  return {
    title: String(problem.title || '算法题').trim(),
    text: text.slice(0, 24000),
    constraints: String(problem.constraints || '').trim().slice(0, 4000),
    samples: Array.isArray(problem.samples) ? problem.samples.slice(0, 5) : [],
  };
}

function parseJsonCandidate(raw) {
  const source = String(raw || '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    return JSON.parse(source);
  } catch {
    const start = source.indexOf('{');
    const end = source.lastIndexOf('}');
    if (start >= 0) {
      const candidate = end > start ? source.slice(start, end + 1) : source.slice(start);
      try {
        return JSON.parse(candidate);
      } catch {
        return JSON.parse(jsonrepair(candidate));
      }
    }
    throw new Error('模型没有返回可解析的讲义。');
  }
}

function cleanText(value) {
  return String(value || '')
    .replace(/\$+/g, '')
    .replace(/\\(?:\(|\)|\[|\])/g, '')
    .replace(/\\leq?/g, '≤')
    .replace(/\\geq?/g, '≥')
    .replace(/\\times/g, '×')
    .replace(/```(?:cpp|c\+\+|text|pseudo)?/gi, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeGuide(raw) {
  return {
    headline: cleanText(raw.headline),
    lead: cleanText(raw.lead),
    core: cleanText(raw.core),
    sections: Array.isArray(raw.sections) ? raw.sections.map((section) => ({
      kind: String(section.kind || ''),
      title: cleanText(section.title),
      summary: cleanText(section.summary),
      steps: Array.isArray(section.steps) ? section.steps.slice(0, 6).map((step) => ({
        title: cleanText(step.title),
        detail: cleanText(step.detail),
      })) : (section.kind === 'method' && Array.isArray(raw.method_steps)
        ? raw.method_steps.slice(0, 6).map((step) => ({
          title: cleanText(step.title),
          detail: cleanText(step.detail),
        }))
        : []),
      example: section.example ? {
        label: cleanText(section.example.label),
        input: cleanText(section.example.input),
        walkthrough: Array.isArray(section.example.walkthrough)
          ? section.example.walkthrough.slice(0, 6).map(cleanText)
          : [],
        result: cleanText(section.example.result),
      } : (section.kind === 'walkthrough' && raw.walkthrough ? {
        label: cleanText(raw.walkthrough.label),
        input: cleanText(raw.walkthrough.input),
        walkthrough: Array.isArray(raw.walkthrough.steps)
          ? raw.walkthrough.steps.slice(0, 6).map(cleanText)
          : [],
        result: cleanText(raw.walkthrough.result),
      } : null),
      snippet: cleanText(section.snippet || (section.kind === 'implementation_review'
        ? raw.implementation_snippet
        : '')),
      note: cleanText(section.note),
    })) : [],
    checkpoint: {
      question: cleanText(raw.checkpoint?.question),
      choices: Array.isArray(raw.checkpoint?.choices)
        ? raw.checkpoint.choices.slice(0, 3).map((choice, index) => ({
          id: String.fromCharCode(65 + index),
          text: cleanText(choice.text),
        }))
        : [],
      answer: String(raw.checkpoint?.answer || '').trim().toUpperCase(),
      explanation: cleanText(raw.checkpoint?.explanation),
    },
  };
}

function guideText(guide) {
  return [
    guide.headline,
    guide.lead,
    guide.core,
    ...guide.sections.flatMap((section) => [
      section.title,
      section.summary,
      ...section.steps.flatMap((step) => [step.title, step.detail]),
      section.example?.label,
      section.example?.input,
      ...(section.example?.walkthrough || []),
      section.example?.result,
      section.snippet,
      section.note,
    ]),
    guide.checkpoint.question,
    ...guide.checkpoint.choices.map((choice) => choice.text),
    guide.checkpoint.explanation,
  ].filter(Boolean).join('\n');
}

function validateGuide(guide) {
  const errors = [];
  if (!guide.headline || !guide.lead || !guide.core) errors.push('讲义开头不完整');
  if (guide.sections.length !== SECTION_KINDS.length) errors.push('讲义章节数量不正确');
  if (guide.sections.some((section, index) => section.kind !== SECTION_KINDS[index])) {
    errors.push('讲义章节顺序不正确');
  }
  for (const section of guide.sections) {
    if (!section.title || section.summary.length < 35) errors.push(`${section.kind} 内容过少`);
    if (section.steps.some((step) => !step.title || !step.detail)) errors.push(`${section.kind} 步骤不完整`);
  }
  const walkthrough = guide.sections.find((section) => section.kind === 'walkthrough');
  if (!walkthrough?.example || walkthrough.example.walkthrough.length < 3 || !walkthrough.example.result) {
    errors.push('缺少完整的样例推演');
  }
  const implementation = guide.sections.find((section) => section.kind === 'implementation_review');
  if ((implementation?.snippet.split('\n').filter(Boolean).length || 0) > 8) errors.push('伪代码超过 8 行');
  if (!guide.checkpoint.question || guide.checkpoint.choices.length !== 3) errors.push('小检验不完整');
  if (!guide.checkpoint.choices.some((choice) => choice.id === guide.checkpoint.answer)) errors.push('小检验答案无效');
  if (!guide.checkpoint.explanation) errors.push('小检验缺少解析');
  return [...new Set(errors)];
}

function guardGuide(guide, analysis) {
  const text = guideText(guide);
  const risks = [];
  if (text.length < 900) risks.push('内容过于精简');
  if (/#include|using\s+namespace|\bmain\s*\(|\bcin\s*>>|\bcout\s*<<|```/.test(text)) risks.push('包含完整代码');
  if (/\$|\\(?:frac|sqrt|log|theta|alpha|beta)\b/i.test(text)) risks.push('包含未清理的数学标记');
  if (/先观察关系|拆成小问题|复用旧结果|检查条件|保存局部结果/.test(text)) risks.push('包含空泛模板');
  const normalizedText = text.toLowerCase().replace(/[\s，。！？、；：,.!?;:「」『』（）()\[\]]/g, '');
  const anchors = (analysis.grounding_anchors || []).filter((anchor) => {
    const key = String(anchor).toLowerCase().replace(/[\s，。！？、；：,.!?;:「」『』（）()\[\]]/g, '');
    return key.length >= 2 && normalizedText.includes(key);
  });
  if ((analysis.grounding_anchors || []).length >= 4 && anchors.length < 3) risks.push('没有紧扣当前题目');
  return { pass: risks.length === 0, risk_types: risks };
}

function composeMessages(problem, analysis, issues = []) {
  const payload = {
    problem,
    problem_profile: {
      topic: analysis.topic,
      difficulty: analysis.difficulty,
      problem_terms: (analysis.grounding_anchors || []).slice(0, 18),
      immutable_facts: (analysis.immutable_facts || []).slice(0, 12),
    },
    quality_contract: {
      minimum_body_length: 900,
      requirement: '每一章都要说明当前题目的具体对象、动作和因果关系。首章必须让学生立即知道从哪里下手。',
      rejected_previous_issues: issues,
    },
    response_shape: GUIDE_SCHEMA,
  };
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(payload) },
  ];
}

async function generateGuide(input, options = {}) {
  const problem = normalizeProblem(input);
  const analysis = analyzeProblem(problem);
  const model = options.model || chat;
  const startedAt = Date.now();
  try {
    const raw = await model(composeMessages(problem, analysis), {
      temperature: 0.3,
      max_tokens: 3000,
      timeout: 45000,
      response_format: { type: 'json_object' },
    });
    const guide = normalizeGuide(parseJsonCandidate(raw));
    const validation = validateGuide(guide);
    const guard = guardGuide(guide, analysis);
    const issues = [...new Set([...validation, ...guard.risk_types])];
    console.info(`[Coach Guide] 生成耗时 ${Date.now() - startedAt} ms`);
    if (!issues.length) return { guide };
    console.warn(`[Coach Guide] 内容被拦截：${issues.join('；')}`);
    const error = new Error(`生成内容未通过质量检查：${issues.join('、')}`);
    error.status = 503;
    error.publicMessage = '这次生成的内容不够贴合题目，请重新生成一次。';
    throw error;
  } catch (error) {
    if (error.status) throw error;
    console.error(`[Coach Guide] 生成中断，耗时 ${Date.now() - startedAt} ms：${error.message}`);
    const wrapped = new Error(error.message);
    wrapped.status = 503;
    wrapped.publicMessage = /timeout|ECONNABORTED/i.test(`${error.code || ''} ${error.message}`)
      ? '生成超过 45 秒，已自动停止。请重新生成一次。'
      : '算法教练连接 AI 失败，请稍后重试。';
    throw wrapped;
  }
}

module.exports = {
  SECTION_KINDS,
  composeMessages,
  generateGuide,
  guardGuide,
  normalizeGuide,
  parseJsonCandidate,
  validateGuide,
};
