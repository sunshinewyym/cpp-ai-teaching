const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildDebugMessages, normalizeDebugContext } = require('./guide');

const context = normalizeDebugContext({
  problem: '求一个序列的最长上升子序列长度。',
  code: 'int main() { return 0; }',
  verification: {
    status: 'sample_failed',
    sample: { input: '4\n3 1 2 4', expectedOutput: '3', actualOutput: '2' },
  },
});

assert.equal(context.verification.status, 'sample_failed');
const messages = buildDebugMessages(context);
assert.match(messages[0].content, /实际怎么走/);
assert.match(messages[0].content, /不要生成边界测试点/);
assert.match(messages[1].content, /sample_failed/);
assert.match(messages[1].content, /actualOutput/);

const appSource = fs.readFileSync(path.join(__dirname, '../../web/src/App.vue'), 'utf8');
const debugAction = appSource.match(/async function debugCodeAction\(\)[\s\S]*?\n}\n\nfunction debugHintCacheKey/)?.[0] || '';
assert.ok(debugAction, '应能找到代码调试主流程');
assert.doesNotMatch(debugAction, /\/api\/edge-case|generate-edge-cases/);

console.log('debug guide tests passed');
