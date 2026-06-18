/**
 * SSE streaming POST helper
 * @param {string} url - API endpoint
 * @param {object} body - request body
 * @param {function} onChunk - callback for each text chunk
 * @returns {Promise<void>}
 */
export async function streamPost(url, body, onChunk) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      onChunk(`\n\n⚠️ 请求失败: ${response.status} ${err}`);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              onChunk(parsed.content);
            }
            if (parsed.error) {
              onChunk(`\n\n⚠️ 错误: ${parsed.error}`);
            }
          } catch (e) {
            // skip malformed
          }
        }
      }
    }
  } catch (err) {
    onChunk(`\n\n⚠️ 网络错误: ${err.message}`);
  }
}
