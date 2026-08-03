const fs = require('fs/promises');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

const CXX = process.env.CXX || 'g++';
const DEFAULT_RUNNER_MODE = process.env.NODE_ENV === 'production' ? 'runner' : 'local';
const RUNNER_MODE = String(process.env.CODE_RUNNER_MODE || DEFAULT_RUNNER_MODE).toLowerCase();
const RUNNER_SOCKET_PATH = process.env.RUNNER_SOCKET_PATH || '/run/cpp-runner/runner.sock';

const MAX_SOURCE_LENGTH = Number(process.env.DEBUG_MAX_SOURCE_LENGTH || 64 * 1024);
const MAX_INPUT_LENGTH = Number(process.env.DEBUG_MAX_INPUT_LENGTH || 64 * 1024);
const MAX_SAMPLES = Number(process.env.DEBUG_MAX_SAMPLES || 3);
const MAX_OUTPUT_BYTES = Number(process.env.DEBUG_MAX_OUTPUT_BYTES || 256 * 1024);
const COMPILE_TIMEOUT_MS = Number(process.env.DEBUG_COMPILE_TIMEOUT_MS || 8000);
const RUN_TIMEOUT_MS = Number(process.env.DEBUG_RUN_TIMEOUT_MS || 2000);
const RUNNER_REQUEST_TIMEOUT_MS = Number(process.env.DEBUG_RUNNER_TIMEOUT_MS || 20000);
const VERIFY_CACHE_TTL_MS = Number(process.env.DEBUG_VERIFY_CACHE_TTL_MS || 60000);
const VERIFY_CACHE_MAX = Number(process.env.DEBUG_VERIFY_CACHE_MAX || 100);
const verifyCache = new Map();

function cloneResult(value) {
  return JSON.parse(JSON.stringify(value));
}

function verifyCacheKey(code, samples) {
  return crypto.createHash('sha256')
    .update(JSON.stringify([code, normalizeSamples(samples)]))
    .digest('hex');
}

function killProcessTree(child) {
  if (!child?.pid) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
    });
    killer.on('error', () => {});
  } else {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      try { child.kill('SIGKILL'); } catch {}
    }
  }
}

