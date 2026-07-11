const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const CXX = process.env.CXX || 'g++';
const MAX_SOURCE_LENGTH = 100000;

function runProcess(command, args, input = '', timeout = 3000) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const child = spawn(command, args, { shell: false, windowsHide: true });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeout);

    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.stdin.on('error', () => {});
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: error.message, timedOut });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
    child.stdin.end(input);
  });
}

function normalizeOutput(text) {
  return String(text || '').replace(/\r\n/g, '\n').trimEnd();
}

async function verifyCpp(code, samples = []) {
  if (code.length > MAX_SOURCE_LENGTH) {
    return { compiled: false, compilerError: '代码过长，请保留需要调试的部分后重试。' };
  }

  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cpp-ai-debug-'));
  const sourcePath = path.join(directory, 'main.cpp');
  const executablePath = path.join(directory, 'program.exe');

  try {
    await fs.writeFile(sourcePath, code, 'utf8');
    const compilation = await runProcess(CXX, ['-std=c++17', '-O2', sourcePath, '-o', executablePath], '', 10000);

    if (compilation.timedOut || compilation.code !== 0) {
      return {
        compiled: false,
        compilerError: compilation.timedOut
          ? '编译超时，请检查模板或复杂的编译配置。'
          : (compilation.stderr || '编译失败，未收到具体报错信息。'),
      };
    }

    const results = [];
    for (const [index, sample] of samples.entries()) {
      if (!sample.input) {
        results.push({ index: index + 1, skipped: true, reason: '题目未提供可运行的样例输入。' });
        continue;
      }

      const execution = await runProcess(executablePath, [], sample.input, 2000);
      const actualOutput = normalizeOutput(execution.stdout);
      const expectedOutput = normalizeOutput(sample.output);
      results.push({
        index: index + 1,
        passed: !execution.timedOut && execution.code === 0 && actualOutput === expectedOutput,
        timedOut: execution.timedOut,
        runtimeError: execution.code !== 0 ? (execution.stderr || `程序异常退出（退出码 ${execution.code}）。`) : '',
        input: sample.input,
        expectedOutput: sample.output,
        actualOutput: execution.stdout,
      });
    }

    return { compiled: true, results };
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

module.exports = { verifyCpp };
