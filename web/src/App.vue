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

      <!-- Algorithm quick card -->
      <div v-else-if="activeTool === 'opener'" class="tool-panel">
        <h2>⚡ 算法速懂卡</h2>
        <div class="input-row">
          <input
            v-model="courseTopic"
            placeholder="输入算法或题型，如：单调栈、BFS、DP背包"
            @keydown.enter="generateOpener"
          />
          <button @click="generateOpener" :disabled="loading">
            {{ loading ? '生成中...' : '⚡ 生成速懂卡' }}
          </button>
        </div>
        <div v-if="loading && !brainstormData" class="loading-card">
          <div class="loading-orbit">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="loading-copy">
            <strong>AI 正在把算法揉成一张速懂卡...</strong>
            <div class="tip-window">
              <div class="tip-track">
                <p v-for="tip in loadingTips" :key="tip">{{ tip }}</p>
              </div>
            </div>
          </div>
        </div>
        <div v-if="brainstormData" class="brainstorm-result">
          <div class="brainstorm-card group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 border-l-4 border-l-indigo-500">
            <div class="px-8 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-cyan-50">
              <h3 class="text-5xl font-bold tracking-wide flex items-center gap-4">
                <span class="text-6xl">⚡</span>
                <span class="text-indigo-600">{{ brainstormData.title || '算法速懂卡' }}</span>
              </h3>
            </div>
            <div class="quick-card-grid px-8 py-6">
              <section
                v-for="section in algorithmCardSections"
                :key="section.title"
                class="quick-card-section"
                :class="{ wide: section.wide }"
              >
                <h4>
                  <span>{{ section.icon }}</span>
                  {{ section.title }}
                </h4>
                <div class="brainstorm-content" v-html="renderMd(section.content)"></div>
              </section>
            </div>
          </div>
        </div>
        <div v-else-if="result" class="result-area" v-html="renderedResult"></div>
      </div>

      <AlgorithmVisualizer v-else-if="activeTool === 'visualizer'" />

      <!-- Edge case mode -->
      <div v-else-if="activeTool === 'edge-case'" class="tool-panel">
        <h2>🧨 边界盲盒</h2>
        <div class="module-note">
          <strong>解决「样例通过，提交显示解答错误」的问题</strong>
          <span>自动挖出隐藏测试里最容易卡人的最大值、最小值、重复值、不可达、多个最优等边界数据。</span>
        </div>
        <div class="input-row">
          <input
            v-model="problemId"
            placeholder="输入4位题号，如：1000"
            maxlength="4"
            @keydown.enter="fetchProblemById"
          />
          <button @click="fetchProblemById" :disabled="fetchingProblem || !/^\d{4}$/.test(problemId)">
            {{ fetchingProblem ? '获取中...' : '🔎 获取题面' }}
          </button>
        </div>
        <p class="helper-text" v-if="problemFetchMessage">{{ problemFetchMessage }}</p>
        <textarea v-model="problemDesc" placeholder="粘贴题目描述..." rows="4"></textarea>
        <textarea v-model="studentCode" placeholder="粘贴学生代码（可选）..." rows="6"></textarea>
        <button @click="generateEdgeCases" :disabled="loading">
          {{ loading ? '生成中...' : '🧨 生成边界测试点' }}
        </button>
        <div v-if="loading && (!result || teachingAction === 'generate-exercise')" class="loading-card compact">
          <div class="loading-orbit"><span></span><span></span><span></span></div>
          <div class="loading-copy"><strong>AI 正在翻找边界角落...</strong></div>
        </div>
        <div v-if="edgeCases.length" class="edge-case-grid">
          <section v-for="(item, index) in edgeCases" :key="index" class="edge-case-card">
            <h4>{{ item.title || `测试点 ${index + 1}` }}</h4>
            <p class="edge-tag">{{ item.boundaryType }}</p>
            <div class="io-grid">
              <div>
                <strong>测试点输入</strong>
                <pre>{{ item.testInput }}</pre>
              </div>
              <div>
                <strong>测试点输出</strong>
                <pre>{{ item.expectedOutput }}</pre>
              </div>
            </div>
            <p class="edge-reason">{{ item.reason }}</p>
          </section>
        </div>
        <div v-else-if="result && !(loading && teachingAction === 'generate-exercise')" class="result-area" v-html="renderedResult"></div>
      </div>

      <!-- Teaching tools -->
      <div v-else-if="activeTool === 'teaching'" class="tool-panel">
        <h2>🧑‍🏫 教学工具箱</h2>
        <div class="input-row">
          <input v-model="courseTopic" placeholder="课程主题，如：单调栈、BFS、DP背包" />
        </div>
        <PromptButtons @action="handleTeachingAction" :loading="loading" />
        <div v-if="loading && !result" class="loading-card compact">
          <div class="loading-orbit"><span></span><span></span><span></span></div>
          <div class="loading-copy"><strong>AI 正在整理课堂节奏...</strong></div>
        </div>
        <div v-if="quizQuestions.length" class="quiz-shell">
          <header class="quiz-header">
            <div>
              <h3>{{ quizTitle }}</h3>
              <p>共 {{ quizQuestions.length }} 道单项选择题，点击选项后立即显示对错和解析。</p>
            </div>
            <div class="quiz-score">
              <span>进度 {{ answeredCount }} / {{ quizQuestions.length }}</span>
              <strong>{{ quizScore }} 分</strong>
            </div>
          </header>
          <section
            v-for="(q, index) in quizQuestions"
            :key="q.id || index"
            class="quiz-card"
            :class="quizCardClass(q, index)"
          >
            <div class="quiz-question">
              <span>第 {{ index + 1 }} 题.</span>
              <div class="quiz-question-content" v-html="renderMd(q.question)"></div>
            </div>
            <div class="quiz-options">
              <button
                v-for="opt in q.options"
                :key="opt.id"
                class="quiz-option"
                :class="quizOptionClass(q, opt)"
                :disabled="quizAnswers[q.id || index]"
                @click="selectQuizAnswer(q, index, opt.id)"
              >
                <b>{{ opt.id }}</b>
                <span class="quiz-option-content" v-html="renderMd(opt.text)"></span>
              </button>
            </div>
            <div v-if="quizAnswers[q.id || index]" class="quiz-explain" :class="{ wrong: quizAnswers[q.id || index] !== q.correctAnswer }">
              <strong>{{ quizAnswers[q.id || index] === q.correctAnswer ? '✅ 回答正确！' : `❌ 回答错误，正确答案是 ${q.correctAnswer}` }}</strong>
              <p><b>📌 题目解析：</b>{{ q.explanation }}</p>
            </div>
          </section>
        </div>
        <div v-else class="result-area" v-html="renderedResult"></div>
      </div>

      <!-- Debug mode -->
      <div v-else-if="activeTool === 'debug'" class="tool-panel">
        <h2>🔍 代码调试</h2>
        <textarea v-model="debugCode" placeholder="粘贴学生C++代码..." rows="10" class="code-input"></textarea>
        <textarea v-model="debugProblem" placeholder="题目描述（可选）..." rows="3"></textarea>
        <button @click="debugCodeAction" :disabled="loading || !debugCode">
          {{ loading ? '分析中...' : '🔍 分析代码' }}
        </button>
        <div v-if="loading && !result" class="loading-card compact">
          <div class="loading-orbit"><span></span><span></span><span></span></div>
          <div class="loading-copy"><strong>AI 正在和 Bug 对视...</strong></div>
        </div>
        <div class="result-area" v-html="renderedResult"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import Sidebar from './components/Sidebar.vue';