function runProcess(command, args, input = '', options = {}) {
  const timeoutMs = options.timeoutMs ?? 3000;
  const maxOutputBytes = options.maxOutputBytes ?? MAX_OUTPUT_BYTES;
  const signal = options.signal;

  return new Promise((resolve) => {
    let stdoutBytes = 0;
    let stderrBytes = 0;
    const stdoutChunks = [];
    const stderrChunks = [];
    let timedOut = false;
    let outputLimitExceeded = false;
    let processErrorCode = '';
    let settled = false;
    let timer;

    const child = spawn(command, args, {
      shell: false,
      windowsHide: true,
      detached: process.platform !== 'win32',
      cwd: options.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const cleanupSignal = () => {
      if (signal) signal.removeEventListener('abort', abort);
      clearTimeout(timer);
    };

    const finish = (code, error = '') => {
      if (settled) return;
      settled = true;
      cleanupSignal();
      resolve({
        code,
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8') || error,
        timedOut,
        outputLimitExceeded,
        errorCode: processErrorCode,
      });
    };

    const stop = (reason) => {
      if (reason === 'timeout' || reason === 'aborted') timedOut = reason === 'timeout';
      if (reason === 'output_limit') outputLimitExceeded = true;
      killProcessTree(child);
    };

    const appendOutput = (target, chunk, currentBytes) => {
      const remaining = maxOutputBytes - currentBytes;
      if (remaining <= 0) {
        stop('output_limit');
        return currentBytes;
      }
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      const accepted = buffer.length > remaining ? buffer.subarray(0, remaining) : buffer;
      target.push(accepted);
      const nextBytes = currentBytes + accepted.length;
      if (accepted.length < buffer.length) stop('output_limit');
      return nextBytes;
    };

    const abort = () => stop('aborted');
    if (signal?.aborted) {
      stop('aborted');
    } else if (signal) {
      signal.addEventListener('abort', abort, { once: true });
    }

    timer = setTimeout(() => stop('timeout'), timeoutMs);
    child.stdout.on('data', (chunk) => {
      stdoutBytes = appendOutput(stdoutChunks, chunk, stdoutBytes);
    });
    child.stderr.on('data', (chunk) => {
      stderrBytes = appendOutput(stderrChunks, chunk, stderrBytes);
    });
    child.stdin.on('error', () => {});
    child.on('error', (error) => {
      processErrorCode = error.code || '';
      finish(-1, error.message);
    });
    child.on('close', (code) => finish(code, ''));

    try {
      child.stdin.end(input);
    } catch (error) {
      stop('aborted');
      finish(-1, error.message);
    }
  });
}

function normalizeOutput(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trimEnd();
}

function normalizeSamples(samples) {
  if (!Array.isArray(samples)) return [];
  return samples.slice(0, MAX_SAMPLES).map((sample) => ({
    input: String(sample?.input ?? ''),
    output: String(sample?.output ?? ''),
  }));
}

async function verifyCppLocal(code, samples = [], options = {}) {
  const source = String(code || '');
  if (source.length > MAX_SOURCE_LENGTH) {
    return {
      runner: 'local',
      compiled: false,
      compilerError: `代码长度超过 ${MAX_SOURCE_LENGTH} 个字符，请保留需要调试的部分后重试。`,
    };
  }

  const normalizedSamples = normalizeSamples(samples);
  if (normalizedSamples.some((sample) => sample.input.length > MAX_INPUT_LENGTH)) {
    return {
      runner: 'local',
      compiled: false,
      compilerError: `样例输入不能超过 ${MAX_INPUT_LENGTH} 个字符。`,
    };
  }

  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cpp-ai-debug-'));
  const sourcePath = path.join(directory, 'main.cpp');
  const executablePath = path.join(directory, process.platform === 'win32' ? 'program.exe' : 'program');

  try {
    await fs.writeFile(sourcePath, source, 'utf8');
    const compilation = await runProcess(
      CXX,
      ['-std=c++17', '-O0', '-pipe', sourcePath, '-o', executablePath],
      '',
      { timeoutMs: COMPILE_TIMEOUT_MS, maxOutputBytes: MAX_OUTPUT_BYTES, signal: options.signal },
    );

    if (compilation.timedOut || compilation.code !== 0 || compilation.outputLimitExceeded) {
      const compilerUnavailable = compilation.errorCode === 'ENOENT';
      return {
        runner: 'local',
        compiled: false,
        timedOut: compilation.timedOut,
        compilerError: compilation.outputLimitExceeded
          ? `编译器输出超过 ${MAX_OUTPUT_BYTES} 字节，已停止本次编译。`
          : (compilation.timedOut
            ? `编译超过 ${COMPILE_TIMEOUT_MS / 1000} 秒，已停止本次编译。`
            : (compilerUnavailable
              ? `服务器未找到 C++ 编译器“${CXX}”。生产环境请启用 runner 模式并确认 runner 容器健康；若使用本地模式，请安装 g++ 并设置 CXX。`
              : (compilation.stderr || '编译失败，未收到具体报错信息。'))),
      };
    }

    const results = [];
    let stoppedAfterFailure = false;
    for (const [index, sample] of normalizedSamples.entries()) {
      if (stoppedAfterFailure) {
        results.push({ index: index + 1, skipped: true, reason: '前一个样例已经失败，已停止后续执行。' });
        continue;
      }

      const execution = await runProcess(
        executablePath,
        [],
        sample.input,
        { timeoutMs: RUN_TIMEOUT_MS, maxOutputBytes: MAX_OUTPUT_BYTES, signal: options.signal },
      );
      const actualOutput = normalizeOutput(execution.stdout);
      const expectedOutput = normalizeOutput(sample.output);
      const passed = !execution.timedOut
        && !execution.outputLimitExceeded
        && execution.code === 0
        && actualOutput === expectedOutput;
      results.push({
        index: index + 1,
        passed,
        timedOut: execution.timedOut,
        outputLimitExceeded: execution.outputLimitExceeded,
        runtimeError: execution.code !== 0
          ? (execution.stderr || `程序异常退出（退出码 ${execution.code}）。`)
          : '',
        input: sample.input,
        expectedOutput: sample.output,
        actualOutput: execution.stdout,
      });
      if (!passed) stoppedAfterFailure = true;
    }

    return {
      runner: 'local',
      compiled: true,
      results,
      sampleLimit: MAX_SAMPLES,
      stoppedAfterFailure,
    };
  } finally {
    try {
      await fs.rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
    } catch {}
  }
}

function requestRunner(payload, signal) {
  const body = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      if (signal) signal.removeEventListener('abort', abort);
      if (error) reject(error);
      else resolve(result);
    };
    const abort = () => request.destroy(new Error('代码验证已取消。'));
    const request = http.request({
      socketPath: RUNNER_SOCKET_PATH,
      path: '/verify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (response) => {
      const chunks = [];
      let bytes = 0;
      response.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes <= 1024 * 1024) chunks.push(chunk);
      });
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (response.statusCode < 200 || response.statusCode >= 300) {
          return finish(new Error(`代码执行服务返回 HTTP ${response.statusCode}。`));
        }
        try {
          finish(null, JSON.parse(text));
        } catch {
          finish(new Error('代码执行服务返回了无效结果。'));
        }
      });
    });
    request.setTimeout(RUNNER_REQUEST_TIMEOUT_MS, () => request.destroy(new Error('代码执行服务响应超时。')));
    request.on('error', (error) => finish(error));
    if (signal?.aborted) return abort();
    if (signal) signal.addEventListener('abort', abort, { once: true });
    request.end(body);
  });
}

async function verifyCpp(code, samples = [], options = {}) {
  if (RUNNER_MODE === 'runner') {
    return requestRunner({ code, samples }, options.signal);
  }
  if (RUNNER_MODE !== 'local') {
    throw new Error(`不支持的代码执行模式：${RUNNER_MODE}`);
  }
  if (!options.signal?.aborted) {
    const key = verifyCacheKey(code, samples);
    const cached = verifyCache.get(key);
    if (cached && Date.now() - cached.createdAt < VERIFY_CACHE_TTL_MS) {
      return cloneResult(cached.result);
    }
    if (cached) verifyCache.delete(key);
    const result = await verifyCppLocal(code, samples, options);
    if (!options.signal?.aborted) {
      verifyCache.set(key, { createdAt: Date.now(), result: cloneResult(result) });
      while (verifyCache.size > VERIFY_CACHE_MAX) verifyCache.delete(verifyCache.keys().next().value);
    }
    return result;
  }
  return verifyCppLocal(code, samples, options);
}

function formatRunnerError(error) {
  if (RUNNER_MODE === 'runner' && ['ENOENT', 'ECONNREFUSED', 'ENOTFOUND'].includes(error?.code)) {
    return '代码执行 runner 当前不可用，请检查 runner 容器状态、共享 socket 和 /api/health 后重试。';
  }
  return '代码执行服务暂时不可用，请稍后重试。';
}

module.exports = {
  verifyCpp,
  verifyCppLocal,
  runProcess,
  normalizeOutput,
  formatRunnerError,
};
