<template>
  <main class="wrong-page">
    <header class="page-head">
      <div><h2>📕 选择题错题集</h2><p>自动收集你做错的选择题，支持回顾和重做。</p></div>
      <div class="mode-switch">
        <button :class="{ on: mode === 'review' }" @click="mode = 'review'">回顾错题</button>
        <button :class="{ on: mode === 'redo' }" @click="mode = 'redo'">重做练习</button>
      </div>
    </header>

    <div class="filters">
      <select v-model="filterLevel"><option value="">全部级别</option><option value="CSP-J">CSP-J</option><option value="CSP-S">CSP-S</option></select>
      <select v-model="filterYear"><option value="">全部年份</option><option v-for="y in availableYears" :key="y" :value="y">{{ y }} 年</option></select>
      <span class="count">共 {{ filtered.length }} 道错题</span>
    </div>

    <div v-if="loading" class="empty">加载中……</div>
    <div v-else-if="!filtered.length" class="empty">
      <b>{{ hasAny ? '当前筛选条件下没有错题' : '太棒了，还没有错题！' }}</b>
      <span>做完选择题提交后，错题会自动收集到这里。</span>
    </div>

    <template v-else>
      <div v-if="mode === 'redo'" class="redo-progress">
        <span>已重做 {{ redoAnswered }}/{{ filtered.length }}</span>
        <b>重做正确 {{ redoCorrect }} 题</b>
      </div>

      <article v-for="item in filtered" :key="item.qid" class="card">
        <header class="card-head">
          <span class="tag" :class="item.level === 'CSP-J' ? 'j' : 's'">{{ item.level }}</span>
          <b>{{ item.year }} 年 第 {{ item.number }} 题</b>
          <span class="wrong-time">做错于 {{ formatTime(item.wrongAt) }}</span>
        </header>
        <div class="question" v-html="renderMd(item.question.question)"></div>
        <div class="options">
          <button
            v-for="(text, key) in item.question.options"
            :key="key"
            :class="optionClass(item, key)"
            :disabled="mode === 'review' || redoAnswers[item.qid]"
            @click="selectRedo(item, key)"
          ><b>{{ key }}</b><span v-html="renderInline(text)"></span></button>
        </div>

        <!-- 回顾模式：直接显示答案和解析 -->
        <div v-if="mode === 'review'" class="analysis">
          <strong class="bad">你当时选了 {{ item.user_answer || '（未作答）' }}，正确答案是 {{ item.correct_answer }}</strong>
          <div class="explanation" v-html="'<b>题目解析：</b>' + renderMd(explanation(item))"></div>
        </div>

        <!-- 重做模式：作答后显示结果 -->
        <div v-else-if="redoAnswers[item.qid]" class="analysis">
          <strong :class="redoAnswers[item.qid] === item.correct_answer ? 'good' : 'bad'">
            {{ redoAnswers[item.qid] === item.correct_answer ? '✓ 这次答对了！' : `✗ 还是答错了，正确答案是 ${item.correct_answer}` }}
          </strong>
          <div class="explanation" v-html="'<b>题目解析：</b>' + renderMd(explanation(item))"></div>
        </div>
      </article>
    </template>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { marked } from 'marked';
import { cspChoicePapers } from '../data/cspChoicePapers';
import { csp2025ChoicePapers } from '../data/csp2025';
import { cspSChoicePapers } from '../data/cspS';
import { buildLegacyChoiceExplanation } from '../data/cspLegacyAnalysis';
import { buildSChoiceExplanation } from '../data/cspSAnalysis';
import { authFetch } from '../utils/auth';

const allChoicePapers = { ...cspChoicePapers, ...csp2025ChoicePapers };

const loading = ref(true);
const mode = ref('review');
const filterLevel = ref('');
const filterYear = ref('');
const wrongList = ref([]);
const redoAnswers = ref({});

// 从练习记录中提取选择题错题，按题目 id 去重（保留最近一次）
function extractWrongQuestions(records) {
  const map = new Map();
  for (const r of records) {
    if (r.question_type !== 'choice') continue;
    for (const q of (r.answers?.questions || [])) {
      if (q.correct) continue;
      const qid = `${r.level}-${r.year}-${q.id}`;
      const existing = map.get(qid);
      if (!existing || r.created_at > existing.wrongAt) {
        map.set(qid, {
          qid,
          level: r.level,
          year: r.year,
          id: q.id,
          number: q.number,
          user_answer: q.user_answer,
          correct_answer: q.correct_answer,
          wrongAt: r.created_at,
        });
      }
    }
  }
  return [...map.values()];
}

// 匹配题目完整内容
function attachQuestionContent(items) {
  return items.map(item => {
    const paper = item.level === 'CSP-S'
      ? (cspSChoicePapers[String(item.year)] || [])
      : (allChoicePapers[String(item.year)] || []);
    const question = paper.find(q => q.id === item.id || q.number === item.number);
    return question ? { ...item, question } : null;
  }).filter(Boolean);
}

const hasAny = computed(() => wrongList.value.length > 0);

