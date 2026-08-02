<template>
  <main class="gesp-page">
    <header class="page-head">
      <div>
        <h2>🎯 GESP 考级练习</h2>
        <p>按级别、考期和知识点练习官方真题，提交后统一查看答案与详细解析。</p>
      </div>
      <div class="head-actions">
        <section class="knowledge-filter">
          <label>
            <b>知识点筛选</b>
            <select v-model="knowledge" @change="restartTimer">
              <option value="">全部知识点</option>
              <option v-for="tag in knowledgeTags" :key="tag" :value="tag">{{ tag }}</option>
            </select>
          </label>
          <button v-if="knowledge" type="button" class="clear-filter" @click="selectKnowledge('')">取消筛选</button>
        </section>
      </div>
    </header>

    <section class="paper-filters">
      <label class="compact-filter">
        <b>级别</b>
        <select :value="level" @change="selectLevel($event.target.value)">
          <option v-for="item in levels" :key="item" :value="item">{{ item }}级</option>
        </select>
      </label>
      <label class="compact-filter">
        <b>考期</b>
        <select :value="session" @change="selectSession($event.target.value)">
          <option v-for="item in sessions" :key="item" :value="item">{{ sessionLabel(item) }}</option>
        </select>
      </label>
      <nav class="tabs">
        <button
          v-for="item in types"
          :key="item.id"
          :class="{ on: type === item.id }"
          @click="selectType(item.id)"
        >{{ item.label }}</button>
      </nav>
    </section>


    <section v-if="paper">
      <header class="summary">
        <div>
          <b>{{ summaryTitle }}</b>
          <span>{{ scoreSummary }}</span>
        </div>
        <strong>{{ submitted ? `${score}/${totalScore} 分` : `已答 ${answered}/${questions.length} 题` }}</strong>
      </header>

      <div v-if="!questions.length" class="empty">
        <b>当前题型没有匹配题目</b>
        <span>请切换题型或选择其他知识点。</span>
      </div>

      <article v-for="q in questions" :key="q.id" class="card">
        <header class="question-head">
          <i>{{ q.number }}</i>
          <div class="question">
            <small v-if="knowledge" class="question-source">GESP C++ {{ chineseNumber(q.source.level) }}级 · {{ sessionLabel(q.source.session) }} · {{ q.source.typeLabel }}</small>
            <div v-html="renderMd(q.question)"></div>
          </div>
        </header>
        <div class="tags">
          <button v-for="tag in q.tags" :key="tag" @click="selectKnowledge(tag)">{{ tag }}</button>
        </div>
        <div class="options" :class="{ judgment: q.source.questionType === 'judgment' }">
          <button
            v-for="(text, key) in q.options"
            :key="key"
            :class="optionClass(q, key)"
            :disabled="submitted"
            @click="answers[q.id] = key"
          >
            <b>{{ q.source.questionType === 'judgment' ? (key === 'A' ? '√' : '×') : key }}</b>
            <span v-html="renderMd(text)"></span>
          </button>
        </div>
        <div v-if="submitted" class="analysis">
          <strong :class="answers[q.id] === q.answer ? 'good' : 'bad'">
            {{ answers[q.id] === q.answer ? '回答正确' : `回答错误，正确答案是 ${answerLabel(q, q.answer)}` }}
          </strong>
          <div class="explanation" v-html="'<b>题目解析：</b>' + renderMd(q.explanation)"></div>
        </div>
      </article>

      <section v-if="questions.length" class="set-submit">
        <div v-if="submitted">
          <b>本次得分：{{ score }}/{{ totalScore }} 分</b>
          <span>解析已在每道题下方展开。</span>
        </div>
        <div v-else>
          <b>已完成 {{ answered }}/{{ questions.length }} 题</b>
          <span>全部作答后统一提交，提交前不会显示答案。</span>
        </div>
        <button v-if="!submitted" :disabled="answered !== questions.length" @click="submitSet">{{ knowledge ? '提交筛选结果' : '提交本组题目' }}</button>
        <button v-else class="secondary" @click="resetSet">重新作答</button>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue';
import { gespPapers, listGespQuestions } from '../data/gespPapers';
import { renderCspMarkdown as renderMd } from '../utils/cspMarkdown';
import { authFetch, isLoggedIn } from '../utils/auth';

