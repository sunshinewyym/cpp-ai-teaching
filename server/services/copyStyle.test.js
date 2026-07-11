const assert = require('node:assert/strict');
const { COPY_STYLE_PROMPT, applyCopyStyle } = require('./copyStyle');

const original = [{ role: 'user', content: '解释 BFS' }];
const withNewSystemMessage = applyCopyStyle(original);

assert.equal(withNewSystemMessage[0].role, 'system');
assert.equal(withNewSystemMessage[0].content, COPY_STYLE_PROMPT);
assert.deepEqual(original, [{ role: 'user', content: '解释 BFS' }]);

const withExistingSystemMessage = applyCopyStyle([
  { role: 'system', content: '你是一名 C++ 教师。' },
  { role: 'user', content: '解释递归。' },
]);

assert.match(withExistingSystemMessage[0].content, /你是一名 C\+\+ 教师。/);
assert.match(withExistingSystemMessage[0].content, /## 英荔文案风格规范/);

const appliedTwice = applyCopyStyle(withExistingSystemMessage);
const markerCount = appliedTwice[0].content.match(/## 英荔文案风格规范/g)?.length || 0;
assert.equal(markerCount, 1);

console.log('copy-style tests passed');
