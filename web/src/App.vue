<template>
  <div class="app-container">
    <Sidebar
      :activeTool="activeTool"
      @select-tool="activeTool = $event"
    />
    <div class="main-content">
      <header class="app-header">
        <h1>🎓 C++ AI 教学助手</h1>
        <span class="course-label" v-if="courseTopic">📚 {{ courseTopic }}</span>
      </header>

      <!-- Chat mode -->
      <ChatPanel
        v-if="activeTool === 'chat'"
        :courseTopic="courseTopic"
      />

      <!-- Agent mode -->
      <AgentPanel
        v-else-if="activeTool === 'agent'"
      />

      <!-- Opener mode (算法脑洞 - 浅色主题) -->
      <div v-else-if="activeTool === 'opener'" class="tool-panel">
        <h2>💡 AI 算法脑洞</h2>
        <div class="input-row">
          <input v-model="courseTopic" placeholder="输入课程主题，如：单调栈、BFS、DP背包" />
          <button @click="generateOpener" :disabled="loading">
            {{ loading ? '生成中...' : '💡 生成脑洞' }}
          </button>
        </div>
        <!-- 脑洞展示 -->
        <div v-if="brainstormData" class="brainstorm-result">
          <div class="brainstorm-card group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 border-l-4 border-l-indigo-500">
            <!-- 标题栏 -->
            <div class="px-8 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-cyan-50">
              <h3 class="text-5xl font-bold tracking-wide flex items-center gap-4">
                <span class="text-6xl">🎬</span>
                <span class="text-indigo-600">3分钟脑洞</span>
              </h3>
            </div>
            <!-- Markdown 内容区 -->
            <div class="px-8 py-6 brainstorm-content" v-html="renderMd(brainstormData.brainstorm)"></div>
          </div>
        </div>
        <!-- 加载中 / 错误 -->
        <div v-else-if="result" class="result-area" v-html="renderedResult"></div>
      </div>

      <!-- Edge case mode -->
      <div v-else-if="activeTool === 'edge-case'" class="tool-panel">
        <h2>🧨 边界盲盒</h2>
        <textarea v-model="problemDesc" placeholder="粘贴题目描述..." rows="4"></textarea>
        <textarea v-model="studentCode" placeholder="粘贴学生代码（可选）..." rows="6"></textarea>
        <button @click="generateEdgeCases" :disabled="loading">
          {{ loading ? '生成中...' : '🧨 生成边界测试点' }}
        </button>
        <div class="result-area" v-html="renderedResult"></div>
      </div>

      <!-- Teaching tools -->
      <div v-else-if="activeTool === 'teaching'" class="tool-panel">
        <h2>🧑‍🏫 教学工具箱</h2>
        <PromptButtons @action="handleTeachingAction" :loading="loading" />
        <div class="input-row" v-if="teachingAction">
          <input v-model="courseTopic" placeholder="课程主题" />
        </div>
        <div class="result-area" v-html="renderedResult"></div>
      </div>

      <!-- Debug mode -->
      <div v-else-if="activeTool === 'debug'" class="tool-panel">
        <h2>🔍 代码调试</h2>
        <textarea v-model="debugCode" placeholder="粘贴学生C++代码..." rows="10" class="code-input"></textarea>
        <textarea v-model="debugProblem" placeholder="题目描述（可选）..." rows="3"></textarea>
        <button @click="debugCodeAction" :disabled="loading || !debugCode">
          {{ loading ? '分析中...' : '🔍 分析代码' }}
        </button>
        <div class="result-area" v-html="renderedResult"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import Sidebar from './components/Sidebar.vue';
import ChatPanel from './components/ChatPanel.vue';
import AgentPanel from './components/AgentPanel.vue';
import PromptButtons from './components/PromptButtons.vue';
import { streamPost } from './utils/api';

// Configure marked with highlight.js
marked.setOptions({
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
});

const activeTool = ref('chat');
const courseTopic = ref('');
const loading = ref(false);
const result = ref('');
const brainstormData = ref(null);

const problemDesc = ref('');
const studentCode = ref('');
const debugCode = ref('');
const debugProblem = ref('');
const teachingAction = ref('');

const renderedResult = computed(() => {
  return result.value ? marked.parse(result.value) : '';
});