const types = [
  { id: 'choice', label: '单选题' },
  { id: 'judgment', label: '判断题' },
];
const numberNames = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八' };
const levelKeys = Object.keys(gespPapers).sort((a, b) => Number(a) - Number(b));
const level = ref(levelKeys[0] || '');
const session = ref(Object.keys(gespPapers[level.value] || {}).sort().reverse()[0] || '');
const type = ref('choice');
const knowledge = ref('');
const answers = ref({});
const submittedSets = ref({});
const practiceStartTime = ref(Date.now());
const allQuestions = listGespQuestions();

const levels = computed(() => levelKeys);
const sessions = computed(() => Object.keys(gespPapers[level.value] || {}).sort().reverse());
const paper = computed(() => gespPapers[level.value]?.[session.value]);
const section = computed(() => paper.value?.sections[type.value]);
const knowledgeTags = computed(() => [...new Set(allQuestions.flatMap(q => q.tags || []))]
  .sort((a, b) => a.localeCompare(b, 'zh-CN')));
const questions = computed(() => allQuestions.filter(question => {
  if (knowledge.value) return question.tags?.includes(knowledge.value);
  return question.source.level === level.value
    && question.source.session === session.value
    && question.source.questionType === type.value;
}));
const setKey = computed(() => (knowledge.value
  ? `knowledge:${knowledge.value}`
  : `${paper.value?.id || ''}:${type.value}`));
const submitted = computed(() => Boolean(submittedSets.value[setKey.value]));
const answered = computed(() => questions.value.filter(q => answers.value[q.id]).length);
const score = computed(() => questions.value.reduce((total, question) =>
  total + (answers.value[question.id] === question.answer ? Number(question.source.scorePerQuestion) : 0), 0));
const totalScore = computed(() => questions.value.reduce((total, question) =>
  total + Number(question.source.scorePerQuestion), 0));
const typeLabel = computed(() => section.value?.label || '');
const chineseLevel = computed(() => chineseNumber(level.value));
const summaryTitle = computed(() => (knowledge.value
  ? `知识点“${knowledge.value}” · 全题库`
  : `${paper.value?.title || ''} · ${typeLabel.value}`));
const scoreSummary = computed(() => (knowledge.value
  ? `共 ${questions.value.length} 题，满分 ${totalScore.value} 分`
  : `共 ${questions.value.length} 题，每题 ${Number(section.value?.scorePerQuestion || 2)} 分`));

