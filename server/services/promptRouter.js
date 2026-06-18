const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = path.join(__dirname, '..', 'prompts');

/**
 * Auto-select prompt strategy based on course topic
 */
function routePrompt(courseTopic = '') {
  const topic = courseTopic.toLowerCase();

  if (/并查集|union.?find/i.test(topic)) {
    return loadPrompt('csp.md');
  }
  if (/dp|动态规划|背包/i.test(topic)) {
    return loadPrompt('dp.md');
  }
  if (/图论|最短路|dijkstra|bfs|dfs|拓扑/i.test(topic)) {
    return loadPrompt('graph.md');
  }
  if (/机器人|robot/i.test(topic)) {
    return loadPrompt('robot.md');
  }
  if (/c\+\+|cpp|语法|指针|模板/i.test(topic)) {
    return loadPrompt('cpp.md');
  }
  if (/ai|人工智能|机器学习/i.test(topic)) {
    return loadPrompt('ai_intro.md');
  }

  // Default system prompt
  return loadPrompt('system.md');
}

function loadPrompt(filename) {
  const filepath = path.join(PROMPTS_DIR, filename);
  if (fs.existsSync(filepath)) {
    return fs.readFileSync(filepath, 'utf-8');
  }
  return getDefaultSystemPrompt();
}

function getDefaultSystemPrompt() {
  return `你是一位专业的C++编程教师，擅长少儿编程教学（CSP-J/S级别）。
你的教学风格：生动有趣、由浅入深、善于用生活案例解释算法。
回答时注意：
1. 用中文回答
2. 代码示例使用C++
3. 适合10-14岁学生理解
4. 重要概念用 **加粗** 标注`;
}

/**
 * Build messages array with system prompt + conversation history
 */
function buildMessages(systemPrompt, history = [], userMessage = '') {
  const messages = [{ role: 'system', content: systemPrompt }];

  for (const msg of history) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  if (userMessage) {
    messages.push({ role: 'user', content: userMessage });
  }

  return messages;
}

module.exports = { routePrompt, loadPrompt, buildMessages, getDefaultSystemPrompt };
