const fs = require('node:fs');
const path = require('node:path');
const { chatStream } = require('../services/deepseek');

const DEBUG_PROMPT = fs.readFileSync(
  path.join(__dirname, '../prompts/debugCoach.md'),
  'utf8',
);

function normalizeDebugContext(input = {}) {
  const code = String(input.code || '').trim();
  if (!code) {
    const error = new Error('请先粘贴学生代码。');
    error.status = 400;
    throw error;
  }

  return {
    problem: String(input.problem || '未提供题目描述').slice(0, 24000),
    code: code.slice(0, 24000),
    verification: input.verification || { status: 'not_run' },
  };
}

function buildDebugMessages(input) {
  const context = normalizeDebugContext(input);
  return [
    { role: 'system', content: DEBUG_PROMPT },
    {
      role: 'user',
      content: `请根据下面的真实验证结果和学生代码生成调试讲义。\n\n${JSON.stringify(context)}`,
    },
  ];
}

function createDebugGuideStream(input) {
  return chatStream(buildDebugMessages(input), {
    temperature: 0.25,
    max_tokens: 2600,
    timeout: 60000,
  });
}

module.exports = {
  buildDebugMessages,
  createDebugGuideStream,
  normalizeDebugContext,
};
