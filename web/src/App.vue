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

      <!-- Debug mode (OJ 调试) -->
      <div v-else-if="activeTool === 'debug'" class="oj-container">
        <!-- 左栏：题目列表 -->
        <div class="oj-left">
          <div class="oj-section-title">📋 题目列表</div>
          <div class="oj-problem-input">
            <input v-model="ojProblemId" placeholder="输入题号" @keyup.enter="fetchOjProblem" />
            <button @click="fetchOjProblem" :disabled="ojLoading">获取</button>
          </div>
          <div class="oj-problem-list">
            <div v-for="p in ojProblems" :key="p.id"
              :class="['oj-problem-item', { active: ojCurrentProblem?.id === p.id }]"
              @click="ojProblemId = p.id; fetchOjProblem()">
              <span class="oj-pid">{{ p.id }}</span>
              <span class="oj-ptitle">{{ p.title }}</span>
            </div>
          </div>
          <!-- 系统开关（本地访问时显示） -->
          <div class="oj-switch-area">
            <label class="oj-switch-label">
              <input type="checkbox" v-model="ojSystemEnabled" @change="toggleOjSystem" />
              <span>{{ ojSystemEnabled ? '✅ 系统已开放' : '❌ 系统已关闭' }}</span>
            </label>
          </div>
        </div>

        <!-- 中栏：题目详情 + 代码编辑 -->
        <div class="oj-middle">
          <div v-if="ojCurrentProblem" class="oj-problem-detail">
            <div class="oj-problem-header">
              <span class="oj-problem-id">#{{ ojCurrentProblem.id }}</span>
              <span class="oj-problem-title">{{ ojCurrentProblem.title }}</span>
              <span class="oj-problem-limits" v-if="ojCurrentProblem.time_limit">
                ⏱ {{ ojCurrentProblem.time_limit }}s / 💾 {{ ojCurrentProblem.memory_limit }}MB
              </span>
            </div>
            <div class="oj-problem-body" v-html="renderMd(ojCurrentProblem.description)"></div>
          </div>
          <div v-else class="oj-placeholder">
            <p>👈 输入题号或点击左侧题目</p>
          </div>
          <!-- 代码编辑器 -->
          <div class="oj-editor-area">
            <div class="oj-editor-header">
              <span>📝 C++ 代码</span>
              <div class="oj-editor-actions">
                <button class="oj-btn-hint" @click="getOjHint" :disabled="ojLoading || !ojCurrentProblem">
                  💡 思路提示
                </button>
                <button class="oj-btn-debug" @click="getOjDebugHint" :disabled="ojLoading || !ojCode.trim()">
                  🔧 调试引导
                </button>
                <button class="oj-btn-submit" @click="submitOjCode" :disabled="ojLoading || !ojCode.trim()">
                  {{ ojLoading ? '⏳ 分析中...' : '🚀 提交分析' }}
                </button>
              </div>
            </div>
            <textarea v-model="ojCode" class="oj-code-editor" placeholder="#include <iostream>&#10;using namespace std;&#10;&#10;int main() {&#10;    // 你的代码&#10;    return 0;&#10;}" spellcheck="false"></textarea>
          </div>
        </div>

        <!-- 右栏：结果 -->
        <div class="oj-right">
          <div class="oj-section-title">📊 分析结果</div>
          <!-- 编译状态 -->
          <div v-if="ojResult.compile !== null" class="oj-status-card" :class="ojResult.compile?.compile_success ? 'oj-pass' : 'oj-fail'">
            <div class="oj-status-title">{{ ojResult.compile?.compile_success ? '✅ 编译成功' : '❌ 编译失败' }}</div>
            <pre v-if="ojResult.compile?.compile_output" class="oj-compile-output">{{ ojResult.compile.compile_output }}</pre>
          </div>
          <!-- 样例结果 -->
          <div v-if="ojResult.samples" class="oj-samples-card">
            <div class="oj-status-title">{{ ojResult.samples.message }}</div>
            <div v-for="r in ojResult.samples.results" :key="r.index" class="oj-sample-item" :class="'oj-sample-' + r.status">
              <div class="oj-sample-header">样例 {{ r.index + 1 }}: {{ r.message }}</div>
              <div v-if="r.status === 'fail'" class="oj-sample-detail">
                <div>期望: <code>{{ r.expected?.slice(0, 200) }}</code></div>
                <div>实际: <code>{{ r.actual?.slice(0, 200) }}</code></div>
              </div>
            </div>
          </div>
          <!-- AI 分析 -->
          <div v-if="ojResult.analysis" class="oj-analysis-card">
            <div class="oj-status-title">🤖 AI 分析报告</div>
            <div class="oj-analysis-body" v-html="renderMd(ojResult.analysis)"></div>
          </div>
          <!-- 思路提示 / 调试引导 -->
          <div v-if="ojResult.hint" class="oj-hint-card">
            <div class="oj-status-title">💡 思路提示</div>
            <div class="oj-hint-body" v-html="renderMd(ojResult.hint)"></div>
          </div>
          <div v-if="ojResult.debugHint" class="oj-hint-card">
            <div class="oj-status-title">🔧 调试引导</div>
            <div class="oj-hint-body" v-html="renderMd(ojResult.debugHint)"></div>
          </div>
          <!-- 空状态 -->
          <div v-if="!ojResult.compile && !ojResult.samples && !ojResult.analysis && !ojResult.hint && !ojResult.debugHint" class="oj-placeholder">
            <p>提交代码后，结果会显示在这里</p>
          </div>
        </div>
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