function renderMd(text) {
  if (!text) return '';
  // 先让 marked 解析 markdown，再手动处理加粗（防止 marked 漏掉中文加粗）
  let html = marked.parse(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return html;
}

async function generateOpener() {
  if (!courseTopic.value) return;
  loading.value = true;
  result.value = '';
  brainstormData.value = null;
  let raw = '';

  await streamPost('/api/opener', { courseTopic: courseTopic.value }, (chunk) => {
    raw += chunk;
  });

  // 尝试解析 JSON（可能被 markdown 包裹，需清理）
  try {
    let cleaned = raw.trim();
    // 去掉可能的 ```json ... ``` 包裹
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    brainstormData.value = JSON.parse(cleaned);
  } catch (e) {
    // JSON 解析失败，作为纯文本展示
    result.value = raw;
  }

  loading.value = false;
}

async function generateEdgeCases() {
  if (!problemDesc.value) return;
  loading.value = true;
  result.value = '';
  await streamPost('/api/edge-case', { problem: problemDesc.value, code: studentCode.value }, (chunk) => {
    result.value += chunk;
  });
  loading.value = false;
}

async function handleTeachingAction(action) {
  if (!courseTopic.value) {
    result.value = '⚠️ 请先输入课程主题';
    return;
  }
  teachingAction.value = action;
  loading.value = true;
  result.value = '';

  const endpoint = `/api/${action}`;
  const body = { courseTopic: courseTopic.value };

  if (action === 'generate-exercise') {
    body.count = 3;
    body.style = 'mixed';
  }
  if (action === 'generate-script') {
    body.duration = 45;
  }

  await streamPost(endpoint, body, (chunk) => {
    result.value += chunk;
  });
  loading.value = false;
}

async function debugCodeAction() {
  if (!debugCode.value) return;
  loading.value = true;
  result.value = '';
  await streamPost('/api/debug-code', {
    code: debugCode.value,
    problem: debugProblem.value,
  }, (chunk) => {
    result.value += chunk;
  });
  loading.value = false;
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #f8fafc;
  color: #1e293b;
}

.app-container {
  display: flex;
  height: 100vh;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f8fafc;
}

.app-header {
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-header h1 {
  font-size: 18px;
  color: #4f46e5;
}

.course-label {
  font-size: 13px;
  color: #64748b;
  background: #f1f5f9;
  padding: 4px 12px;
  border-radius: 12px;
}

.tool-panel {
  flex: 1;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.tool-panel h2 {
  font-size: 16px;
  color: #4f46e5;
}

.tool-panel input,
.tool-panel textarea {
  width: 100%;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #1e293b;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}

.tool-panel input:focus,
.tool-panel textarea:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
}

.code-input {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
  font-size: 13px !important;
  line-height: 1.5;
}

.tool-panel button {
  padding: 10px 20px;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.tool-panel button:hover:not(:disabled) {
  opacity: 0.85;
}

.tool-panel button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result-area {
  flex: 1;
  padding: 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow-y: auto;
  line-height: 1.7;
  font-size: 14px;
}

.result-area h1, .result-area h2, .result-area h3 {
  color: #4f46e5;
  margin: 16px 0 8px;
}

.result-area pre {
  background: #f1f5f9;
  padding: 14px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 10px 0;
  border: 1px solid #e2e8f0;
}

.result-area code {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
}

.result-area p {
  margin: 6px 0;
}

.result-area strong {
  color: #d97706;
}

.input-row {
  display: flex;
  gap: 10px;
}

.input-row input {
  flex: 1;
}

/* 算法脑洞卡片 */
.brainstorm-result {
  flex: 1;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  padding: 20px 24px 0;
}

.brainstorm-card {
  max-width: 860px;
  width: 100%;
  align-self: flex-start;
}

.brainstorm-content :deep(strong) {
  color: #d97706;
  font-weight: 800;
}

.brainstorm-content :deep(ul) {
  list-style: none;
  padding-left: 0;
}

.brainstorm-content :deep(li) {
  position: relative;
  padding: 16px 20px 16px 60px;
  margin: 16px 0;
  background: #f0f5ff;
  border-radius: 12px;
  border-left: 4px solid #6366f1;
  font-size: 6rem !important;
  line-height: 10 !important;
  color: #1e293b;
}

.brainstorm-content :deep(li)::before {
  content: '⚡';
  position: absolute;
  left: 18px;
  top: 20px;
  font-size: 3rem;
}

.brainstorm-content :deep(p) {
  font-size: 6rem !important;
  line-height: 10 !important;
  color: #1e293b;
}

.brainstorm-content :deep(h3) {
  display: none;
}

.brainstorm-content :deep(em) {
  color: #ea580c;
  font-style: normal;
}
</style>
