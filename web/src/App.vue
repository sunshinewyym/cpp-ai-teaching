<template>
  <div class="app-container">
    <Sidebar
      :activeTool="activeTool"
      @select-tool="switchTool"
    />
    <div class="main-content">
      <header class="app-header">
        <h1>🎓 C++ AI 教学助手</h1>
        <span class="course-label" v-if="courseTopic">📚 {{ courseTopic }}</span>
      </header>

      <!-- Chat mode -->
      <ChatPanel
        v-if="activeTool === 'chat'"
      />

      <!-- Algorithm quick card -->
      <div v-else-if="activeTool === 'opener'" class="tool-panel">
        <h2>⚡ 算法速懂卡</h2>
        <div class="input-row">
          <input
            v-model="courseTopic"
            placeholder="输入算法或题型，例如：单调栈、BFS、DP 背包"
            @keydown.enter="generateOpener"
          />
          <button @click="generateOpener" :disabled="loading">
            {{ loading ? '生成中……' : '⚡ 生成速懂卡' }}
          </button>
        </div>
        <div v-if="loading && !brainstormData" class="loading-card">
          <div class="loading-orbit">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="loading-copy">
            <strong>AI 正在把算法整理成一张速懂卡……</strong>
            <div class="tip-window">
              <div class="tip-track">
                <p v-for="tip in loadingTips" :key="tip">{{ tip }}</p>
              </div>
            </div>
          </div>
        </div>
        <section v-if="!loading && !brainstormData && !result" class="quick-card-empty" aria-label="算法速懂卡使用提示">
          <div class="quick-card-empty-mark" aria-hidden="true">⚡</div>
          <h3>一起把算法讲明白</h3>
          <p>输入一个算法或题型，我会把它整理成适合课堂观看的算法速懂卡。</p>
          <div class="quick-card-empty-suggestions">
            <button type="button" @click="useQuickCardExample('BFS 广度优先搜索')">🗺️ BFS</button>
            <button type="button" @click="useQuickCardExample('二分查找')">🔎 二分查找</button>
            <button type="button" @click="useQuickCardExample('背包 DP')">🎒 背包 DP</button>
          </div>
        </section>
        <div v-if="brainstormData" class="brainstorm-result">
          <div class="quick-card-actions">
            <button @click="exportAlgorithmCards" :disabled="exportingCard" class="export-card-button">
              {{ exportingCard ? '正在导出……' : '🖼️ 导出全部卡牌' }}
            </button>
          </div>
          <div ref="quickCardExport" class="brainstorm-card group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 border-l-4 border-l-indigo-500">
            <div class="px-8 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-cyan-50">
              <h3 class="text-4xl font-bold tracking-wide flex items-center gap-4">
                <span class="text-5xl">⚡</span>
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

      <SyntaxVisualizer v-else-if="activeTool === 'syntax-visualizer'" />

      <CspPractice v-else-if="activeTool === 'csp-practice'" />

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
            placeholder="输入 4 位题号，例如：1000"
            maxlength="4"
            @keydown.enter="fetchProblemById"
          />
          <button @click="fetchProblemById" :disabled="fetchingProblem || !/^\d{4}$/.test(problemId)">
            {{ fetchingProblem ? '获取中……' : '🔎 获取题面' }}
          </button>
        </div>
        <p class="helper-text" v-if="problemFetchMessage">{{ problemFetchMessage }}</p>
        <textarea v-model="problemDesc" placeholder="粘贴题目描述" rows="4"></textarea>
        <textarea v-model="studentCode" placeholder="粘贴学生代码（可选）" rows="6"></textarea>
        <button @click="generateEdgeCases" :disabled="loading">
          {{ loading ? '生成中……' : '🧨 生成边界测试点' }}
        </button>
        <div v-if="loading && !edgeCases.length" class="loading-card compact">
          <div class="loading-orbit"><span></span><span></span><span></span></div>
          <div class="loading-copy">
            <strong>AI 正在检查容易遗漏的边界……</strong>
            <div class="tip-window"><div class="tip-track"><p v-for="tip in loadingTips" :key="tip">{{ tip }}</p></div></div>
          </div>
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
          <input v-model="courseTopic" placeholder="课程主题，例如：单调栈、BFS、DP 背包" />
        </div>
        <PromptButtons @action="handleTeachingAction" :loading="loading" />
        <section v-if="teachingAction === 'algorithm-coach'" class="coach-tool">
          <details class="coach-inputs" :open="!hintInputsCollapsed" @toggle="hintInputsCollapsed = !$event.target.open">
            <summary>题目设置</summary>
            <div class="hint-tool-card">
              <div class="module-note">
                <strong>先指出关键点，再引导学生自己完成</strong>
                <span>教练会根据题目难度安排提示层数。简单题直接讲清关键思路，复杂题逐层展开；只在确有必要时用一个例子检验理解。</span>
              </div>
              <div class="input-row">
                <input
                  v-model="hintProblemId"
                  placeholder="输入 4 位题号，例如：1000"
                  maxlength="4"
                  inputmode="numeric"
                  @keydown.enter="fetchHintProblemById"
                />
                <button @click="fetchHintProblemById" :disabled="fetchingHintProblem || !/^\d{4}$/.test(hintProblemId)">
                  {{ fetchingHintProblem ? '获取中……' : '🔎 获取题面' }}
                </button>
              </div>
              <p class="helper-text" v-if="hintProblemFetchMessage">{{ hintProblemFetchMessage }}</p>
              <textarea v-model="hintProblem" placeholder="也可以直接粘贴题目描述" rows="9"></textarea>
              <button @click="startAlgorithmCoach" :disabled="loading || !hintProblem">
                {{ loading ? '准备中……' : '🧭 开始算法教练' }}
              </button>
            </div>
          </details>

          <p v-if="coachError" class="coach-error">{{ coachError }}</p>
          <div v-if="coachHistory.length || coachResponse" class="coach-shell">
            <header class="coach-header">
              <div>
                <span class="coach-stage">{{ coachStageLabel(coachResponse?.stage) }}</span>
                <strong>{{ coachResponse?.focus }}</strong>
              </div>
              <div class="coach-header-actions">
                <span>提示层 {{ Math.max(1, coachHistory.length) }}</span>
                <button type="button" @click="resetAlgorithmCoach">重新开始</button>
              </div>
            </header>

            <section class="coach-key-route" aria-label="关键提示路线">
              <header>
                <strong>关键提示路线</strong>
                <span>已整理 {{ coachHistory.length }} 条</span>
              </header>
              <ol>
                <li
                  v-for="(turn, index) in coachHistory"
                  :key="`hint-${index}`"
                  :class="{ current: index === coachHistory.length - 1 }"
                >
                  <b>{{ index + 1 }}</b>
                  <div>
                    <strong>{{ turn.response.focus }}</strong>
                    <p>{{ turn.response.key_hint }}</p>
                  </div>
                </li>
              </ol>
            </section>

            <div class="coach-history" aria-live="polite">
              <article v-for="(turn, index) in coachHistory.slice(-1)" :key="index" class="coach-turn-card">
                <p v-if="turn.student" class="coach-student"><strong>学生：</strong>{{ turn.student }}</p>
                <div class="coach-thinking">
                  <strong>这一层怎么想</strong>
                  <p>{{ turn.response.coach_message }}</p>
                </div>
              </article>
            </div>

            <div v-if="coachResponse && coachResponse.stage !== 'COMPLETE'" class="coach-next">
              <template v-if="coachResponse.choices?.length">
                <h3>{{ coachResponse.question }}</h3>
                <div class="coach-choices">
                  <button
                    v-for="choice in coachResponse.choices"
                    :key="choice.id"
                    type="button"
                    class="coach-choice"
                    :disabled="loading"
                    @click="sendCoachTurn('', choice)"
                  >
                    <b>{{ choice.id }}</b>
                    <span>{{ choice.text }}</span>
                  </button>
                </div>
              </template>
              <button
                v-else
                type="button"
                class="coach-continue"
                :disabled="loading"
                @click="continueAlgorithmCoach"
              >
                {{ loading ? '正在整理下一层提示……' : '看下一层提示' }}
              </button>
            </div>
          </div>
        </section>
        <div v-if="loading && !result" class="loading-card compact">
          <div class="loading-orbit"><span></span><span></span><span></span></div>
          <div class="loading-copy">
            <strong>AI 正在整理课堂节奏……</strong>
            <div class="tip-window"><div class="tip-track"><p v-for="tip in loadingTips" :key="tip">{{ tip }}</p></div></div>
          </div>
        </div>
        <ProblemList v-if="teachingAction === 'show-problem-list'" />
        <div v-else-if="quizQuestions.length" class="quiz-shell">
          <header class="quiz-header">
            <div>
              <h3>{{ quizTitle }}</h3>
            <p>共 {{ quizQuestions.length }} 道单项选择题，点击选项后立即显示对错和解析；题目有问题可单独换题。</p>
            </div>
            <div class="quiz-score">
              <span>进度 {{ answeredCount }}/{{ quizQuestions.length }}</span>
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
              <span>第 {{ index + 1 }} 题</span>
              <div class="quiz-question-content" v-html="renderMd(q.question)"></div>
              <button
                type="button"
                class="quiz-regenerate"
                :disabled="loading || quizRegenerating[index]"
                @click.stop="regenerateQuizQuestion(q, index)"
              >
                {{ quizRegenerating[index] ? '生成中……' : '↻ 换一道题' }}
              </button>
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
              <strong>{{ quizAnswers[q.id || index] === q.correctAnswer ? '✅ 回答正确' : `❌ 回答错误，正确答案是 ${q.correctAnswer}` }}</strong>
              <p><b>📌 题目解析：</b>{{ q.explanation }}</p>
            </div>
          </section>
        </div>
        <div v-else-if="teachingAction !== 'algorithm-coach'" class="result-area" v-html="renderedResult"></div>
      </div>

      <!-- Debug mode -->
      <div v-else-if="activeTool === 'debug'" class="tool-panel">
        <h2>🔍 代码调试</h2>
        <details class="debug-inputs" :open="!debugInputsCollapsed" @toggle="debugInputsCollapsed = !$event.target.open">
          <summary>题目描述与学生代码</summary>
        <div class="input-row">
          <input
            v-model="debugProblemId"
            placeholder="输入 4 位题号，例如：1000"
            maxlength="4"
            inputmode="numeric"
            @keydown.enter="fetchDebugProblemById"
          />
          <button
            @click="fetchDebugProblemById"
            :disabled="fetchingDebugProblem || !/^\d{4}$/.test(debugProblemId)"
          >
            {{ fetchingDebugProblem ? '获取中……' : '🔎 获取题面' }}
          </button>
        </div>
        <p class="helper-text" v-if="debugProblemFetchMessage">{{ debugProblemFetchMessage }}</p>
        <textarea v-model="debugProblem" @input="debugSamples = []" placeholder="题目描述（可选）" rows="8"></textarea>
        <textarea v-model="debugCode" placeholder="粘贴学生 C++ 代码" rows="10" class="code-input"></textarea>
        <button @click="debugCodeAction" :disabled="loading || !debugCode">
          {{ loading ? '分析中……' : '🔍 分析代码' }}
        </button>
        </details>
        <div class="result-area" v-html="renderedResult"></div>
        <div v-if="loading" class="loading-card compact">
          <div class="loading-orbit"><span></span><span></span><span></span></div>
          <div class="loading-copy">
            <strong>{{ debugHintLoading ? 'AI 正在准备进一步提示……' : (debugGeneratingEdges ? 'AI 正在设计边界测试点……' : 'AI 正在检查 Bug……') }}</strong>
            <div class="tip-window"><div class="tip-track"><p v-for="tip in loadingTips" :key="tip">{{ tip }}</p></div></div>
          </div>
        </div>
        <div v-if="debugCanAskMore" class="debug-hint-action">
          <button @click="requestFurtherDebugHint" :disabled="loading || debugHintLoading">
            {{ debugHintLoading ? '生成中……' : '💡 获取进一步提示' }}
          </button>
          <span>提示会更具体，但不会提供完整代码或直接答案。</span>
        </div>
        <section v-if="debugEdgeCases.length" class="debug-edge-output">
          <h3>边界盲盒测试点</h3>
          <div class="edge-case-grid">
            <article v-for="(item, index) in debugEdgeCases" :key="index" class="edge-case-card">
              <h4>{{ item.title || `测试点 ${index + 1}` }}</h4>
              <p class="edge-tag">{{ item.boundaryType }}</p>
              <div class="io-grid">
                <div><strong>测试点输入</strong><pre>{{ item.testInput }}</pre></div>
                <div><strong>测试点输出</strong><pre>{{ item.expectedOutput }}</pre></div>
              </div>
              <p class="edge-reason">{{ item.reason }}</p>
            </article>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import html2canvas from 'html2canvas';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import Sidebar from './components/Sidebar.vue';