function chineseNumber(value) {
  return numberNames[Number(value)] || String(value);
}
function sessionLabel(value) {
  const [year, month] = String(value).split('-');
  return `${year} 年 ${Number(month)} 月`;
}
function restartTimer() {
  practiceStartTime.value = Date.now();
}
function selectLevel(value) {
  level.value = value;
  session.value = Object.keys(gespPapers[value] || {}).sort().reverse()[0] || '';
  type.value = 'choice';
  knowledge.value = '';
  restartTimer();
}
function selectSession(value) {
  session.value = value;
  knowledge.value = '';
  restartTimer();
}
function selectType(value) {
  type.value = value;
  knowledge.value = '';
  restartTimer();
}
function selectKnowledge(value) {
  knowledge.value = value;
  restartTimer();
}
function answerLabel(question, key) {
  return question.source.questionType === 'judgment' ? question.options[key] : `${key}（${question.options[key]}）`;
}
function optionClass(question, key) {
  const selected = answers.value[question.id];
  if (!submitted.value) return { selected: selected === key };
  return {
    correct: key === question.answer,
    wrong: selected === key && key !== question.answer,
  };
}
async function submitSet() {
  if (answered.value !== questions.value.length) return;
  submittedSets.value = { ...submittedSets.value, [setKey.value]: true };
  if (!isLoggedIn.value) return;

  const duration = Math.round((Date.now() - practiceStartTime.value) / 1000);
  const groups = new Map();
  for (const question of questions.value) {
    const groupKey = `${question.source.paperId}:${question.source.questionType}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, { source: question.source, questions: [] });
    }
    groups.get(groupKey).questions.push(question);
  }

  try {
    await Promise.all([...groups.values()].map(({ source, questions: groupQuestions }) => {
      const questionRecords = groupQuestions.map(q => ({
        id: q.id,
        number: q.number,
        user_answer: answers.value[q.id],
        user_answer_label: q.options[answers.value[q.id]],
        correct_answer: q.answer,
        correct_answer_label: q.options[q.answer],
        correct: answers.value[q.id] === q.answer,
        score: answers.value[q.id] === q.answer ? Number(source.scorePerQuestion) : 0,
        tags: q.tags,
      }));
      const groupScore = questionRecords.reduce((total, question) => total + question.score, 0);
      const groupMaxScore = groupQuestions.length * Number(source.scorePerQuestion);

      return authFetch('/api/practice/submit', {
        method: 'POST',
        body: JSON.stringify({
          level: `GESP-${source.level}`,
          year: source.year,
          question_type: source.questionType,
          total_score: groupScore,
          max_score: groupMaxScore,
          answers: {
            paper_id: source.paperId,
            session: source.session,
            knowledge_tag: knowledge.value,
            questions: questionRecords,
          },
          duration_seconds: duration,
        }),
      });
    }));
  } catch (error) {
    console.warn('保存 GESP 练习记录失败:', error.message);
  }
}
function resetSet() {
  const nextAnswers = { ...answers.value };
  questions.value.forEach(q => delete nextAnswers[q.id]);
  answers.value = nextAnswers;
  submittedSets.value = { ...submittedSets.value, [setKey.value]: false };
  restartTimer();
}
</script>

<style scoped>
.gesp-page,.gesp-page button,.gesp-page select{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif}
.head-actions{display:flex;align-items:stretch;gap:10px;margin-left:auto}.head-actions .knowledge-filter{min-width:330px;flex-direction:column;align-items:flex-start;justify-content:center;gap:4px}.head-actions .knowledge-filter span{white-space:nowrap}
@media(max-width:760px){.head-actions{width:100%;flex-direction:column}.head-actions .knowledge-filter{min-width:0}}
.question-source{display:block;margin-bottom:6px;color:#7c3aed;font-weight:700}
.gesp-page{height:100%;overflow-y:auto;padding:24px 28px 60px;background:#f7f9fc;color:#172033}.page-head{display:flex;align-items:center;justify-content:space-between;gap:18px}.page-head h2{margin:0 0 6px;color:#4f46e5;font-size:26px}.page-head p{margin:0;color:#64748b}.paper-badge{display:grid;gap:3px;padding:12px 16px;border-radius:8px;background:#172033;color:#fff;text-align:right}.paper-badge span{color:#cbd5e1;font-size:13px}.paper-filters{display:grid;gap:10px;margin:22px 0 10px;padding:16px 18px;border:1px solid #dbe2ea;border-radius:8px;background:#fff}.filter-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.filter-row b{width:96px;color:#334155}.filter-row button,.tabs button{border:1px solid #cbd5e1;background:#fff;color:#475569;padding:8px 14px;border-radius:6px;cursor:pointer;font-weight:700}.filter-row button.on,.tabs button.on{border-color:#4f46e5;background:#4f46e5;color:#fff}.tabs{display:flex;gap:8px;margin:16px 0}.tabs button{padding:10px 22px}.knowledge-filter{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 16px;border:1px solid #c7d2fe;border-radius:8px;background:#eef2ff}.knowledge-filter label{display:flex;align-items:center;gap:10px}.knowledge-filter select{padding:8px 12px;border:1px solid #a5b4fc;border-radius:6px;background:#fff}.knowledge-filter span{color:#64748b;font-size:13px}.summary{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:18px 0;padding:18px 20px;border-radius:8px;background:#172033;color:#fff}.summary div{display:grid;gap:4px}.summary span{color:#cbd5e1}.summary strong{color:#fbbf24}.card{margin-top:16px;padding:22px;border:1px solid #dbe2ea;border-radius:8px;background:#fff}.question-head{display:flex;align-items:flex-start;gap:12px}.question-head i{flex:0 0 30px;height:30px;display:grid;place-items:center;border-radius:50%;background:#eef2ff;color:#4f46e5;font-style:normal;font-weight:700}.question{min-width:0;flex:1;line-height:1.75}.question :deep(p){margin:0 0 8px}.question :deep(pre),.options :deep(pre){margin:10px 0 0;padding:14px 16px;border-radius:6px;background:#0d1117;color:#e5e7eb;overflow:auto}.question :deep(code),.options :deep(code){font-family:Consolas,Monaco,'Courier New',monospace;font-size:14px;line-height:1.55;tab-size:4}.tags{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}.tags button{border:0;border-radius:999px;padding:5px 10px;background:#fef3c7;color:#92400e;cursor:pointer;font-size:12px}.options{display:grid;grid-template-columns:1fr 1fr;gap:10px}.options.judgment{grid-template-columns:repeat(2,minmax(160px,280px))}.options.judgment>button{min-height:42px;padding:8px 14px}.options>button{min-height:52px;display:flex;align-items:center;gap:12px;text-align:left;border:1px solid #cbd5e1;border-radius:6px;background:#fff;padding:12px 14px;cursor:pointer;color:#334155}.options>button>b{color:#4f46e5;font-size:17px}.options>button>span{min-width:0;align-self:stretch;display:flex;align-items:center;flex:1;white-space:pre-line}.options>button>span :deep(p){width:100%;margin:0}.options>button>span :deep(img){max-width:100%;height:auto;display:block}.options>button:hover:not(:disabled),.options>button.selected{border-color:#6366f1;background:#eef2ff}.options>button.correct{border-color:#16a34a;background:#22c55e;color:#fff}.options>button.wrong{border-color:#dc2626;background:#ef5b5b;color:#fff}.options>button.correct>b,.options>button.wrong>b{color:#fff}.analysis{margin-top:15px;padding:14px 16px;border-left:4px solid #6366f1;background:#f8fafc}.analysis .good{color:#15803d}.analysis .bad{color:#dc2626}.explanation{margin-top:8px;line-height:1.75}.explanation :deep(p){margin:7px 0}.explanation :deep(strong){color:#4338ca}.explanation :deep(code){padding:2px 5px;border-radius:3px;background:#e2e8f0;font-size:13px}.set-submit{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:28px;padding:16px 20px;border:1px solid #c7d2fe;border-radius:8px;background:#fff;box-shadow:0 5px 18px rgba(15,23,42,.08)}.set-submit>div{display:grid;gap:4px}.set-submit>div b{color:#312e81;font-size:18px}.set-submit>div span{color:#64748b}.set-submit>button{border:0;border-radius:6px;padding:11px 22px;background:#4f46e5;color:#fff;font-weight:700;cursor:pointer}.set-submit>button:disabled{background:#cbd5e1;cursor:not-allowed}.set-submit>button.secondary{border:1px solid #6366f1;background:#fff;color:#4f46e5}.empty{min-height:160px;display:grid;place-content:center;justify-items:center;gap:10px;color:#64748b}.empty b{color:#334155;font-size:18px}@media(max-width:760px){.gesp-page{padding:18px 14px}.page-head,.summary,.knowledge-filter,.set-submit{align-items:stretch;flex-direction:column}.paper-badge{text-align:left}.filter-row b{width:100%}.options,.options.judgment{grid-template-columns:1fr}.set-submit>button{width:100%}}

/* Compact paper controls keep the question list above the fold. */
.head-actions{align-items:center}
.head-actions .knowledge-filter{min-width:0;flex-direction:row;align-items:center;justify-content:flex-start;gap:10px;padding:10px 12px}
.clear-filter{border:1px solid #a5b4fc;border-radius:6px;padding:8px 12px;background:#fff;color:#4f46e5;font-weight:700;cursor:pointer;white-space:nowrap}
.paper-filters{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:16px 0 10px;padding:12px 14px}
.compact-filter{display:flex;align-items:center;gap:8px;color:#334155}
.compact-filter b{white-space:nowrap}
.compact-filter select{min-width:138px;padding:9px 32px 9px 11px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#334155;font-weight:700}
.paper-filters .tabs{margin:0 0 0 auto}
@media(max-width:760px){.paper-filters{align-items:stretch}.compact-filter{flex:1 1 180px}.compact-filter select{width:100%}.paper-filters .tabs{width:100%;margin-left:0}.head-actions .knowledge-filter{align-items:stretch}}
</style>
