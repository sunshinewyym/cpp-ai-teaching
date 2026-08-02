const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { verifyCppLocal } = require('./codeRunner');

if (spawnSync(process.env.CXX || 'g++', ['--version'], { stdio: 'ignore' }).status !== 0) {
  console.log('code runner tests skipped: g++ is not installed');
  process.exit(0);
}

(async () => {
  const passed = await verifyCppLocal(
    '#include <iostream>\nint main(){ std::cout << "ok\\n"; }',
    [{ input: '', output: 'ok' }],
  );
  assert.equal(passed.compiled, true);
  assert.equal(passed.results[0].passed, true);

  const timedOut = await verifyCppLocal('int main(){ while (true) {} }', [{ input: '', output: '' }]);
  assert.equal(timedOut.results[0].timedOut, true);

  const badCompile = await verifyCppLocal('int main( {', []);
  assert.equal(badCompile.compiled, false);
  assert.match(badCompile.compilerError, /error|错误/i);

  console.log('code runner tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