import ChatPanel from './components/ChatPanel.vue';
import AlgorithmVisualizer from './components/AlgorithmVisualizer.vue';
import SyntaxVisualizer from './components/SyntaxVisualizer.vue';
import CspPractice from './components/CspPractice.vue';
import ProblemList from './components/ProblemList.vue';
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
const quickCardExport = ref(null);
const exportingCard = ref(false);

const problemDesc = ref('');
const problemId = ref('');
const fetchingProblem = ref(false);
const problemFetchMessage = ref('');
const edgeCases = ref([]);
const studentCode = ref('');
const debugCode = ref('');
const debugProblem = ref('');
const debugProblemId = ref('');
const debugSamples = ref([]);
const debugEdgeCases = ref([]);
const fetchingDebugProblem = ref(false);
const debugProblemFetchMessage = ref('');
const debugInputsCollapsed = ref(false);
const debugGeneratingEdges = ref(false);
const debugHintLoading = ref(false);
const debugCanAskMore = ref(false);
const debugHintCache = ref(null);
const debugHintPrefetching = ref(false);
const debugHintPrefetchPromise = ref(null);
const hintProblemId = ref('');
const hintProblem = ref('');
const fetchingHintProblem = ref(false);
const hintProblemFetchMessage = ref('');
const hintProblemTitle = ref('');
const hintSamples = ref([]);
const hintInputsCollapsed = ref(false);
const coachSessionId = ref('');
const coachResponse = ref(null);
const coachHistory = ref([]);
const coachMessage = ref('');
const coachError = ref('');
const teachingAction = ref('');
const newsTips = ref([]);
const quizTitle = ref('');
const quizQuestions = ref([]);
const quizBackupQuestions = ref([]);
const quizAnswers = ref({});
const quizRegenerating = ref({});

