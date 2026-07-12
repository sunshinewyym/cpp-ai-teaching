const {
  createSession,
  deleteSession,
  getSession,
  submitProblem,
  submitTurn,
} = require('../coach/engine');

function sendError(res, error) {
  const status = error.status || 500;
  if (status >= 500) console.error('[Coach API Error]', error);
  res.status(status).json({ error: status >= 500 ? '算法教练暂时无法回应，请稍后重试。' : error.message });
}

function handleCreateSession(req, res) {
  try {
    res.status(201).json({ session: createSession(req.body?.student) });
  } catch (error) {
    sendError(res, error);
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
  handleSubmitProblem,
  handleSubmitTurn,
};
