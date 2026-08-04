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
assert.match(messages[0].content, /按需|灵活/);
assert.match(messages[0].content, /不要为了完整而手算|不要为了完整/);
assert.match(messages[1].content, /sample_failed/);
assert.match(messages[1].content, /actualOutput/);

const staticMessages = buildDebugMessages({
  code: 'int main() { return 0; }',
  verification: { mode: 'static', status: 'runner_unavailable' },
});
assert.match(staticMessages[0].content, /runner_unavailable/);
assert.match(staticMessages[1].content, /runner_unavailable/);

const appSource = fs.readFileSync(path.join(__dirname, '../../web/src/App.vue'), 'utf8');
const debugAction = appSource.match(/async function debugCodeAction\(\)[\s\S]*?\n}\n\nasync function requestDebugAnalysis/)?.[0] || '';
assert.ok(debugAction, '应能找到代码调试主流程');
assert.doesNotMatch(debugAction, /\/api\/edge-case|generate-edge-cases/);
assert.match(debugAction, /\/api\/debug-code\/verify/);
assert.match(debugAction, /runner_unavailable/);
assert.match(debugAction, /debugCanAnalyze\.value/);
assert.doesNotMatch(debugAction, /\/api\/debug-code\/(explain|hint)/);

const analysisAction = appSource.match(/async function requestDebugAnalysis\(\)[\s\S]*?\n}\n<\/script>/)?.[0] || '';
assert.ok(analysisAction, '应能找到可选 AI 分析流程');
assert.match(analysisAction, /\/api\/debug-code\/analyze/);

console.log('debug guide tests passed');
