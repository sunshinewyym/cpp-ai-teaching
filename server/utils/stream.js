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
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function endSSE(res) {
  res.write('data: [DONE]\n\n');
  res.end();
}

module.exports = { setupSSE, sendSSE, endSSE };
