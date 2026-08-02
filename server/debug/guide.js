const fs = require('node:fs');
const path = require('node:path');
const { chatStream } = require('../services/deepseek');

const DEBUG_PROMPT = fs.readFileSync(
  path.join(__dirname, '../prompts/debugCoach.md'),
  'utf8',
);

function compactVerification(value) {
  if (!value || typeof value !== 'object') return { status: 'not_run' };
  const compact = { ...value };
  if (compact.sample && typeof compact.sample === 'object') {
    compact.sample = { ...compact.sample };
    for (const key of ['input', 'expectedOutput', 'actualOutput', 'runtimeError']) {
      if (compact.sample[key] != null) compact.sample[key] = String(compact.sample[key]).slice(0, 3000);
    }
  }
  if (Array.isArray(compact.samples)) {
    compact.samples = compact.samples.slice(0, 3).map((sample) => ({
      input: String(sample?.input || '').slice(0, 2000),
      expectedOutput: String(sample?.expectedOutput || '').slice(0, 2000),
      actualOutput: String(sample?.actualOutput || '').slice(0, 2000),
    }));
  }
  return compact;
}

function normalizeDebugContext(input = {}) {
  const code = String(input.code || '').trim();
  const verification = compactVerification(input.verification || { status: 'not_run' });
  if (!code) {
    const error = new Error('请先粘贴学生代码。');
    error.status = 400;
    throw error;
  }

  return {
    problem: String(input.problem || '未提供题目描述').slice(0, 12000),
    code: code.slice(0, 16000),
    verification,
  };
}

function buildDebugMessages(input) {
  const context = normalizeDebugContext(input);
  const serializedContext = JSON.stringify(context).slice(0, 36000);
  return [
    { role: 'system', content: DEBUG_PROMPT },
    {
      role: 'user',
      content: `请根据下面的真实验证结果和学生代码生成调试讲义。\n\n${serializedContext}`,
    },
  ];
}

function createDebugGuideStream(input) {
  const options = {
    temperature: 0.25,
    max_tokens: Math.min(4000, Math.max(1000, Number(process.env.DEBUG_AI_MAX_TOKENS || 1600))),
    timeout: Number(process.env.DEBUG_AI_CONNECT_TIMEOUT_MS || 30000),
  };
  if (String(process.env.AI_PROVIDER || 'deepseek').toLowerCase() === 'deepseek') {
    options.thinking = { type: process.env.DEBUG_AI_THINKING || 'disabled' };
  }
  return chatStream(buildDebugMessages(input), options);
}

module.exports = {
  buildDebugMessages,
  createDebugGuideStream,
  normalizeDebugContext,
};
