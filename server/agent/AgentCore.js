/**
 * AgentCore — 自主编码 Agent 主循环
 *
 * 循环：Observe → Think → Act → Reflect → (repeat or terminate)
 *
 * 支持模式：
 *   - 'auto'     : 完全自主，LLM 决定何时停止
 *   - 'guided'   : 用户每步确认
 *   - 'parallel' : 多 Agent 并行子任务
 */

const { chat } = require('../services/deepseek');
const AgentMemory = require('./AgentMemory');

class AgentCore {
  /**
   * @param {object} options
   * @param {ToolRegistry} options.tools - 工具注册中心
   * @param {string} options.systemPrompt - 系统 prompt
   * @param {string} options.mode - 'auto' | 'guided' | 'parallel'
   * @param {number} options.maxSteps - 最大循环次数
   * @param {function} options.onStep - 每步回调 (stepInfo) => void
   * @param {AbortSignal} options.signal - 中止信号
   */
  constructor(options = {}) {
    this.tools = options.tools;
    this.systemPrompt = options.systemPrompt || this._defaultSystemPrompt();
    this.mode = options.mode || 'auto';
    this.maxSteps = options.maxSteps || 25;
    this.onStep = options.onStep || (() => {});
    this.signal = options.signal || null;
    this.memory = null;
    this.aborted = false;
  }

  /**
   * 执行一个任务
   * @param {string} task - 用户任务描述
   * @param {object} context - 额外上下文 { workDir, files, ... }
   * @returns {Promise<{success, result, trace, stats}>}
   */
  async execute(task, context = {}) {
    const sessionId = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.memory = new AgentMemory(sessionId);
    this.memory.observe(`任务开始: ${task}`, 'user');
    if (context.files) {
      this.memory.observe(`工作文件: ${context.files.join(', ')}`, 'context');
    }

    let finalResult = '';

    for (let step = 0; step < this.maxSteps; step++) {
      if (this.aborted || (this.signal && this.signal.aborted)) {
        finalResult = '任务被用户中止。';
        break;
      }

      // 1. Build messages for LLM
      const messages = this._buildMessages(task, context);

      // 2. Call LLM
      this.onStep({ type: 'think', step, message: '正在思考...' });
      let llmResponse;
      try {
        llmResponse = await this._callLLM(messages);
      } catch (err) {
        this.memory.reflect(`LLM 调用失败: ${err.message}`, 'error');
        finalResult = `AI 调用失败: ${err.message}`;
        break;
      }

      // 3. Parse response
      const parsed = this._parseResponse(llmResponse);

      if (parsed.think) {
        this.memory.think(parsed.think);
        this.onStep({ type: 'think', step, message: parsed.think });
      }

      // 4. Check if done
      if (parsed.done) {
        finalResult = parsed.done;
        this.memory.reflect('任务完成', 'complete');
        this.onStep({ type: 'complete', step, message: parsed.done });
        break;
      }

      // 5. Execute tool calls
      if (parsed.actions && parsed.actions.length > 0) {
        for (const action of parsed.actions) {
          this.onStep({ type: 'act', step, tool: action.tool, params: action.params });

          const result = await this.tools.execute(action.tool, action.params, {
            ...context,
            sessionId,
            memory: this.memory,
          });

          this.memory.act(action.tool, action.params, result);
          this.onStep({ type: 'result', step, tool: action.tool, result });

          // Check for abort signals in result
          try {
            const parsed_result = JSON.parse(result);
            if (parsed_result.error && parsed_result.error.includes('ABORT')) {
              this.memory.reflect('检测到中止信号', 'error');
              finalResult = `任务中止: ${parsed_result.error}`;
              break;
            }
          } catch (e) {}
        }
      }

      // 6. Reflect
      if (parsed.reflect) {
        this.memory.reflect(parsed.reflect, parsed.status || 'continue');
        this.onStep({ type: 'reflect', step, message: parsed.reflect });
      }

      // 7. Early exit on stuck
      if (parsed.status === 'stuck') {
        this.memory.reflect('Agent 陷入循环，尝试调整策略', 'stuck');
      }
    }

    // If loop exhausted without completion
    if (!finalResult) {
      finalResult = '达到最大步骤限制，任务未能完成。最后的思考：' +
        (this.memory.getRecentFormatted(3) || '无');
      this.memory.reflect('达到最大步骤限制', 'error');
    }

    return {
      success: this.memory.shortTerm.some(m => m.type === 'reflect' && m.status === 'complete'),
      result: finalResult,
      trace: this.memory.getFullTrace(),
      stats: this.memory.getStats(),
    };
  }

