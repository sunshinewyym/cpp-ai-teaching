/**
 * SSE streaming helper
 */
function setupSSE(res) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

function sendSSE(res, data) {
  if (res.writableEnded || res.destroyed) return false;
  try {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    return true;
  } catch {
    return false;
  }
}

function endSSE(res) {
  if (res.writableEnded || res.destroyed) return;
  try {
    res.write('data: [DONE]\n\n');
    res.end();
  } catch {}
}

module.exports = { setupSSE, sendSSE, endSSE };
