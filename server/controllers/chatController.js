const { chatStream } = require('../services/deepseek');
const { routePrompt, buildMessages } = require('../services/promptRouter');
const { augmentWithKnowledge } = require('../services/knowledge');
const { setupSSE, sendSSE, endSSE } = require('../utils/stream');

/**
 * POST /api/chat
 * Body: { message, history?, courseTopic?, pptContext? }
 * SSE streaming response
 */
async function handleChat(req, res) {
  const { message, history = [], courseTopic = '', pptContext = '' } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  // Select prompt strategy based on course topic
  let systemPrompt = routePrompt(courseTopic);

  // Augment with knowledge base
  systemPrompt = augmentWithKnowledge(systemPrompt, courseTopic);

  // Add PPT context if available
  if (pptContext) {
    systemPrompt += `\n\n## 当前PPT上下文\n${pptContext}`;
  }

  const messages = buildMessages(systemPrompt, history, message);

  setupSSE(res);

  try {
    const response = await chatStream(messages);
    const stream = response.data;

    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            endSSE(res);
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              sendSSE(res, { content });
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    });

    stream.on('end', () => {
      endSSE(res);
    });

    stream.on('error', (err) => {
      console.error('[Stream Error]', err.message);
      sendSSE(res, { error: 'Stream error' });
      endSSE(res);
    });
  } catch (err) {
    console.error('[Chat Error]', err.message);
    sendSSE(res, { error: err.message });
    endSSE(res);
  }
}

module.exports = { handleChat };
