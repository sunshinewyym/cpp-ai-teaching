<template>
  <div class="agent-panel">
    <!-- 任务配置区 -->
    <div class="agent-config">
      <div class="config-header">
        <span class="agent-type-icon">{{ agentTypeIcon }}</span>
        <select v-model="agentType" class="type-select">
          <option value="coding">🛠️ 编码 Agent</option>
          <option value="teaching">🧑‍🏫 教学 Agent</option>
          <option value="debug">🔍 诊断 Agent</option>
        </select>
      </div>

      <div class="config-body">
        <div class="mode-row">
          <label>模式：</label>
          <select v-model="mode" class="mode-select">
            <option value="auto">🤖 自主模式</option>
            <option value="guided">🧭 引导模式</option>
          </select>
          <label>最大步数：</label>
          <input v-model.number="maxSteps" type="number" min="5" max="50" class="steps-input" />
        </div>
      </div>
    </div>

    <!-- 任务输入 -->
    <div class="task-input-area">
      <textarea
        v-model="task"
        :placeholder="taskPlaceholder"
        rows="4"
        @keydown.ctrl.enter="startAgent"
      ></textarea>
      <div class="task-actions">
        <button class="btn-start" @click="startAgent" :disabled="running || !task.trim()">
          {{ running ? '⏳ 执行中...' : '🚀 启动 Agent' }}
        </button>
        <button class="btn-abort" @click="abortAgent" :disabled="!running" v-if="running">
          ⏹ 中止
        </button>
      </div>
    </div>

    <!-- 执行轨迹 -->
    <div class="trace-area" ref="traceRef">
      <div v-if="!steps.length && !running" class="trace-empty">
        <p>💡 输入任务描述，Agent 会自主规划并执行</p>
        <p class="hint">示例：帮我写一个 BFS 最短路模板，要求支持负权检测</p>
      </div>

      <div v-for="(step, i) in steps" :key="i" :class="['trace-step', step.type]">
        <!-- 思考 -->
        <div v-if="step.type === 'think'" class="step-think">
          <span class="step-icon">🧠</span>
          <div class="step-content">
            <div class="step-label">思考</div>
            <div class="step-text">{{ step.message }}</div>
          </div>
        </div>

        <!-- 行动 -->
        <div v-else-if="step.type === 'act'" class="step-act">
          <span class="step-icon">⚡</span>
          <div class="step-content">
            <div class="step-label">调用 {{ step.tool }}</div>
            <pre class="step-params">{{ formatParams(step.params) }}</pre>
          </div>
        </div>

        <!-- 结果 -->
        <div v-else-if="step.type === 'result'" class="step-result">
          <span class="step-icon">📦</span>
          <div class="step-content">
            <div class="step-label">{{ step.tool }} 返回结果</div>
            <pre class="step-output">{{ truncate(step.result, 800) }}</pre>
          </div>
        </div>

        <!-- 反思 -->
        <div v-else-if="step.type === 'reflect'" class="step-reflect">
          <span class="step-icon">💭</span>
          <div class="step-content">
            <div class="step-label">反思</div>
            <div class="step-text">{{ step.message }}</div>
          </div>
        </div>

        <!-- 完成 -->
        <div v-else-if="step.type === 'complete'" class="step-complete">
          <span class="step-icon">✅</span>
          <div class="step-content">
            <div class="step-label">任务完成</div>
            <div class="step-text markdown-body" v-html="renderMd(step.message)"></div>
          </div>
        </div>

        <!-- 会话信息 -->
        <div v-else-if="step.type === 'session'" class="step-session">
          <span class="step-icon">🎬</span>
          <div class="step-content">
            <div class="step-text">Agent 会话已启动 ({{ step.agentType }})</div>
          </div>
        </div>

        <!-- 错误 -->
        <div v-else-if="step.type === 'error'" class="step-error">
          <span class="step-icon">❌</span>
          <div class="step-content">
            <div class="step-label">错误</div>
            <div class="step-text">{{ step.error }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部统计 -->
    <div class="agent-stats" v-if="stats">
      <span>观察: {{ stats.observe }}</span>
      <span>思考: {{ stats.think }}</span>
      <span>行动: {{ stats.act }}</span>
      <span>反思: {{ stats.reflect }}</span>
      <span>总计: {{ stats.total }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { streamPost } from '../utils/api';

marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value;
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
});

const agentType = ref('coding');
const mode = ref('auto');
const maxSteps = ref(25);
const task = ref('');
const running = ref(false);
const steps = ref([]);
const stats = ref(null);
const traceRef = ref(null);

let sessionId = null;

const agentTypeIcon = computed(() => {
  const icons = { coding: '🛠️', teaching: '🧑‍🏫', debug: '🔍' };
  return icons[agentType.value] || '🤖';
});

const taskPlaceholder = computed(() => {
  const placeholders = {
    coding: '描述你的编码任务...\n例如：帮我写一个并查集模板，支持按秩合并和路径压缩',
    teaching: '描述教学设计需求...\n例如：为"单调栈"设计一个5分钟的课堂导入',
    debug: '粘贴需要诊断的 C++ 代码...\n或者描述调试需求',
  };
  return placeholders[agentType.value];
});

