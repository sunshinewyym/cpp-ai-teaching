const axios = require('axios');
const { applyCopyStyle } = require('./copyStyle');

const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const API_KEY = process.env.DEEPSEEK_API_KEY;
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

/**
 * Non-streaming chat completion
 */
async function chat(messages, options = {}) {
  const resp = await axios.post(
    `${BASE_URL}/v1/chat/completions`,
    {
      model: options.model || MODEL,
      messages: applyCopyStyle(messages),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2048,
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
    `${BASE_URL}/v1/chat/completions`,
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
    }
  );
  return resp;
}

module.exports = { chat, chatStream };
