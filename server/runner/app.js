const fs = require('fs');
const http = require('http');
const path = require('path');
const { verifyCppLocal } = require('../services/codeRunner');

const SOCKET_PATH = process.env.RUNNER_SOCKET_PATH || '/run/cpp-runner/runner.sock';
const PORT = Number(process.env.RUNNER_PORT || 3100);
const MAX_BODY_BYTES = Number(process.env.DEBUG_MAX_REQUEST_BYTES || 512 * 1024);

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('请求体过大。'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('请求体不是有效 JSON。'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return sendJson(res, 200, { status: 'ok' });
  }
  if (req.method !== 'POST' || req.url !== '/verify') {
    return sendJson(res, 404, { error: 'Not found' });
  }

  const controller = new AbortController();
  const abort = () => {
    if (!res.writableEnded) controller.abort();
  };
  req.on('aborted', abort);
  res.on('close', abort);

  try {
    const body = await readJson(req);
    if (!body.code || typeof body.code !== 'string') {
      return sendJson(res, 400, { error: '缺少 C++ 代码。' });
    }
    const result = await verifyCppLocal(body.code, body.samples, { signal: controller.signal });
    if (!res.writableEnded) sendJson(res, 200, result);
  } catch (error) {
    if (!res.writableEnded) sendJson(res, 400, { error: error.message || '代码执行失败。' });
  } finally {
    req.off('aborted', abort);
    res.off('close', abort);
  }
});

async function start() {
  if (process.platform !== 'win32') {
    await fs.promises.mkdir(path.dirname(SOCKET_PATH), { recursive: true });
    try { await fs.promises.unlink(SOCKET_PATH); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    server.listen(SOCKET_PATH, () => {
      try { fs.chmodSync(SOCKET_PATH, 0o666); } catch {}
      console.log(`[Runner] listening on ${SOCKET_PATH}`);
    });
  } else {
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[Runner] listening on http://127.0.0.1:${PORT}`);
    });
  }
}

start().catch((error) => {
  console.error('[Runner] failed to start:', error);
  process.exitCode = 1;
});
