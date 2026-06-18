/**
 * ToolRegistry — 统一的工具注册与调用中心
 * 所有 Agent 可用的工具在这里注册，每个工具有 schema、execute、validate
 */

class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  /**
   * 注册一个工具
   * @param {object} tool - { name, description, parameters (JSON Schema), execute(params) }
   */
  register(tool) {
    if (!tool.name || !tool.execute) {
      throw new Error(`Tool must have 'name' and 'execute': ${JSON.stringify(tool)}`);
    }
    this.tools.set(tool.name, tool);
    return this;
  }

  /**
   * 获取工具定义（给 LLM 看的 schema）
   */
  getToolSchemas() {
    const schemas = [];
    for (const [name, tool] of this.tools) {
      schemas.push({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description || '',
          parameters: tool.parameters || { type: 'object', properties: {} },
        },
      });
    }
    return schemas;
  }

  /**
   * 执行一个工具调用
   * @param {string} name - 工具名
   * @param {object} params - 参数
   * @param {object} context - 执行上下文 { workDir, sessionId, ... }
   * @returns {Promise<string>}
   */
  async execute(name, params, context = {}) {
    const tool = this.tools.get(name);
    if (!tool) {
      return JSON.stringify({ error: `Unknown tool: ${name}` });
    }

    try {
      const result = await tool.execute(params, context);
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (err) {
      return JSON.stringify({ error: `Tool ${name} failed: ${err.message}` });
    }
  }

  /**
   * 列出所有已注册工具名
   */
  listTools() {
    return Array.from(this.tools.keys());
  }

  has(name) {
    return this.tools.has(name);
  }
}

module.exports = ToolRegistry;