// OJ 调试数据
const ojProblems = ref([]);
const ojProblemId = ref('');
const ojCurrentProblem = ref(null);
const ojCode = ref('');
const ojLoading = ref(false);
const ojSystemEnabled = ref(true);
const ojResult = ref({ compile: null, samples: null, analysis: null, hint: null, debugHint: null });

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

// ========== OJ 调试功能 ==========

// 加载内置题目列表
async function loadOjProblems() {
  try {
    const resp = await fetch('/api/oj/problems');
    const data = await resp.json();
    ojProblems.value = data.problems || [];
    ojSystemEnabled.value = data.system_enabled;
  } catch (e) {}
}

// 获取题目详情
async function fetchOjProblem() {
  const id = ojProblemId.value.trim();
  if (!id) return;
  ojLoading.value = true;
  try {
    const resp = await fetch(`/api/oj/problem/${id}`);
    const data = await resp.json();
    if (data.error) {
      alert(data.error);
    } else {
      ojCurrentProblem.value = data;
    }
  } catch (e) {
    alert('获取题目失败: ' + e.message);
  }
  ojLoading.value = false;
}

// 提交代码
async function submitOjCode() {
  if (!ojCode.value.trim()) return;
  ojLoading.value = true;
  ojResult.value = { compile: null, samples: null, analysis: null, hint: null, debugHint: null };

  await streamPost('/api/oj/submit', {
    problem_id: ojCurrentProblem.value?.id,
    code: ojCode.value,
  }, (chunk) => {
    try {
      const parsed = JSON.parse(chunk);
      if (parsed.type === 'compile') {
        ojResult.value.compile = parsed;
        if (parsed.sample_results) ojResult.value.samples = parsed.sample_results;
      } else if (parsed.type === 'analysis') {
        ojResult.value.analysis = (ojResult.value.analysis || '') + parsed.content;
      } else if (parsed.type === 'status') {
        // 状态提示，不处理
      }
    } catch {
      ojResult.value.analysis = (ojResult.value.analysis || '') + chunk;
    }
  });

  ojLoading.value = false;
}

// 思路提示
async function getOjHint() {
  if (!ojCurrentProblem.value) return;
  ojLoading.value = true;
  ojResult.value.hint = '';

  await streamPost('/api/oj/hint', { problem_id: ojCurrentProblem.value.id }, (chunk) => {
    try {
      const parsed = JSON.parse(chunk);
      if (parsed.type === 'hint') ojResult.value.hint += parsed.content;
    } catch {
      ojResult.value.hint += chunk;
    }
  });

  ojLoading.value = false;
}

// 调试引导
async function getOjDebugHint() {
  if (!ojCode.value.trim()) return;
  ojLoading.value = true;
  ojResult.value.debugHint = '';

  await streamPost('/api/oj/debug-hint', {
    problem_id: ojCurrentProblem.value?.id,
    code: ojCode.value,
    compile_output: ojResult.value.compile?.compile_output || '',
  }, (chunk) => {
    try {
      const parsed = JSON.parse(chunk);
      if (parsed.type === 'debug_hint') ojResult.value.debugHint += parsed.content;
    } catch {
      ojResult.value.debugHint += chunk;
    }
  });

  ojLoading.value = false;
}

// 系统开关
async function toggleOjSystem() {
  try {
    await fetch('/api/oj/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: ojSystemEnabled.value }),
    });
  } catch {}
}

// 页面加载时获取题目列表
loadOjProblems();
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

/* ========== OJ 调试三栏布局 ========== */
.oj-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.oj-left {
  width: 220px;
  background: #fff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
}

