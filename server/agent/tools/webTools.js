/**
 * Web 工具集 — 网页抓取、搜索辅助
 */

const axios = require('axios');

function registerWebTools(registry) {
  // ===== 抓取网页内容 =====
  registry.register({
    name: 'fetch_url',
    description: '抓取一个 URL 的内容。返回文本内容（截取前 5000 字符）。',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '要抓取的 URL' },
        extract: { type: 'string', description: '提取模式："text"（纯文本）或 "html"（原始 HTML），默认 text' },
      },
      required: ['url'],
    },
    async execute(params) {
      try {
        const resp = await axios.get(params.url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PPT-AI-Agent/1.0)',
          },
          maxRedirects: 5,
        });

        let content = resp.data;
        if (typeof content === 'string' && params.extract !== 'html') {
          // 简单 HTML → 文本转换
          content = content
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim();
        }

        return {
          url: params.url,
          status: resp.status,
          contentType: resp.headers['content-type'],
          content: String(content).slice(0, 5000),
          truncated: String(content).length > 5000,
        };
      } catch (err) {
        return {
          error: `抓取失败: ${err.message}`,
          url: params.url,
          status: err.response?.status || 0,
        };
      }
    },
  });

  // ===== 搜索辅助（通过多个搜索源） =====
  registry.register({
    name: 'web_search',
    description: '搜索互联网获取信息。返回搜索结果摘要。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        maxResults: { type: 'number', description: '最大结果数（默认 5）' },
      },
      required: ['query'],
    },
    async execute(params) {
      const maxResults = params.maxResults || 5;

      // 使用 DuckDuckGo Instant Answer API（免费，无需 key）
      try {
        const resp = await axios.get('https://api.duckduckgo.com/', {
          params: {
            q: params.query,
            format: 'json',
            no_redirect: 1,
            no_html: 1,
            skip_disambig: 1,
          },
          timeout: 8000,
        });

        const data = resp.data;
        const results = [];

        if (data.Abstract) {
          results.push({
            title: data.Heading || params.query,
            snippet: data.Abstract,
            url: data.AbstractURL,
            source: data.AbstractSource,
          });
        }

        if (data.RelatedTopics) {
          for (const topic of data.RelatedTopics.slice(0, maxResults)) {
            if (topic.Text) {
              results.push({
                title: topic.Text.slice(0, 100),
                snippet: topic.Text,
                url: topic.FirstURL,
              });
            }
          }
        }

        // 如果 DuckDuckGo 没有返回足够结果，尝试 Wikipedia
        if (results.length < 2) {
          try {
            const wikiResp = await axios.get(
              `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(params.query)}`,
              { timeout: 5000 }
            );
            if (wikiResp.data.extract) {
              results.unshift({
                title: wikiResp.data.title || params.query,
                snippet: wikiResp.data.extract.slice(0, 1000),
                url: wikiResp.data.content_urls?.desktop?.page,
                source: 'Wikipedia',
              });
            }
          } catch {}
        }

        return {
          query: params.query,
          resultsCount: results.length,
          results: results.slice(0, maxResults),
        };
      } catch (err) {
        return {
          error: `搜索失败: ${err.message}`,
          query: params.query,
        };
      }
    },
  });

  // ===== 请求 HTTP API =====
  registry.register({
    name: 'http_request',
    description: '发送 HTTP 请求到指定 API。支持 GET/POST。',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '请求 URL' },
        method: { type: 'string', description: 'HTTP 方法（GET 或 POST，默认 GET）' },
        body: { type: 'object', description: 'POST 请求体（JSON）' },
        headers: { type: 'object', description: '自定义请求头' },
      },
      required: ['url'],
    },
    async execute(params) {
      try {
        const config = {
          method: params.method || 'GET',
          url: params.url,
          headers: params.headers || {},
          timeout: 10000,
        };
        if (params.body) {
          config.data = params.body;
          config.headers['Content-Type'] = config.headers['Content-Type'] || 'application/json';
        }
        const resp = await axios(config);
        return {
          status: resp.status,
          headers: resp.headers,
          data: typeof resp.data === 'object' ? resp.data : String(resp.data).slice(0, 5000),
        };
      } catch (err) {
        return {
          error: `请求失败: ${err.message}`,
          status: err.response?.status || 0,
        };
      }
    },
  });
}

module.exports = { registerWebTools };
