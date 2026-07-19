const assert = require('node:assert/strict');
const {
  buildArticleMessages,
  normalizeArticleProblem,
} = require('./article');

const problem = normalizeArticleProblem({
  title: '最长上升子序列',
  text: '给定一个序列，求最长严格上升子序列的长度。',
  samples: [{ input: '4\n3 1 2 4', output: '3' }],
});

assert.equal(problem.title, '最长上升子序列');
assert.equal(problem.samples.length, 1);
assert.throws(() => normalizeArticleProblem({ text: '   ' }), /请先输入题目描述/);

const messages = buildArticleMessages(problem);
assert.equal(messages.length, 2);
assert.match(messages[0].content, /完整 C\+\+ 程序/);
assert.match(messages[0].content, /跟着一个例子走完/);
assert.match(messages[1].content, /最长上升子序列/);

console.log('algorithm coach article tests passed');