function renderMd(text) {
  if (!text) return '';
  return marked.parse(text);
}

function formatParams(params) {
  if (!params) return '';
  try {
    const str = JSON.stringify(params, null, 2);
    return str.length > 300 ? str.slice(0, 300) + '\n...' : str;
  } catch { return String(params); }
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '\n...(截断)' : str;
}

function scrollToBottom() {
  nextTick(() => {
    if (traceRef.value) {
      traceRef.value.scrollTop = traceRef.value.scrollHeight;
    }
  });
}

async function startAgent() {
  if (!task.value.trim() || running.value) return;

  steps.value = [];
  stats.value = null;
  running.value = true;
  sessionId = null;

  const endpoint = '/api/agent/execute';
  const body = {
    task: task.value,
    agentType: agentType.value,
    mode: mode.value,
    maxSteps: maxSteps.value,
  };

  await streamPost(endpoint, body, (data) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'session') {
        sessionId = parsed.sessionId;
        steps.value.push(parsed);
      } else if (parsed.type === 'complete') {
        steps.value.push({
          type: 'complete',
          message: parsed.result,
        });
        stats.value = parsed.stats;
      } else if (parsed.type === 'error') {
        steps.value.push(parsed);
      } else {
        steps.value.push(parsed);
      }
      scrollToBottom();
    } catch {
      // raw text chunk from SSE
    }
  });

  running.value = false;
}

async function abortAgent() {
  if (!sessionId) return;
  try {
    await fetch('/api/agent/abort', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
  } catch {}
  running.value = false;
}
</script>

<style scoped>
.agent-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 配置区 */
.agent-config {
  padding: 12px 20px;
  background: #12122a;
  border-bottom: 1px solid #2a2a4a;
}

.config-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.agent-type-icon {
  font-size: 20px;
}

.type-select, .mode-select, .steps-input {
  padding: 6px 10px;
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 13px;
}

.type-select { flex: 1; }
.steps-input { width: 60px; text-align: center; }

.mode-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #888;
}

/* 任务输入 */
.task-input-area {
  padding: 12px 20px;
  background: #12122a;
  border-bottom: 1px solid #2a2a4a;
}

.task-input-area textarea {
  width: 100%;
  padding: 10px 14px;
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  line-height: 1.5;
}

.task-input-area textarea:focus {
  outline: none;
  border-color: #00d4ff;
}

.task-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.btn-start {
  flex: 1;
  padding: 10px;
  background: linear-gradient(135deg, #00d4ff, #0099cc);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}

.btn-start:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-abort {
  padding: 10px 20px;
  background: #cc3333;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

/* 执行轨迹 */
.trace-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.trace-empty {
  text-align: center;
  padding: 60px 20px;
  color: #555;
}

.trace-empty .hint {
  margin-top: 12px;
  font-size: 12px;
  color: #444;
  font-style: italic;
}

.trace-step {
  margin-bottom: 12px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.trace-step > div {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.step-icon {
  font-size: 16px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.step-content {
  flex: 1;
  min-width: 0;
}

.step-label {
  font-size: 11px;
  color: #00d4ff;
  font-weight: 600;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.step-text {
  font-size: 13px;
  line-height: 1.6;
  color: #ccc;
}

.step-params, .step-output {
  background: #0d0d1a;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  line-height: 1.5;
  overflow-x: auto;
  color: #aaa;
  margin-top: 4px;
  white-space: pre-wrap;
  word-break: break-all;
}

.step-think .step-text {
  color: #b8b8d0;
  border-left: 3px solid #3a3a6a;
  padding-left: 10px;
}

.step-reflect .step-text {
  color: #a0a0c0;
  border-left: 3px solid #6a4a3a;
  padding-left: 10px;
}

.step-complete .step-text {
  color: #e0e0e0;
  background: #1a2a1a;
  border: 1px solid #2a4a2a;
  border-radius: 8px;
  padding: 12px;
}

.step-error .step-text {
  color: #ff6b6b;
  background: #2a1a1a;
  border: 1px solid #4a2a2a;
  border-radius: 6px;
  padding: 8px 12px;
}

.step-session .step-text {
  color: #888;
  font-size: 12px;
}

/* markdown 样式 */
.markdown-body :deep(h1), .markdown-body :deep(h2), .markdown-body :deep(h3) {
  color: #00d4ff;
  margin: 10px 0 6px;
}

.markdown-body :deep(pre) {
  background: #0d0d1a;
  padding: 10px;
  border-radius: 6px;
  overflow-x: auto;
}

.markdown-body :deep(code) {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}

.markdown-body :deep(strong) { color: #ffd700; }
.markdown-body :deep(p) { margin: 4px 0; }

/* 底部统计 */
.agent-stats {
  padding: 8px 20px;
  background: #12122a;
  border-top: 1px solid #2a2a4a;
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: #555;
}
</style>
