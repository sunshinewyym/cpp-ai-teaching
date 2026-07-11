const { chatStream } = require('../services/deepseek');
const { routePrompt, buildMessages } = require('../services/promptRouter');
const { augmentWithKnowledge } = require('../services/knowledge');
const { setupSSE, sendSSE, endSSE } = require('../utils/stream');

function sanitizeChatContent(content) {
  return content.replace(/```([^\n]*)\n([\s\S]*?)```/g, (_, language, code) => {
    const lines = code.split(/\r?\n/).map(line => line.trimEnd());
    const looksLikeCompleteProgram = lines.length > 8 || /#include|using\s+namespace|\bmain\s*\(|\breturn\s+0\s*;|\bcin\b|\bcout\b/.test(code);

    if (looksLikeCompleteProgram) {
      return '```text\n// 已隐藏完整实现，避免直接复制提交。\n// 伪代码：\n// 1. 读取输入并初始化数据\n// 2. 按题目规则逐步处理\n// 3. 输出计算结果\n// 请根据上面的思路自行补全关键细节。\n```';
    }

    const snippet = lines.filter(line => line.trim()).slice(0, 8).join('\n');
    return `\`\`\`${language || 'cpp'}\n${snippet}\n// 其余部分请自行完成\n\`\`\``;
  });
}

/**
 * POST /api/chat
 * Body: { message, history?, courseTopic?, pptContext? }
 * SSE streaming response
 */
async function handleChat(req, res) {
  const { message, history = [], courseTopic = '', pptContext = '' } = req.body;

  if (!message) {
    return res.status(400).json({ error: '请输入问题。' });
  }

  // Select prompt strategy based on course topic
  let systemPrompt = routePrompt(courseTopic);

  // Augment with knowledge base
  systemPrompt = augmentWithKnowledge(systemPrompt, courseTopic);

  // Keep chat useful for learning without turning it into a solution copier.
  systemPrompt += `

## 对话输出规则
- 绝不输出完整、可直接提交的题目解答代码。
- 涉及代码时，只给伪代码、思路框架或理解当前知识点所必需的关键片段。
- 不要补齐完整的输入输出、主函数、全部变量和所有边界处理。
- 用户要求完整代码时，礼貌拒绝，并改为提供分步提示、伪代码或关键片段。
- 讲解要生动、清晰，适合课堂投屏阅读。`;

  // Add PPT context if available
  if (pptContext) {
    systemPrompt += `\n\n## 当前 PPT 上下文\n${pptContext}`;
  }

  const messages = buildMessages(systemPrompt, history, message);

  setupSSE(res);

  try {
    const response = await chatStream(messages);
    const stream = response.data;

    let buffer = '';
    let content = '';
    let ended = false;

    const finish = () => {
      if (ended) return;
      ended = true;
      if (content) sendSSE(res, { content: sanitizeChatContent(content) });
      endSSE(res);
    };

    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            finish();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              content += delta;
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    });

    stream.on('end', () => {
      finish();
    });

    stream.on('error', (err) => {
      console.error('[Stream Error]', err.message);
      sendSSE(res, { error: '回答生成中断，请重试。' });
      finish();
    });
  } catch (err) {
    console.error('[Chat Error]', err.message);
    sendSSE(res, { error: err.message });
    endSSE(res);
  }
}

module.exports = { handleChat, sanitizeChatContent };