const filtered = computed(() => {
  let items = wrongList.value;
  if (filterLevel.value) items = items.filter(i => i.level === filterLevel.value);
  if (filterYear.value) items = items.filter(i => String(i.year) === String(filterYear.value));
  return items.sort((a, b) => (b.wrongAt || '').localeCompare(a.wrongAt || ''));
});

const availableYears = computed(() => [...new Set(wrongList.value.map(i => i.year))].sort((a, b) => b - a));

const redoAnswered = computed(() => Object.keys(redoAnswers.value).length);
const redoCorrect = computed(() => filtered.value.filter(i => redoAnswers.value[i.qid] === i.correct_answer).length);

function renderMd(text) { return marked.parse(String(text || '')); }
function renderInline(text) { return marked.parseInline(String(text || '')); }
function formatTime(t) { return t ? t.replace('T', ' ').slice(0, 16) : ''; }

function explanation(item) {
  const q = item.question;
  if (item.level === 'CSP-S') return buildSChoiceExplanation(q);
  if (/^20(1[9]|2[0-4])-choice-/.test(q.id)) return buildLegacyChoiceExplanation(q);
  if (q.explanation && q.explanation.length > 50) return q.explanation;
  return `参考答案为 ${q.answer}。`;
}

function optionClass(item, key) {
  if (mode.value === 'review') {
    return { correct: key === item.correct_answer, wrong: key === item.user_answer && key !== item.correct_answer };
  }
  const picked = redoAnswers.value[item.qid];
  if (!picked) return {};
  return { correct: key === item.correct_answer, wrong: key === picked && key !== item.correct_answer };
}

function selectRedo(item, key) {
  if (redoAnswers.value[item.qid]) return;
  redoAnswers.value = { ...redoAnswers.value, [item.qid]: key };
}

async function loadWrongQuestions() {
  loading.value = true;
  try {
    const resp = await authFetch('/api/practice/my-history');
    const records = await resp.json();
    wrongList.value = attachQuestionContent(extractWrongQuestions(records));
  } catch (e) {
    wrongList.value = [];
  }
  loading.value = false;
}

watch(mode, () => { redoAnswers.value = {}; });
onMounted(loadWrongQuestions);
</script>

<style scoped>
.wrong-page { height: 100%; overflow-y: auto; padding: 24px 28px 60px; background: #f7f9fc; color: #172033; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap; }
.page-head h2 { margin: 0 0 6px; color: #4f46e5; font-size: 26px; }
.page-head p { margin: 0; color: #64748b; }
.mode-switch { display: flex; gap: 7px; }
.mode-switch button { border: 1px solid #cbd5e1; background: #fff; color: #475569; padding: 9px 18px; border-radius: 6px; cursor: pointer; font-weight: 600; }
.mode-switch .on { background: #4f46e5; border-color: #4f46e5; color: #fff; }
.filters { display: flex; align-items: center; gap: 10px; margin: 20px 0; padding: 12px 14px; background: #fff; border: 1px solid #dbe2ea; border-radius: 8px; }
.filters select { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; }
.count { margin-left: auto; color: #64748b; font-size: 14px; }
.empty { min-height: 180px; display: grid; place-content: center; justify-items: center; gap: 12px; color: #64748b; text-align: center; }
.empty b { color: #334155; font-size: 19px; }
.redo-progress { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; margin-bottom: 16px; background: #172033; color: #fff; border-radius: 8px; }
.redo-progress b { color: #fbbf24; }
.card { border: 1px solid #dbe2ea; background: #fff; border-radius: 8px; padding: 22px; margin-top: 16px; }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.card-head b { font-size: 16px; }
.wrong-time { margin-left: auto; color: #94a3b8; font-size: 12px; }
.tag { padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; }
.tag.j { background: #dbeafe; color: #1d4ed8; }
.tag.s { background: #fce7f3; color: #be185d; }
.question { line-height: 1.7; margin-bottom: 16px; font-size: 15px; }
.question :deep(p) { margin: 0 0 8px; }
.question :deep(pre) { margin: 10px 0 0; padding: 14px 16px; border-radius: 6px; background: #0d1117; overflow: auto; }
.question :deep(code) { font-size: 14px; }
.options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.options button { min-height: 48px; display: flex; align-items: center; gap: 12px; text-align: left; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; padding: 12px 14px; cursor: pointer; color: #334155; }
.options button:hover:not(:disabled) { border-color: #6366f1; background: #eef2ff; }
.options button b { color: #4f46e5; }
.options .correct { background: #22c55e; border-color: #16a34a; color: #fff; }
.options .wrong { background: #ef5b5b; border-color: #dc2626; color: #fff; }
.options .correct b, .options .wrong b { color: #fff; }
.analysis { margin-top: 15px; border-left: 4px solid #6366f1; background: #f8fafc; padding: 14px 16px; }
.analysis .good { color: #15803d; }
.analysis .bad { color: #dc2626; }
.explanation { margin-top: 8px; line-height: 1.7; font-size: 14px; }
.explanation :deep(p) { margin: 6px 0; }
.explanation :deep(code) { background: #e2e8f0; padding: 2px 5px; border-radius: 3px; font-size: 13px; }
@media (max-width: 760px) { .options { grid-template-columns: 1fr; } .page-head { flex-direction: column; align-items: flex-start; } }
</style>
