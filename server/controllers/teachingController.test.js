const assert = require('node:assert/strict');
const { normalizeDebugAnalysis, sanitizeDebugHint } = require('./teachingController');

const snippet = sanitizeDebugHint('### 进一步提示\n```cpp\nvector<int> dp(n + 1);\n```');
assert.match(snippet, /vector<int> dp/);

const fullProgram = sanitizeDebugHint('#include <iostream>\nint main() { std::cout << 1; }');
assert.doesNotMatch(fullProgram, /#include|main\s*\(|cout\s*<</);

const ready = normalizeDebugAnalysis({ content: '## 调试路线', finishReason: 'stop', model: 'test-model' });
assert.equal(ready.ok, true);
assert.equal(ready.status, 'ready');
assert.equal(ready.content, '## 调试路线');

const truncated = normalizeDebugAnalysis({ content: '', finishReason: 'length' });
assert.equal(truncated.ok, false);
assert.equal(truncated.status, 'truncated');
assert.equal(truncated.retryable, true);
assert.match(truncated.message, /预算|重试/);

console.log('debug hint policy tests passed');
