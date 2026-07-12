const assert = require('node:assert/strict');
const { sanitizeDebugHint } = require('./teachingController');

const snippet = sanitizeDebugHint('### 进一步提示\n```cpp\nvector<int> dp(n + 1);\n```');
assert.match(snippet, /vector<int> dp/);

const fullProgram = sanitizeDebugHint('#include <iostream>\nint main() { std::cout << 1; }');
assert.doesNotMatch(fullProgram, /#include|main\s*\(|cout\s*<</);

console.log('debug hint policy tests passed');
