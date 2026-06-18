/**
 * AgentMemory — 短期工作记忆 + 长期持久记忆
 * 短期：单次任务内的观察、思考、行动记录
 * 长期：跨任务的经验积累（存在文件中）
 */

const fs = require('fs');
const path = require('path');

class AgentMemory {
  constructor(sessionId = 'default') {
    this.sessionId = sessionId;
    this.shortTerm = [];       // 本次会话的完整轨迹
    this.workingContext = {};  // 当前工作上下文（变量、文件状态等）
    this.maxShortTerm = 100;   // 短期记忆最大条数
  }

  /**
   * 记录一次观察
   */
  observe(content, source = 'system') {
    this.shortTerm.push({
      type: 'observe',
      source,
      content,
      timestamp: Date.now(),
    });
    this._trim();
  }

  /**
   * 记录一次思考
   */
  think(content) {
    this.shortTerm.push({
      type: 'think',
      content,
      timestamp: Date.now(),
    });
    this._trim();
  }

  /**
   * 记录一次行动
   */
  act(tool, params, result) {
    this.shortTerm.push({
      type: 'act',
      tool,
      params,
      result: typeof result === 'string' ? result : JSON.stringify(result),
      timestamp: Date.now(),
    });
    this._trim();
  }

  /**
   * 记录一次反思
   */
  reflect(content, status = 'continue') {
    this.shortTerm.push({
      type: 'reflect',
      content,
      status, // 'continue' | 'complete' | 'stuck' | 'error'
      timestamp: Date.now(),
    });
    this._trim();
  }

  /**
   * 更新工作上下文
   */
  setContext(key, value) {
    this.workingContext[key] = value;
  }

  getContext(key) {
    return this.workingContext[key];
  }

  /**
   * 获取最近 N 条记忆，格式化为字符串（注入 prompt 用）
   */
  getRecentFormatted(count = 20) {
    const recent = this.shortTerm.slice(-count);
    return recent.map(m => {
      switch (m.type) {
        case 'observe':
          return `[观察 ${m.source}] ${m.content}`;
        case 'think':
          return `[思考] ${m.content}`;
        case 'act':
          return `[行动] 调用 ${m.tool}(${JSON.stringify(m.params)}) → ${this._truncate(m.result, 500)}`;
        case 'reflect':
          return `[反思 ${m.status}] ${m.content}`;
        default:
          return `[${m.type}] ${m.content}`;
      }
    }).join('\n');
  }

  /**
   * 获取完整轨迹（用于最终汇报）
   */
  getFullTrace() {
    return this.shortTerm.map(m => ({
      type: m.type,
      content: m.content || undefined,
      tool: m.tool || undefined,
      params: m.params || undefined,
      result: m.result || undefined,
      status: m.status || undefined,
      timestamp: m.timestamp,
    }));
  }

  /**
   * 获取执行步骤统计
   */
  getStats() {
    const counts = { observe: 0, think: 0, act: 0, reflect: 0 };
    for (const m of this.shortTerm) {
      counts[m.type] = (counts[m.type] || 0) + 1;
    }
    return { ...counts, total: this.shortTerm.length };
  }

  _trim() {
    if (this.shortTerm.length > this.maxShortTerm) {
      this.shortTerm = this.shortTerm.slice(-this.maxShortTerm);
    }
  }

  _truncate(str, maxLen) {
    if (!str) return '';
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + '...(truncated)';
  }
}

module.exports = AgentMemory;