import ChatPanel from './components/ChatPanel.vue';
import AlgorithmVisualizer from './components/AlgorithmVisualizer.vue';
import PromptButtons from './components/PromptButtons.vue';
import { streamPost } from './utils/api';

const markdownRenderer = new marked.Renderer();
markdownRenderer.code = (code, infoString) => {
  const language = (infoString || '').trim().split(/\s+/)[0];
  const highlighted = language && hljs.getLanguage(language)
    ? hljs.highlight(code, { language }).value
    : hljs.highlightAuto(code).value;
  return `<pre><code class="hljs language-${language || 'plaintext'}">${highlighted}</code></pre>`;
};

// Code fences keep their indentation and use the existing highlight.js theme.
marked.setOptions({
  renderer: markdownRenderer,
  breaks: true,
});

const activeTool = ref('chat');
const courseTopic = ref('');
const loading = ref(false);
const result = ref('');
const brainstormData = ref(null);

const problemDesc = ref('');
const problemId = ref('');
const fetchingProblem = ref(false);
const problemFetchMessage = ref('');
const edgeCases = ref([]);
const studentCode = ref('');
const debugCode = ref('');
const debugProblem = ref('');
const teachingAction = ref('');
const newsTips = ref([]);
const quizTitle = ref('');
const quizQuestions = ref([]);
const quizAnswers = ref({});

