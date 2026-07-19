const fs = require('node:fs');
const path = require('node:path');
const { chatStream } = require('../services/deepseek');

const ARTICLE_PROMPT = fs.readFileSync(
  path.join(__dirname, '../prompts/algorithmCoachArticle.md'),
  'utf8',
);

function normalizeArticleProblem(input = {}) {
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

function buildArticleMessages(input) {
  const problem = normalizeArticleProblem(input);
  return [
    { role: 'system', content: ARTICLE_PROMPT },
    {
      role: 'user',
      content: `请为下面这道题生成完整解题思路讲义。\n\n${JSON.stringify(problem)}`,
    },
  ];
}

async function createArticleStream(input) {
  return chatStream(buildArticleMessages(input), {
    temperature: 0.35,
    max_tokens: 3600,
    timeout: 60000,
  });
}

module.exports = {
  buildArticleMessages,
  createArticleStream,
  normalizeArticleProblem,
};
