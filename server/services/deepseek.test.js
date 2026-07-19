const assert = require('node:assert/strict');
const { buildChatCompletionsUrl } = require('./deepseek');

assert.equal(
  buildChatCompletionsUrl('https://api.deepseek.com'),
  'https://api.deepseek.com/v1/chat/completions'
);
assert.equal(
  buildChatCompletionsUrl('https://token-plan-cn.xiaomimimo.com/v1/'),
  'https://token-plan-cn.xiaomimimo.com/v1/chat/completions'
);

console.log('AI provider URL tests passed.');