const fallbackTips = [
  '好算法像好口诀：先抓住题眼，再背模板。',
  '正在挑一个六年级也能听懂的比喻。',
  '把大段解释切成小卡片，眼睛会轻松很多。',
  '别急，AI 正在把复杂算法拆成小块。',
  '老师备课小秘诀：先讲题眼，再讲代码。',
];

const loadingTips = computed(() => {
  return newsTips.value.length ? newsTips.value : fallbackTips;
});

const renderedResult = computed(() => {
  return result.value ? marked.parse(result.value) : '';
});

const algorithmCardSections = computed(() => {
  return getAlgorithmCardSections(brainstormData.value);
});

const answeredCount = computed(() => Object.keys(quizAnswers.value).length);
const quizScore = computed(() => {
  if (!quizQuestions.value.length) return 0;
  const perQuestion = Math.round(100 / quizQuestions.value.length);
  return quizQuestions.value.reduce((score, q, index) => {
    const key = q.id || index;
    return score + (quizAnswers.value[key] === q.correctAnswer ? perQuestion : 0);
  }, 0);
});

function renderMd(text) {
  if (!text) return '';
  // 先让 marked 解析 markdown，再手动处理加粗（防止 marked 漏掉中文加粗）
  let html = marked.parse(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return html;
}

function getAlgorithmCardSections(card) {
  if (!card) return [];
  if (card.brainstorm) {
    return [{ title: '速懂内容', icon: '⚡', content: card.brainstorm, wide: true }];
  }

  const sections = [
    ['一句话讲清楚', '🎯', card.oneSentence],
    ['什么时候想到它', '🔎', card.whenToUse],
    ['生活比喻', '🎬', card.analogy],
    ['核心动作', '⚙️', card.coreSteps],
    ['算法小故事', '📚', card.story || card.quiz, true],
    ['C++ 最小模板', '💻', card.cppTemplate && `\`\`\`cpp\n${card.cppTemplate}\n\`\`\``, true],
    ['易错点', '⚠️', card.pitfalls],
  ];

  return sections
    .filter(([, , content]) => content)
    .map(([title, icon, content, wide]) => ({
      title,
      icon,
      wide: Boolean(wide),
      content: Array.isArray(content) ? content.map(item => `- ${item}`).join('\n') : content,
    }));
}

onMounted(loadNewsTips);

async function loadNewsTips() {
  try {
    const resp = await fetch('/api/news');
    const data = await resp.json();
    newsTips.value = (data.items || [])
      .filter(item => item.title)
      .slice(0, 5)
      .map(item => item.title);
  } catch (e) {
    newsTips.value = [];
  }
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
  edgeCases.value = [];
  await streamPost('/api/edge-case', { problem: problemDesc.value, code: studentCode.value }, (chunk) => {
    result.value += chunk;
  });
  parseEdgeCases();
  if (!result.value.trim() && !edgeCases.value.length) {
    result.value = '⚠️ 模型没有返回内容，请稍后重试。';
  }
  loading.value = false;
}

function parseEdgeCases() {
  try {
    let cleaned = result.value.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    const parsed = JSON.parse(cleaned);
    edgeCases.value = Array.isArray(parsed) ? parsed : (parsed.cases || []);
    if (edgeCases.value.length) result.value = '';
  } catch (e) {
    edgeCases.value = [];
  }
}

async function fetchProblemById() {
  if (!/^\d{4}$/.test(problemId.value)) {
    problemFetchMessage.value = '请输入4位数字题号';
    return;
  }

  fetchingProblem.value = true;
  problemFetchMessage.value = '';
  try {
    const resp = await fetch(`/api/edge-case/problem/${problemId.value}`);
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || '获取题目失败');
    problemDesc.value = data.description;
    problemFetchMessage.value = `已获取：${data.title}`;
  } catch (err) {
    problemFetchMessage.value = err.message;
  } finally {
    fetchingProblem.value = false;
  }
}

async function handleTeachingAction(action) {
  if (!courseTopic.value) {
    result.value = '⚠️ 请先输入课程主题';
    return;
  }
  teachingAction.value = action;
  loading.value = true;
  result.value = '';
  quizTitle.value = '';
  quizQuestions.value = [];
  quizAnswers.value = {};

  const endpoint = `/api/${action}`;
  const body = { courseTopic: courseTopic.value };

  if (action === 'generate-exercise') {
    body.count = 10;
  }
  if (action === 'generate-script') {
    body.duration = 45;
  }

  let streamed = '';
  await streamPost(endpoint, body, (chunk) => {
    streamed += chunk;
    if (action !== 'generate-exercise') {
      result.value += chunk;
    }
  });
  if (action === 'generate-exercise') {
    result.value = streamed;
    parseQuizResult();
  }
  loading.value = false;
}

