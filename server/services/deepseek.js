const axios = require('axios');
const { applyCopyStyle } = require('./copyStyle');

const PROVIDER = process.env.AI_PROVIDER || 'deepseek';
const DEFAULT_BASE_URLS = {
  deepseek: 'https://api.deepseek.com',
  mimo: 'https://token-plan-cn.xiaomimimo.com/v1',
  openai: 'https://api.openai.com',
};
const BASE_URL = process.env.AI_BASE_URL
  || (PROVIDER === 'mimo' ? process.env.MIMO_BASE_URL : process.env.DEEPSEEK_BASE_URL)
  || DEFAULT_BASE_URLS[PROVIDER]
  || DEFAULT_BASE_URLS.deepseek;
const API_KEY = process.env.AI_API_KEY
  || (PROVIDER === 'mimo' ? process.env.MIMO_API_KEY : process.env.DEEPSEEK_API_KEY);
const MODEL = process.env.AI_MODEL
  || (PROVIDER === 'mimo' ? process.env.MIMO_MODEL || 'mimo-v2.5' : process.env.DEEPSEEK_MODEL || 'deepseek-chat');

function buildChatCompletionsUrl(baseUrl) {
  const normalized = baseUrl.replace(/\/+$/, '');
  return `${normalized.endsWith('/v1') ? normalized : `${normalized}/v1`}/chat/completions`;
}

const CHAT_COMPLETIONS_URL = buildChatCompletionsUrl(BASE_URL);

/**
 * Non-streaming chat completion
 */
async function chat(messages, options = {}) {
  const resp = await axios.post(
    CHAT_COMPLETIONS_URL,
    {
      model: options.model || MODEL,
      messages: applyCopyStyle(messages),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2048,
      ...(options.response_format ? { response_format: options.response_format } : {}),
    },
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: options.timeout ?? 60000,
      responseType: 'json',
      responseEncoding: 'utf-8',
    }
  );
  return resp.data.choices[0].message.content;
}

/**
 * Streaming chat completion — returns axios response with streaming body
 */
async function chatStream(messages, options = {}) {
  const resp = await axios.post(
    CHAT_COMPLETIONS_URL,
    {
      model: options.model || MODEL,
      messages: applyCopyStyle(messages),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2048,
      stream: true,
    },
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      responseType: 'stream',
      responseEncoding: 'utf-8',
      timeout: options.timeout ?? 60000,
    }
  );
  return resp;
}

module.exports = { chat, chatStream, buildChatCompletionsUrl };
