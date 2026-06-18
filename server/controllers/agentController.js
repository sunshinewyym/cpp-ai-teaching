/**
 * Agent 控制器 — 处理 Agent 相关的 API 请求
 */

const { createCodingAgent, createTeachingAgent, createDebugAgent } = require('../agent/AgentFactory');
const { setupSSE, sendSSE, endSSE } = require('../utils/stream');

// 活跃的 Agent 会话（用于中止）
const activeSessions = new Map();

/**
 * POST /api/agent/execute
 * Body: { task, agentType?, workDir?, maxSteps?, mode? }
 * SSE streaming — 实时推送每一步执行状态
 */
async function handleExecute(req, res) {
  const {
    task,
    agentType = 'coding', // coding | teaching | debug
    workDir,
    maxSteps = 25,
    mode = 'auto',
  } = req.body;

  if (!task) {
    return res.status(400).json({ error: 'task is required' });
  }

  setupSSE(res);

  const sessionId = `session_${Date.now()}`;
  let agent;

  try {
    // 创建 Agent
    const factoryMap = {
      coding: createCodingAgent,
      teaching: createTeachingAgent,
      debug: createDebugAgent,
    };

    const factory = factoryMap[agentType] || createCodingAgent;
    const abortController = new AbortController();

    agent = factory({
      workDir: workDir || process.cwd(),
      mode,
      maxSteps,
      signal: abortController.signal,
      onStep: (stepInfo) => {
        sendSSE(res, {
          type: 'step',
          ...stepInfo,
        });
      },
    });

    // 注册到活跃会话
    activeSessions.set(sessionId, { agent, abortController });
    sendSSE(res, { type: 'session', sessionId, agentType, status: 'started' });

    // 执行任务
    const result = await agent.execute(task);

    sendSSE(res, { type: 'complete', ...result });
  } catch (err) {
    sendSSE(res, { type: 'error', error: err.message });
  } finally {
    activeSessions.delete(sessionId);
    endSSE(res);
  }
}

/**
 * POST /api/agent/abort
 * Body: { sessionId }
 */
async function handleAbort(req, res) {
  const { sessionId } = req.body;
  const session = activeSessions.get(sessionId);

  if (!session) {
    return res.json({ success: false, message: '会话不存在或已结束' });
  }

  session.agent.abort();
  session.abortController.abort();
  activeSessions.delete(sessionId);

  res.json({ success: true, message: '已发送中止信号' });
}

/**
 * GET /api/agent/active
 * 返回当前活跃的 Agent 会话列表
 */
async function handleActive(req, res) {
  const sessions = [];
  for (const [id, session] of activeSessions) {
    sessions.push({
      sessionId: id,
      stats: session.agent.memory ? session.agent.memory.getStats() : null,
    });
  }
  res.json({ activeSessions: sessions });
}

/**
 * POST /api/agent/teaching
 * 教学专用 Agent（简化接口）
 * Body: { task, courseTopic, pptContext? }
 * SSE streaming
 */
async function handleTeachingAgent(req, res) {
  const { task, courseTopic, pptContext } = req.body;

  if (!task) {
    return res.status(400).json({ error: 'task is required' });
  }

  setupSSE(res);

  try {
    const agent = createTeachingAgent({
      maxSteps: 15,
      onStep: (stepInfo) => {
        sendSSE(res, { type: 'step', ...stepInfo });
      },
    });

    const fullTask = `课程主题：${courseTopic || 'C++编程'}\n${pptContext ? `PPT上下文：${pptContext}\n` : ''}任务：${task}`;

    const result = await agent.execute(fullTask);
    sendSSE(res, { type: 'complete', ...result });
  } catch (err) {
    sendSSE(res, { type: 'error', error: err.message });
  } finally {
    endSSE(res);
  }
}

/**
 * POST /api/agent/debug
 * 代码调试专用 Agent（简化接口）
 * Body: { code, problem?, errorMessage? }
 * SSE streaming
 */
async function handleDebugAgent(req, res) {
  const { code, problem, errorMessage } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'code is required' });
  }

  setupSSE(res);

  try {
    const agent = createDebugAgent({
      maxSteps: 15,
      onStep: (stepInfo) => {
        sendSSE(res, { type: 'step', ...stepInfo });
      },
    });

    let task = `请诊断以下 C++ 代码的问题：\n\n\`\`\`cpp\n${code}\n\`\`\``;
    if (problem) task += `\n\n题目要求：${problem}`;
    if (errorMessage) task += `\n\n错误信息：${errorMessage}`;

    const result = await agent.execute(task);
    sendSSE(res, { type: 'complete', ...result });
  } catch (err) {
    sendSSE(res, { type: 'error', error: err.message });
  } finally {
    endSSE(res);
  }
}

module.exports = {
  handleExecute,
  handleAbort,
  handleActive,
  handleTeachingAgent,
  handleDebugAgent,
};