function parseQuizResult() {
  try {
    let cleaned = result.value.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    const data = JSON.parse(cleaned);
    quizTitle.value = data.title || `${courseTopic.value} 选择题自测`;
    quizQuestions.value = data.questions || [];
    if (quizQuestions.value.length) result.value = '';
  } catch (e) {
    quizQuestions.value = [];
    result.value = '⚠️ 练习题格式解析失败，请重试。';
  }
}

function selectQuizAnswer(question, index, optionId) {
  const key = question.id || index;
  if (quizAnswers.value[key]) return;
  quizAnswers.value = { ...quizAnswers.value, [key]: optionId };
}

function quizOptionClass(question, option) {
  const key = question.id || quizQuestions.value.indexOf(question);
  const selected = quizAnswers.value[key];
  if (!selected) return '';
  if (option.id === question.correctAnswer) return 'correct';
  if (option.id === selected) return 'wrong';
  return 'muted';
}

function quizCardClass(question, index) {
  const key = question.id || index;
  const selected = quizAnswers.value[key];
  if (!selected) return '';
  return selected === question.correctAnswer ? 'answered-correct' : 'answered-wrong';
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

.helper-text {
  color: #64748b;
  font-size: 13px;
}

.module-note {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-left: 4px solid #f97316;
  border-radius: 8px;
  color: #7c2d12;
}

.module-note strong {
  font-size: 15px;
}

.module-note span {
  color: #9a3412;
  font-size: 13px;
  line-height: 1.5;
}

.edge-case-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.edge-case-card {
  min-width: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #f59e0b;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
}

.edge-case-card h4 {
  color: #4f46e5;
  font-size: 16px;
  margin-bottom: 8px;
}

.edge-tag {
  display: inline-block;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 12px;
  margin-bottom: 12px;
}

.io-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.io-grid strong {
  display: block;
  margin-bottom: 6px;
  color: #1e293b;
  font-size: 13px;
}

.io-grid pre {
  min-height: 74px;
  margin: 0;
  padding: 10px;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.5;
}

.edge-reason {
  margin-top: 12px;
  color: #475569;
  font-size: 14px;
  line-height: 1.6;
}

.quiz-shell {
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 980px;
  width: 100%;
  align-self: center;
}

.quiz-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-top: 4px solid #3b82f6;
  border-radius: 8px;
  padding: 16px;
}

.quiz-header h3 {
  color: #1e293b;
  font-size: 18px;
  margin-bottom: 4px;
}

.quiz-header p {
  color: #64748b;
  font-size: 13px;
}

.quiz-score {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
}

.quiz-score span,
.quiz-score strong {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
}

.quiz-score span {
  background: #eff6ff;
  color: #1d4ed8;
}

.quiz-score strong {
  background: #ecfdf5;
  color: #047857;
}

.quiz-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 24px;
  box-shadow: none;
}

.quiz-card.answered-correct {
  background: #f2fbf5;
  border-color: #38c976;
}

.quiz-card.answered-wrong {
  background: #fff7f7;
  border-color: #ff4d4f;
}

.quiz-question {
  color: #1e293b;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.6;
  margin-bottom: 20px;
}

.quiz-question > span {
  float: left;
  margin-right: 8px;
  color: #1e293b;
  font-size: 20px;
}

.quiz-question-content::after {
  content: '';
  display: block;
  clear: both;
}

.quiz-question-content p {
  margin: 0 0 14px;
}

.quiz-question-content pre {
  clear: both;
  margin: 14px 0 0;
  padding: 16px 20px;
  background: #1e293b;
  color: #d1d5db;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 15px;
  line-height: 1.7;
  font-weight: 400;
}

.quiz-question-content pre code.hljs {
  padding: 0;
  background: transparent;
}