  /**
   * 中止任务
   */
  abort() {
    this.aborted = true;
  }

  // ========== 内部方法 ==========

  async _callLLM(messages) {
    const toolSchemas = this.tools ? this.tools.getToolSchemas() : [];
    const { chatStream } = require('../services/deepseek');

    // Use non-streaming for agent loop (simpler to parse)
    const axios = require('axios');
    const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    const API_KEY = process.env.DEEPSEEK_API_KEY;
    const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    const resp = await axios.post(
      `${BASE_URL}/v1/chat/completions`,
      {
        model: MODEL,
        messages,
        temperature: 0.3,
        max_tokens: 4096,
        tools: toolSchemas.length > 0 ? toolSchemas : undefined,
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    const choice = resp.data.choices[0];
    return choice.message;
  }

  _buildMessages(task, context) {
    const messages = [{ role: 'system', content: this.systemPrompt }];

    // Add memory as context
    const memoryStr = this.memory.getRecentFormatted(30);
    if (memoryStr) {
      messages.push({
        role: 'user',
        content: `[系统] 当前工作轨迹:\n${memoryStr}`,
      });
    }

    // Add working context
    if (context.files && context.files.length > 0) {
      messages.push({
        role: 'user',
        content: `[系统] 可用文件: ${context.files.join(', ')}`,
      });
    }

    // User task
    messages.push({ role: 'user', content: task });

    return messages;
  }

  _parseResponse(message) {
    const result = {
      think: null,
      actions: [],
      done: null,
      reflect: null,
      status: 'continue',
    };

    // Extract think content
    const content = message.content || '';

    // Check for tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const tc of message.tool_calls) {
        const funcName = tc.function.name;
        let params = {};
        try {
          params = JSON.parse(tc.function.arguments || '{}');
        } catch (e) {
          params = { raw: tc.function.arguments };
        }
        result.actions.push({ tool: funcName, params, id: tc.id });
      }
    }

    // Parse structured text response (when not using tool_calls)
    const doneMatch = content.match(/<done>([\s\S]*?)<\/done>/);
    if (doneMatch) {
      result.done = doneMatch[1].trim();
    }

    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) {
      result.think = thinkMatch[1].trim();
    }

    const reflectMatch = content.match(/<reflect\s+status="(\w+)">([\s\S]*?)<\/reflect>/);
    if (reflectMatch) {
      result.status = reflectMatch[1];
      result.reflect = reflectMatch[2].trim();
    }

    // If no structured tags, treat entire content as think
    if (!result.think && !result.done && !result.actions.length && content) {
      result.think = content;
    }

    return result;
  }

  _defaultSystemPrompt() {
    return `你是一个自主编码 Agent。你可以通过调用工具来完成用户的编码任务。

## 工作流程
每一轮你需要：
1. <think>分析当前状态，决定下一步</think>
2. 调用合适的工具执行操作
3. <reflect status="continue|complete|stuck">评估结果</reflect>
4. 如果任务完成，用 <done>输出最终结果</done>

## 规则
- 每次只做一个小步骤
- 工具调用失败时分析原因并重试
- 不要无限循环，如果连续3次相同操作没有进展，尝试不同策略
- 代码修改前先读取当前内容
- 最终结果要总结所有修改和发现
- 使用中文交流`;
  }
}

module.exports = AgentCore;