.oj-middle {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.oj-right {
  width: 380px;
  background: #f8fafc;
  border-left: 1px solid #e2e8f0;
  overflow-y: auto;
  flex-shrink: 0;
  padding: 12px 16px;
}

.oj-section-title {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #4f46e5;
  border-bottom: 1px solid #e2e8f0;
}

.oj-problem-input {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid #e2e8f0;
}

.oj-problem-input input {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  font-size: 12px;
  color: #1e293b;
}

.oj-problem-input input:focus { outline: none; border-color: #4f46e5; }

.oj-problem-input button {
  padding: 5px 10px;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
}

.oj-problem-input button:disabled { opacity: 0.5; }

.oj-problem-list { flex: 1; overflow-y: auto; }

.oj-problem-item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 12px;
  color: #475569;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.1s;
}

.oj-problem-item:hover { background: #f1f5f9; }
.oj-problem-item.active { background: #eef2ff; color: #4f46e5; }

.oj-pid {
  font-weight: 700;
  color: #4f46e5;
  min-width: 40px;
}

.oj-ptitle {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oj-switch-area {
  padding: 10px 14px;
  border-top: 1px solid #e2e8f0;
  font-size: 12px;
}

.oj-switch-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #475569;
}

.oj-switch-label input { accent-color: #4f46e5; }

/* 中栏 */
.oj-problem-detail {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.oj-problem-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.oj-problem-id {
  font-weight: 700;
  color: #4f46e5;
  font-size: 14px;
}

.oj-problem-title {
  font-weight: 600;
  color: #1e293b;
  font-size: 14px;
}

.oj-problem-limits {
  font-size: 11px;
  color: #94a3b8;
}

.oj-problem-body {
  font-size: 13px;
  line-height: 1.7;
  color: #334155;
}

.oj-problem-body :deep(h2) { font-size: 14px; color: #4f46e5; margin: 12px 0 6px; }
.oj-problem-body :deep(h3) { font-size: 13px; color: #4f46e5; margin: 10px 0 4px; }
.oj-problem-body :deep(pre) { background: #f1f5f9; padding: 8px; border-radius: 5px; font-size: 12px; overflow-x: auto; border: 1px solid #e2e8f0; }
.oj-problem-body :deep(code) { font-family: Consolas, Monaco, monospace; font-size: 12px; }
.oj-problem-body :deep(p) { margin: 4px 0; }
.oj-problem-body :deep(strong) { color: #d97706; }

.oj-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 14px;
}

.oj-editor-area {
  display: flex;
  flex-direction: column;
  min-height: 250px;
}

.oj-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  border-top: 1px solid #e2e8f0;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.oj-editor-actions {
  display: flex;
  gap: 6px;
}

.oj-editor-actions button {
  padding: 5px 12px;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
  font-weight: 600;
}

.oj-btn-hint { background: #fef3c7; color: #92400e; }
.oj-btn-hint:hover { background: #fde68a; }
.oj-btn-debug { background: #e0e7ff; color: #3730a3; }
.oj-btn-debug:hover { background: #c7d2fe; }
.oj-btn-submit { background: #4f46e5; color: #fff; }
.oj-btn-submit:hover { background: #4338ca; }
.oj-btn-hint:disabled, .oj-btn-debug:disabled, .oj-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

.oj-code-editor {
  flex: 1;
  padding: 12px 16px;
  background: #1e293b;
  color: #e2e8f0;
  border: none;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: none;
  outline: none;
  tab-size: 4;
}

/* 右栏结果 */
.oj-status-card, .oj-samples-card, .oj-analysis-card, .oj-hint-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
}

.oj-pass { border-left: 4px solid #22c55e; }
.oj-fail { border-left: 4px solid #ef4444; }

.oj-status-title {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
}

.oj-compile-output {
  background: #f1f5f9;
  padding: 8px;
  border-radius: 5px;
  font-size: 11px;
  font-family: Consolas, Monaco, monospace;
  overflow-x: auto;
  color: #475569;
  border: 1px solid #e2e8f0;
  white-space: pre-wrap;
  word-break: break-all;
}

.oj-sample-item {
  padding: 6px 0;
  border-bottom: 1px solid #f1f5f9;
  font-size: 12px;
}

.oj-sample-item:last-child { border-bottom: none; }
.oj-sample-header { font-weight: 600; }
.oj-sample-pass .oj-sample-header { color: #16a34a; }
.oj-sample-fail .oj-sample-header { color: #dc2626; }
.oj-sample-timeout .oj-sample-header { color: #d97706; }

.oj-sample-detail {
  margin-top: 4px;
  font-size: 11px;
  color: #64748b;
}

.oj-sample-detail code {
  background: #f1f5f9;
  padding: 1px 4px;
  border-radius: 3px;
  font-family: Consolas, Monaco, monospace;
  font-size: 11px;
  word-break: break-all;
}

.oj-analysis-body, .oj-hint-body {
  font-size: 13px;
  line-height: 1.7;
  color: #334155;
}

.oj-analysis-body :deep(h2), .oj-hint-body :deep(h2) { font-size: 14px; color: #4f46e5; margin: 10px 0 6px; }
.oj-analysis-body :deep(h3), .oj-hint-body :deep(h3) { font-size: 13px; color: #4f46e5; margin: 8px 0 4px; }
.oj-analysis-body :deep(strong), .oj-hint-body :deep(strong) { color: #d97706; }
.oj-analysis-body :deep(pre), .oj-hint-body :deep(pre) { background: #f1f5f9; padding: 8px; border-radius: 5px; font-size: 12px; border: 1px solid #e2e8f0; }
.oj-analysis-body :deep(code), .oj-hint-body :deep(code) { font-family: Consolas, Monaco, monospace; font-size: 12px; }
.oj-analysis-body :deep(p), .oj-hint-body :deep(p) { margin: 4px 0; }
.oj-analysis-body :deep(ul), .oj-hint-body :deep(ul) { padding-left: 18px; margin: 4px 0; }
.oj-analysis-body :deep(li), .oj-hint-body :deep(li) { margin: 3px 0; }
</style>
