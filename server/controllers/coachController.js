const {
  createSession,
  deleteSession,
  getSession,
  prefetchNext,
  submitProblem,
  submitTurn,
} = require('../coach/engine');
const { generateGuide } = require('../coach/guide');
const { createArticleStream, normalizeArticleProblem } = require('../coach/article');
const { setupSSE, sendSSE, endSSE } = require('../utils/stream');

function sendError(res, error) {
  const status = error.status || 500;
  if (status >= 500) console.error('[Coach API Error]', error);
  res.status(status).json({
    error: status >= 500
      ? (error.publicMessage || '算法教练暂时无法回应，请稍后重试。')
      : error.message,
  });
}

function handleCreateSession(req, res) {
  try {
    res.status(201).json({ session: createSession(req.body?.student) });
  } catch (error) {
    sendError(res, error);
  }
}

async function handleGenerateGuide(req, res) {
  try {
    res.json(await generateGuide(req.body?.problem || req.body));
  } catch (error) {
    sendError(res, error);
  }
}

async function handleGenerateArticle(req, res) {
  try {
    normalizeArticleProblem(req.body?.problem || req.body);
  } catch (error) {
    return sendError(res, error);
  }

  setupSSE(res);
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    endSSE(res);
  };

  try {
    const response = await createArticleStream(req.body?.problem || req.body);
    let buffer = '';
    response.data.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return finish();
        try {
          const content = JSON.parse(data).choices?.[0]?.delta?.content;
          if (content) sendSSE(res, { content: content.replace(/\$/g, '') });
        } catch {}
      }
    });
    response.data.on('end', finish);
    response.data.on('error', (error) => {
      console.error('[Coach Article Stream]', error.message);
      sendSSE(res, { error: '生成中断，请重新生成。' });
      finish();
    });
  } catch (error) {
    console.error('[Coach Article API]', error.message);
    sendSSE(res, { error: /timeout|ECONNABORTED/i.test(`${error.code || ''} ${error.message}`)
      ? '连接 AI 超时，请重新生成。'
      : '算法教练暂时无法连接 AI，请稍后重试。' });
    finish();
  }
}

async function handleSubmitProblem(req, res) {
  try {
    res.json(await submitProblem(req.params.id, req.body?.problem || req.body));
  } catch (error) {
    sendError(res, error);
  }
}

async function handleSubmitTurn(req, res) {
  try {
    res.json(await submitTurn(req.params.id, req.body));
  } catch (error) {
    sendError(res, error);
  }
}

async function handlePrefetchNext(req, res) {
  try {
    res.json(await prefetchNext(req.params.id));
  } catch (error) {
    sendError(res, error);
  }
}

function handleGetSession(req, res) {
  try {
    res.json({ session: getSession(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
}

function handleDeleteSession(req, res) {
  try {
    deleteSession(req.params.id);
    res.status(204).end();
  } catch (error) {
    sendError(res, error);
  }
}

module.exports = {
  handleCreateSession,
  handleDeleteSession,
  handleGetSession,
  handleGenerateGuide,
  handleGenerateArticle,
  handlePrefetchNext,
  handleSubmitProblem,
  handleSubmitTurn,
};
