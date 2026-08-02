import { authHeaders } from './auth';

/**
 * Read an SSE POST response with cancellation, total timeout and idle timeout.
 * Existing callers can keep using the first four arguments; the fifth argument
 * is optional request configuration.
 */
export async function streamPost(url, body, onChunk, onEvent = () => {}, options = {}) {
  const controller = new AbortController();
  const externalSignal = options.signal;
  const totalTimeoutMs = options.totalTimeoutMs ?? 90_000;
  const idleTimeoutMs = options.idleTimeoutMs ?? 20_000;
  let timedOut = false;
  let idleTimedOut = false;
  let externallyAborted = false;
  let errorMessage = '';
  let doneEvent = false;
  let totalTimer;
  let externalAbort;

  const abort = () => controller.abort();
  if (externalSignal) {
    externalAbort = () => {
      externallyAborted = true;
      controller.abort();
    };
    if (externalSignal.aborted) {
      externallyAborted = true;
      controller.abort();
    }
    else externalSignal.addEventListener('abort', externalAbort, { once: true });
  }

  const reportError = (message) => {
    errorMessage = message;
    onEvent({ error: message });
    onChunk(`\n\n⚠️ ${message}`);
  };

  try {
    totalTimer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, totalTimeoutMs);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text();
      reportError(`请求失败（${response.status}）：${detail || '服务器未提供具体原因。'}`);
      return { ok: false, error: errorMessage };
    }
    if (!response.body) {
      reportError('服务器没有返回可读取的流。');
      return { ok: false, error: errorMessage };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    const dispatch = (line) => {
      const normalized = line.endsWith('\r') ? line.slice(0, -1) : line;
      if (!normalized.startsWith('data:')) return;
      const data = normalized.slice(5).trim();
      if (!data) return;
      if (data === '[DONE]') {
        doneEvent = true;
        return;
      }
      try {
        const parsed = JSON.parse(data);
        onEvent(parsed);
        if (parsed.content) onChunk(parsed.content);
        if (parsed.error) {
          errorMessage = parsed.error;
          onChunk(`\n\n⚠️ ${parsed.error}`);
        }
      } catch {
        // Incomplete lines stay in buffer; malformed complete events are ignored.
      }
    };

    const consume = (flush = false) => {
      const lines = buffer.split('\n');
      buffer = flush ? '' : (lines.pop() || '');
      lines.forEach(dispatch);
    };

    while (!doneEvent) {
      const idleTimer = setTimeout(() => {
        idleTimedOut = true;
        controller.abort();
      }, idleTimeoutMs);
      try {
        const { done, value } = await reader.read();
        if (done) {
          buffer += decoder.decode();
          consume(true);
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        consume();
      } finally {
        clearTimeout(idleTimer);
      }
    }

    return { ok: !errorMessage, error: errorMessage };
  } catch (error) {
    if (error.name === 'AbortError') {
      reportError(timedOut
        ? '请求超时，请稍后重试。'
        : idleTimedOut
          ? '服务器长时间没有返回内容，请稍后重试。'
          : externallyAborted
            ? '请求已取消。'
            : '请求已中断。');
    } else {
      reportError(`网络错误：${error.message}`);
    }
    return { ok: false, error: errorMessage };
  } finally {
    clearTimeout(totalTimer);
    if (externalSignal && externalAbort) externalSignal.removeEventListener('abort', externalAbort);
  }
}