const fallbackTips = [
  '好算法像好口诀：先抓住题眼，再背模板。',
  '正在挑一个六年级也能听懂的比喻。',
  '把大段解释切成小卡片，眼睛会轻松很多。',
  '别急，AI 正在把复杂算法拆成小块。',
  '老师备课小秘诀：先讲题眼，再讲代码。',
];

const loadingTips = computed(() => {
  const items = [...newsTips.value, ...fallbackTips];
  return Array.from({ length: 8 }, (_, index) => items[index % items.length]);
});

const renderedResult = computed(() => {
  return result.value ? marked.parse(result.value) : '';
});

function switchTool(tool) {
  activeTool.value = tool;
  result.value = '';
  brainstormData.value = null;
  edgeCases.value = [];
  quizTitle.value = '';
  quizQuestions.value = [];
  quizBackupQuestions.value = [];
  quizAnswers.value = {};
  quizRegenerating.value = {};
  teachingAction.value = '';
  debugGeneratingEdges.value = false;
  debugHintLoading.value = false;
  debugCanAskMore.value = false;
  debugHintCache.value = null;
  debugHintPrefetching.value = false;
  debugHintPrefetchPromise.value = null;
  fetchingHintProblem.value = false;
  hintInputsCollapsed.value = false;
  coachResponse.value = null;
  coachHistory.value = [];
  coachMessage.value = '';
  coachError.value = '';
}

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
    ['易错点', '⚠️', card.pitfalls, true],
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