.quiz-options {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.tool-panel .quiz-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-height: 58px;
  padding: 14px 18px;
  background: #fff;
  border: 1.5px solid #cbd5e1;
  border-radius: 6px;
  color: #525252;
  text-align: left;
  cursor: pointer;
  font-size: 18px;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.tool-panel .quiz-option:hover:not(:disabled) {
  border-color: #3b82f6;
  background: #eff6ff;
}

.quiz-option b {
  width: auto;
  height: auto;
  display: inline;
  background: transparent;
  border: none;
  border-radius: 0;
  flex-shrink: 0;
}

.quiz-option-content {
  flex: 1;
  min-width: 0;
}

.quiz-option-content p {
  margin: 0;
}

.quiz-option-content pre {
  margin: 0;
  padding: 12px 14px;
  background: #1e293b;
  color: #d1d5db;
  border-radius: 5px;
  overflow-x: auto;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.7;
}

.quiz-option-content pre code.hljs {
  padding: 0;
  background: transparent;
}

.quiz-option.correct {
  border-color: #55cf89;
  background: #55cf89;
  color: #fff;
  font-weight: 700;
}

.quiz-option.wrong {
  border-color: #ef6a60;
  background: #ef6a60;
  color: #fff;
  font-weight: 700;
}

.tool-panel .quiz-option.muted {
  opacity: 1;
  background: #fff;
}

.tool-panel .quiz-option:disabled {
  opacity: 1;
}

.quiz-explain {
  margin-top: 28px;
  padding: 0;
  background: transparent;
  border-left: none;
  border-radius: 0;
  color: #22c55e;
  font-size: 18px;
}

.quiz-explain.wrong {
  background: transparent;
  border-left-color: transparent;
  color: #ef4444;
}

.quiz-explain p {
  margin-top: 12px;
  padding: 14px 18px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  color: #475569;
  line-height: 1.8;
  font-size: 17px;
}

.quiz-explain p b {
  color: #334155;
  margin-right: 6px;
}

.loading-card {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 20px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #06b6d4;
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
}

.loading-card.compact {
  flex: 0 0 auto;
}

.loading-orbit {
  width: 54px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-shrink: 0;
}

.loading-orbit span {
  width: 10px;
  height: 10px;
  background: #4f46e5;
  border-radius: 999px;
  animation: loading-bounce 0.9s ease-in-out infinite;
}

.loading-orbit span:nth-child(2) {
  animation-delay: 0.15s;
  background: #06b6d4;
}

.loading-orbit span:nth-child(3) {
  animation-delay: 0.3s;
  background: #f59e0b;
}

.loading-copy {
  min-width: 0;
  color: #1e293b;
}

.loading-copy strong {
  display: block;
  font-size: 15px;
  margin-bottom: 4px;
}

.tip-window {
  height: 24px;
  overflow: hidden;
  color: #64748b;
  font-size: 13px;
}

.tip-track {
  animation: tip-scroll 12s steps(5) infinite;
}

.tip-track p {
  height: 24px;
  line-height: 24px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@keyframes loading-bounce {
  0%, 80%, 100% {
    transform: translateY(0);
    opacity: 0.45;
  }
  40% {
    transform: translateY(-12px);
    opacity: 1;
  }
}

@keyframes tip-scroll {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-120px);
  }
}

/* 算法速懂卡 */
.brainstorm-result {
  flex: 1;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  padding: 20px 24px 0;
}

.brainstorm-card {
  max-width: 1080px;
  width: 100%;
  align-self: flex-start;
}

.quick-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.quick-card-section {
  min-width: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
}

.quick-card-section.wide {
  grid-column: 1 / -1;
}

.quick-card-section h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: #4f46e5;
  font-size: 16px;
}

.brainstorm-content :deep(strong) {
  color: #d97706;
  font-weight: 800;
}

.brainstorm-content :deep(h3) {
  margin: 18px 0 10px;
  color: #4f46e5;
  font-size: 20px;
}

.brainstorm-content :deep(ul) {
  list-style: none;
  padding-left: 0;
}

.brainstorm-content :deep(li) {
  position: relative;
  padding: 10px 14px 10px 36px;
  margin: 8px 0;
  background: #f0f5ff;
  border-radius: 8px;
  border-left: 4px solid #6366f1;
  font-size: 15px;
  line-height: 1.7;
  color: #1e293b;
}

.brainstorm-content :deep(li)::before {
  content: '⚡';
  position: absolute;
  left: 12px;
  top: 10px;
  font-size: 16px;
}

.brainstorm-content :deep(p) {
  font-size: 15px;
  line-height: 1.7;
  color: #1e293b;
}

.brainstorm-content :deep(pre) {
  background: #0f172a;
  color: #e2e8f0;
  padding: 14px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 10px 0 16px;
}

.brainstorm-content :deep(code) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
}

.brainstorm-content :deep(em) {
  color: #ea580c;
  font-style: normal;
}

@media (max-width: 900px) {
  .quick-card-grid,
  .edge-case-grid,
  .io-grid,
  .quiz-options {
    grid-template-columns: 1fr;
  }

  .quiz-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