async function exportAlgorithmCards() {
  if (!quickCardExport.value || exportingCard.value) return;

  exportingCard.value = true;
  let exportNode;
  try {
    await document.fonts?.ready;
    const source = quickCardExport.value;
    const width = Math.ceil(source.getBoundingClientRect().width);
    exportNode = source.cloneNode(true);
    Object.assign(exportNode.style, {
      position: 'fixed',
      left: '-100000px',
      top: '0',
      width: `${width}px`,
      height: 'auto',
      maxHeight: 'none',
      overflow: 'visible',
      margin: '0',
    });
    document.body.append(exportNode);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const height = exportNode.scrollHeight;
    const canvas = await html2canvas(exportNode, {
      backgroundColor: '#f8fafc',
      scale: Math.min(2, 16000 / height),
      useCORS: true,
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scrollX: 0,
      scrollY: 0,
    });
    const title = (brainstormData.value?.title || courseTopic.value || '算法速懂卡')
      .replace(/[\\/:*?"<>|]/g, '_');
    const link = document.createElement('a');
    link.download = `${title}-算法速懂卡.png`;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('图片生成失败');
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  } finally {
    exportNode?.remove();
    exportingCard.value = false;
  }
}

onMounted(loadNewsTips);

async function loadNewsTips() {
  try {
    const resp = await fetch('/api/news');
    const data = await resp.json();
    newsTips.value = (data.items || [])
      .filter(item => item.title)
      .slice(0, 8)
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

function useQuickCardExample(topic) {
  courseTopic.value = topic;
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
  if (!edgeCases.value.length) {
    result.value = buildEdgeCaseAdvice();
  }
  loading.value = false;
}

function parseEdgeCases() {
  edgeCases.value = parseEdgeCasePayload(result.value);
  if (edgeCases.value.length) result.value = '';
}

function parseEdgeCasePayload(raw) {
  try {
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    if (!cleaned.trimStart().startsWith('{') && cleaned.includes('"cases"')) {
      cleaned = `{${cleaned}}`;
    }
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1);
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : (parsed.cases || []);
  } catch (e) {
    return [];
  }
}

function buildEdgeCaseAdvice(title = '边界测试点暂时没有生成成功') {
  return `### ${title}

先不用急着改代码，可以按下面的顺序自己检查：

1. 重新阅读题目的数据范围，确认最小值、最大值以及是否允许出现 0、负数或空数据。
2. 手动准备一组最小规模数据，逐步记录循环变量、数组下标和关键变量的变化。
3. 再准备一组“刚好到达上限”的数据，重点检查循环结束条件、数组越界和整数溢出。
4. 如果题目涉及排序、去重、图或动态规划，再检查相同值、全相同、完全有序、孤立点和无解等特殊结构。

边界盲盒没有给出可验证的测试点，因此这次不展示模型原始内容。你可以修改代码后重新分析，或到“边界盲盒”模块手动生成测试点。`;
}

async function fetchProblemById() {
  if (!/^\d{4}$/.test(problemId.value)) {
    problemFetchMessage.value = '请输入 4 位数字题号。';
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

async function fetchDebugProblemById() {
  if (!/^\d{4}$/.test(debugProblemId.value)) {
    debugProblemFetchMessage.value = '请输入 4 位数字题号。';
    return;
  }

  fetchingDebugProblem.value = true;
  debugProblemFetchMessage.value = '';
  debugSamples.value = [];
  try {
    const resp = await fetch(`/api/edge-case/problem/${debugProblemId.value}`);
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || '获取题目失败');
    debugProblem.value = data.description;
    debugSamples.value = data.samples || [];
    debugProblemFetchMessage.value = `已获取：${data.title}`;
  } catch (err) {
    debugProblemFetchMessage.value = err.message;
  } finally {
    fetchingDebugProblem.value = false;
  }
}

async function fetchHintProblemById() {
  if (!/^\d{4}$/.test(hintProblemId.value)) {
    hintProblemFetchMessage.value = '请输入 4 位数字题号。';
    return;
  }

  fetchingHintProblem.value = true;
  hintProblemFetchMessage.value = '';
  try {
    const resp = await fetch(`/api/edge-case/problem/${hintProblemId.value}`);
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || '获取题目失败');
    hintProblem.value = data.description;
    hintProblemTitle.value = data.title || `${hintProblemId.value} 题`;
    hintSamples.value = data.samples || [];
    hintProblemFetchMessage.value = `已获取：${data.title}`;
  } catch (err) {
    hintProblemFetchMessage.value = err.message;
  } finally {
    fetchingHintProblem.value = false;
  }
}

async function handleTeachingAction(action) {
  if (action === 'show-problem-list') {
    teachingAction.value = action;
    result.value = '';
    quizTitle.value = '';
    quizQuestions.value = [];
    quizBackupQuestions.value = [];
    quizAnswers.value = {};
    quizRegenerating.value = {};
    return;
  }
  if (action === 'algorithm-coach') {
    teachingAction.value = action;
    result.value = '';
    quizTitle.value = '';
    quizQuestions.value = [];
    quizBackupQuestions.value = [];
    quizAnswers.value = {};
    quizRegenerating.value = {};
    coachError.value = '';
    return;
  }
  if (!courseTopic.value) {
    result.value = '⚠️ 请先输入课程主题。';
    return;
  }
  teachingAction.value = action;
  loading.value = true;
  result.value = '';
  quizTitle.value = '';
  quizQuestions.value = [];
  quizBackupQuestions.value = [];
  quizAnswers.value = {};
  quizRegenerating.value = {};

  const endpoint = `/api/${action}`;
  const body = { courseTopic: courseTopic.value };

  if (action === 'generate-exercise') {
    body.count = 12;
  }
  if (action === 'generate-script') {
    body.duration = 135;
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

async function coachRequest(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (response.status === 204) return null;
  const raw = await response.text();
  let data = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch (error) {
      throw new Error('算法教练返回内容暂时无法解析，请重试。');
    }
  }
  if (!response.ok) throw new Error(data.error || '算法教练请求失败。');
  if (!raw) throw new Error('算法教练没有返回内容，请重试。');
  return data;
}

function coachStageLabel(stage) {
  return {
    INGEST: '核对题面',
    EXPLORE: '关键提示',
    MODEL: '拆解问题',
    VALIDATE: '例子检验',
    PLAN: '连成思路',
    COMPLETE: '迁移总结',
  }[stage] || '准备开始';
}

async function startAlgorithmCoach() {
  if (!hintProblem.value || loading.value) return;
  if (coachSessionId.value) {
    fetch(`/api/coach/sessions/${coachSessionId.value}`, { method: 'DELETE' }).catch(() => {});
  }
  teachingAction.value = 'algorithm-coach';
  hintInputsCollapsed.value = true;
  loading.value = true;
  result.value = '';
  coachError.value = '';
  coachResponse.value = null;
  coachHistory.value = [];
  coachMessage.value = '';
  try {
    const created = await coachRequest('/api/coach/sessions', { body: { student: {} } });
    coachSessionId.value = created.session.session_id;
    const data = await coachRequest(`/api/coach/sessions/${coachSessionId.value}/problem`, {
      body: {
        problem: {
          title: hintProblemTitle.value || `${hintProblemId.value || '自定义'} 题`,
          text: hintProblem.value,
          samples: hintSamples.value,
        },
      },
    });
    coachResponse.value = data.response;
    coachHistory.value = [{ student: '', response: data.response }];
    prefetchNextCoachLayer(data.response);
  } catch (error) {
    coachError.value = error.message;
    hintInputsCollapsed.value = false;
  } finally {
    loading.value = false;
  }
}

async function sendCoachTurn(message = '', choice = null) {
  const studentText = choice?.text || String(message || '').trim();
  if (!coachSessionId.value || !studentText || loading.value) return;
  loading.value = true;
  coachError.value = '';
  try {
    const data = await coachRequest(`/api/coach/sessions/${coachSessionId.value}/turns`, {
      body: {
        message: choice ? '' : studentText,
        selected_choice_id: choice?.id || null,
      },
    });
    coachResponse.value = data.response;
    coachHistory.value.push({ student: studentText, response: data.response });
    coachMessage.value = '';
    prefetchNextCoachLayer(data.response);
  } catch (error) {
    coachError.value = error.message;
  } finally {
    loading.value = false;
  }
}

async function continueAlgorithmCoach() {
  if (!coachSessionId.value || loading.value) return;
  loading.value = true;
  coachError.value = '';
  try {
    const data = await coachRequest(`/api/coach/sessions/${coachSessionId.value}/turns`, {
      body: { action: 'continue' },
    });
    coachResponse.value = data.response;
    coachHistory.value.push({ student: '', response: data.response });
    prefetchNextCoachLayer(data.response);
  } catch (error) {
    coachError.value = error.message;
  } finally {
    loading.value = false;
  }
}

function prefetchNextCoachLayer(response) {
  if (!coachSessionId.value || response?.stage === 'COMPLETE') return;
  coachRequest(`/api/coach/sessions/${coachSessionId.value}/prefetch`, { body: {} }).catch(() => {});
}

function resetAlgorithmCoach() {
  if (coachSessionId.value) {
    fetch(`/api/coach/sessions/${coachSessionId.value}`, { method: 'DELETE' }).catch(() => {});
  }
  coachSessionId.value = '';
  coachResponse.value = null;
  coachHistory.value = [];
  coachMessage.value = '';
  coachError.value = '';
  hintInputsCollapsed.value = false;
}

function parseQuizPayload(raw) {
  let cleaned = String(raw || '').trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

function parseQuizResult() {
  try {
    const data = parseQuizPayload(result.value);
    quizTitle.value = data.title || `${courseTopic.value} 选择题自测`;
    const questions = Array.isArray(data.questions) ? data.questions : [];
    quizQuestions.value = questions.slice(0, 10);
    quizBackupQuestions.value = questions.slice(10, 12);
    if (quizQuestions.value.length) result.value = '';
  } catch (e) {
    quizQuestions.value = [];
    quizBackupQuestions.value = [];
    result.value = '⚠️ 练习题格式解析失败，请重试。';
  }
}

async function regenerateQuizQuestion(question, index) {
  if (loading.value || quizRegenerating.value[index]) return;

  quizRegenerating.value = { ...quizRegenerating.value, [index]: true };
  const oldKey = question.id || index;
  let replacement = quizBackupQuestions.value.shift();

  try {
    if (!replacement) {
      let raw = '';
      const existingQuestions = [...quizQuestions.value, ...quizBackupQuestions.value]
        .map(item => item.question)
        .filter(Boolean)
        .slice(0, 12);
      await streamPost('/api/generate-exercise', {
        courseTopic: courseTopic.value,
        count: 1,
        excludeQuestions: existingQuestions,
      }, (chunk) => {
        raw += chunk;
      });
      const data = parseQuizPayload(raw);
      replacement = Array.isArray(data.questions) ? data.questions[0] : null;
    }

    if (!replacement) throw new Error('没有生成可用的新题目');
    replacement = { ...replacement, id: question.id || index + 1 };
    quizQuestions.value = quizQuestions.value.map((item, itemIndex) => (
      itemIndex === index ? replacement : item
    ));
    const nextAnswers = { ...quizAnswers.value };
    delete nextAnswers[oldKey];
    quizAnswers.value = nextAnswers;
  } catch (error) {
    if (replacement) quizBackupQuestions.value.unshift(replacement);
    result.value = `⚠️ 单题重新生成失败：${error.message || '请稍后重试。'}`;
  } finally {
    const nextRegenerating = { ...quizRegenerating.value };
    delete nextRegenerating[index];
    quizRegenerating.value = nextRegenerating;
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
  debugInputsCollapsed.value = true;
  loading.value = true;
  result.value = '';
  debugEdgeCases.value = [];
  debugCanAskMore.value = false;
  debugHintCache.value = null;
  debugHintPrefetching.value = false;
  debugHintPrefetchPromise.value = null;
  let nextAction = '';
  await streamPost('/api/debug-code', {
    code: debugCode.value,
    samples: debugSamples.value,
    problem: debugProblem.value,
  }, (chunk) => {
    result.value += chunk;
  }, (event) => {
    nextAction = event.nextAction || nextAction;
  });
  loading.value = false;

  if (nextAction === 'generate-edge-cases') {
    result.value += '\n\n### 正在生成边界测试点……';
    loading.value = true;
    debugGeneratingEdges.value = true;
    let raw = '';
    await streamPost('/api/edge-case', { problem: debugProblem.value, code: debugCode.value }, (chunk) => {
      raw += chunk;
    });
    debugEdgeCases.value = parseEdgeCasePayload(raw);
    if (!debugEdgeCases.value.length) {
      result.value = buildEdgeCaseAdvice('样例通过了，但边界测试点暂时没有生成成功');
    } else {
      result.value = result.value.replace('### 正在生成边界测试点……', '### 边界测试点检查完成');
    }
    debugGeneratingEdges.value = false;
    loading.value = false;
  }
  debugCanAskMore.value = Boolean(result.value);
  if (debugCanAskMore.value) prefetchDebugHint(result.value);
}

function debugHintCacheKey(previousAdvice) {
  return JSON.stringify({
    code: debugCode.value,
    problem: debugProblem.value,
    previousAdvice,
    edgeCases: debugEdgeCases.value,
  });
}

async function requestDebugHint(previousAdvice) {
  let hint = '';
  await streamPost('/api/debug-code/hint', {
    code: debugCode.value,
    problem: debugProblem.value,
    previousAdvice,
    edgeCases: debugEdgeCases.value,
  }, (chunk) => {
    hint += chunk;
  });
  return hint.trim();
}

function prefetchDebugHint(previousAdvice) {
  if (!debugCode.value || debugHintPrefetching.value || !previousAdvice.trim()) return;
  const key = debugHintCacheKey(previousAdvice);
  if (debugHintCache.value?.key === key) return;

  debugHintPrefetching.value = true;
  const request = requestDebugHint(previousAdvice)
    .then((hint) => {
      if (hint && !/请求失败|网络错误|进一步提示生成失败/.test(hint)) {
        debugHintCache.value = { key, hint };
      }
    })
    .finally(() => {
      debugHintPrefetching.value = false;
      debugHintPrefetchPromise.value = null;
    });
  debugHintPrefetchPromise.value = { key, request };
}

async function requestFurtherDebugHint() {
  if (!debugCode.value || debugHintLoading.value) return;
  const previousAdvice = result.value;
  debugCanAskMore.value = false;
  debugHintLoading.value = true;
  loading.value = true;
  const key = debugHintCacheKey(previousAdvice);
  let hint = debugHintCache.value?.key === key
    ? debugHintCache.value.hint
    : '';
  if (!hint && debugHintPrefetchPromise.value?.key === key) {
    await debugHintPrefetchPromise.value.request;
    hint = debugHintCache.value?.key === key ? debugHintCache.value.hint : '';
  }
  if (!hint) hint = await requestDebugHint(previousAdvice);
  debugHintCache.value = null;
  const hintFailed = !hint.trim() || /请求失败|网络错误|进一步提示生成失败/.test(hint);
  result.value += hintFailed
    ? '\n\n### 进一步提示暂时生成失败\n\n请稍后再试。'
    : `\n\n---\n\n${hint.trim()}`;
  debugCanAskMore.value = hintFailed;
  debugHintLoading.value = false;
  loading.value = false;
  if (!hintFailed) prefetchDebugHint(result.value);
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

.hint-tool-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.hint-tool-card textarea {
  min-height: 180px;
}

.coach-tool {
   width: 100%;
   margin: 0;
   display: flex;
   flex-direction: column;
   gap: 16px;
}

.coach-inputs {
  background: #fff;
  border: 1px solid #dbe4f0;
  border-radius: 8px;
  overflow: hidden;
}

.coach-inputs > summary {
  padding: 13px 16px;
  color: #334155;
  font-weight: 700;
  cursor: pointer;
  list-style-position: inside;
}

.coach-inputs[open] > summary {
  border-bottom: 1px solid #e2e8f0;
}

.coach-inputs .hint-tool-card {
  border: 0;
  border-radius: 0;
}

.coach-error {
  padding: 12px 14px;
  color: #b91c1c;
  background: #fff;
  border: 1px solid #fecaca;
  border-left: 4px solid #ef4444;
  border-radius: 8px;
}

.coach-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.coach-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #dbe4f0;
}

.coach-header > div {
  display: flex;
  align-items: center;
  gap: 10px;
}

.coach-stage {
  padding: 4px 10px;
  color: #3730a3;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
}

.coach-header-actions {
  color: #64748b;
  font-size: 13px;
}

.tool-panel .coach-header-actions button {
  padding: 7px 11px;
  color: #475569;
  background: #fff;
  border: 1px solid #cbd5e1;
}

.coach-history {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.coach-key-route {
  padding: 2px 4px;
}

.coach-key-route > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  color: #334155;
}

.coach-key-route > header span {
  color: #64748b;
  font-size: 13px;
}

.coach-key-route ol {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.coach-key-route li {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding-left: 2px;
  border-left: 3px solid #cbd5e1;
}

.coach-key-route li.current {
  border-left-color: #4f46e5;
}

.coach-key-route li > b {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  color: #475569;
  background: #eef2ff;
  border-radius: 50%;
  font-size: 12px;
}

.coach-key-route li.current > b {
  color: #fff;
  background: #4f46e5;
}

.coach-key-route li strong {
  color: #3730a3;
  font-size: 14px;
}

.coach-key-route li p {
  margin-top: 4px;
  color: #1e293b;
  font-size: 16px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.coach-turn-card {
  padding: 16px;
  background: #fff;
  border: 1px solid #dbe4f0;
  border-radius: 8px;
}

.coach-student {
  margin-bottom: 12px;
  padding: 10px 12px;
  color: #334155;
  background: #f8fafc;
  border-left: 3px solid #94a3b8;
  line-height: 1.6;
}

.coach-thinking {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.coach-thinking {
  padding: 0 14px;
}

.coach-thinking strong {
  font-size: 14px;
}

.coach-thinking p {
  color: #1e293b;
  font-size: 17px;
  line-height: 1.75;
  white-space: pre-wrap;
}

.coach-next {
  padding-top: 4px;
}

.coach-next h3 {
  margin-bottom: 10px;
  color: #334155;
  font-size: 15px;
}

.coach-choices {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.tool-panel .coach-choice {
  min-height: 58px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  color: #334155;
  background: #fff;
  border: 1px solid #cbd5e1;
  text-align: left;
}

.tool-panel .coach-choice:hover:not(:disabled) {
  opacity: 1;
  color: #3730a3;
  background: #eef2ff;
  border-color: #818cf8;
}

.coach-choice b {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  color: #4338ca;
  background: #eef2ff;
  border-radius: 50%;
}

.tool-panel .coach-continue {
  width: auto;
  min-width: 180px;
  padding: 12px 20px;
  background: #4f46e5;
}

.edge-case-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.debug-edge-output {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 2px solid #c7d2fe;
}

.debug-hint-action {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
}

.debug-hint-action button {
  width: auto;
  padding: 10px 18px;
  background: #0f766e;
}

.debug-hint-action span {
  color: #64748b;
  font-size: 14px;
}

.debug-edge-output h3 {
  margin-bottom: 14px;
  color: #4f46e5;
  font-size: 20px;
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
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #1e293b;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.6;
  margin-bottom: 20px;
}

.quiz-question > span {
  flex: 0 0 auto;
  color: #1e293b;
  font-size: 20px;
}

.quiz-question-content {
  min-width: 0;
  flex: 1;
}

.quiz-regenerate {
  flex: 0 0 auto;
  margin-left: 12px;
  padding: 7px 11px;
  color: #4f46e5;
  background: #fff;
  border: 1px solid #c7d2fe;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.quiz-regenerate:hover:not(:disabled) {
  background: #eef2ff;
}

.quiz-regenerate:disabled {
  color: #94a3b8;
  border-color: #cbd5e1;
  cursor: wait;
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
  animation: tip-scroll 28s steps(8) infinite;
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
    transform: translateY(-192px);
  }
}

/* 算法速懂卡 */
.quick-card-empty {
  display: flex;
  flex: 1;
  min-height: 320px;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  padding: 48px 20px;
  color: #475569;
  text-align: center;
}

.quick-card-empty-mark {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  margin-bottom: 16px;
  border: 2px solid #a5b4fc;
  border-radius: 18px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 28px;
}

.quick-card-empty h3 {
  margin: 0 0 8px;
  color: #1e293b;
  font-size: 24px;
}

.quick-card-empty p {
  max-width: 440px;
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  white-space: nowrap;
}

.quick-card-empty-suggestions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
}

.quick-card-empty-suggestions button {
  padding: 8px 12px;
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  background: #fff;
  color: #4338ca;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.quick-card-empty-suggestions button:hover {
  background: #fff;
  border-color: #818cf8;
}

.brainstorm-result {
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow-y: auto;
  display: block;
  padding: 20px 24px 0;
}

.quick-card-actions {
  width: min(1080px, 100%);
  display: flex;
  justify-content: flex-end;
  margin: 0 auto 12px;
}

.tool-panel .export-card-button {
  padding: 9px 16px;
  background: #0f766e;
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.2);
}

.brainstorm-card {
  max-width: 1080px;
  width: 100%;
  margin: 0 auto 24px;
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
  .quiz-options,
  .coach-choices,
  .coach-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .coach-thinking {
    grid-template-columns: 1fr;
  }

  .quiz-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .quick-card-empty h3 {
    font-size: 20px;
  }

  .quick-card-empty p {
    white-space: normal;
  }

  .quiz-question {
    flex-wrap: wrap;
  }

  .quiz-regenerate {
    margin-left: auto;
  }
}
</style>
