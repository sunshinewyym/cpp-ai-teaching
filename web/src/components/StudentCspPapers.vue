<template>
  <div class="paper-page">
    <header class="page-head">
      <div><p class="eyebrow">我的整卷任务</p><h2>📝 整卷任务</h2><p>整张试卷独立保存答案；解析开放前可以修改。</p></div>
      <button @click="loadAssignments" :disabled="loading">{{ loading ? '刷新中…' : '刷新任务' }}</button>
    </header>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="!assignments.length && !loading" class="state-card">老师还没有布置整卷任务。</div>
    <section v-else class="assignment-list">
      <button v-for="item in assignments" :key="item.id" class="assignment" @click="openAssignment(item.id)">
        <strong>{{ item.title }}</strong>
        <span>{{ item.paperLabel || (item.level + ' · ' + item.year) }} · {{ item.submittedCount }}/{{ item.total }} 道大题</span>
        <div v-if="item.analysisReleasedAt" class="assignment-result"><strong>总得分 {{ item.score }}/{{ item.maxScore }} 分</strong><b class="released">解析已开放</b></div><b v-else>等待完成</b>
      </button>
    </section>

    <div v-if="paper" class="paper-workspace">
      <header class="paper-head"><div><h3>{{ paper.title }}</h3><p>{{ paper.paperLabel || (paper.level + ' · ' + paper.year) }} · {{ paper.submittedCount }}/{{ paper.total }} 道大题 · 总分 {{ paper.maxScore }}</p></div><button @click="paper = null">返回任务列表</button></header>
      <section v-if="paper.analysisReleasedAt" class="score-card">
        <header><strong>总得分 {{ scoreSummary.score }}/{{ scoreSummary.maxScore }} 分</strong><span>解析已开放</span></header>
        <div class="section-scores"><template v-for="group in scoreSummary.groups" :key="group.type"><b v-if="group.items.length">{{ group.label }}：{{ group.score }}/{{ group.maxScore }} 分</b></template></div>
        <details><summary>查看得分明细</summary><div class="score-details"><template v-for="group in scoreSummary.groups" :key="group.type"><section v-if="group.items.length" class="score-group" :class="group.type"><h4>{{ group.label }}</h4><button v-for="item in group.items" :key="item.id" class="score-item" :class="{full:item.score===item.maxScore,zero:item.score===0}" @click="goToQuestion(item.id)"><span>{{ item.label }}</span><strong>{{ item.score }}/{{ item.maxScore }} 分</strong></button></section></template></div></details>
      </section>
      <nav class="question-nav"><button v-for="id in paper.questionIds" :key="id" :class="{active:id===currentId,done:isSubmitted(id),wrong:isWrong(id)}" @click="currentId=id">{{ label(id) }}</button></nav>
      <article v-if="currentQuestion" ref="questionCard" class="question-card">
        <h3>{{ label(currentId) }}</h3>
        <div class="markdown" v-html="renderMd(isChoiceQuestion(currentQuestion) ? currentQuestion.question : (currentQuestion.statement || currentQuestion.description || ''))"></div>
        <div v-if="isChoiceQuestion(currentQuestion)" class="options"><button v-for="(text,key) in currentQuestion.options" :key="key" :class="{selected:selectedFor(currentQuestion.id).includes(key),correct:paper.analysisReleasedAt && submittedCurrent && key===currentQuestion.answer,wrong:paper.analysisReleasedAt && submittedCurrent && selectedFor(currentQuestion.id).includes(key) && key!==currentQuestion.answer}" :disabled="Boolean(paper.analysisReleasedAt && submittedCurrent)" @click="select(currentQuestion.id,key)"><b>{{ key }}</b><span v-html="renderInline(text)"></span></button></div>
        <div v-else class="program-body"><section v-for="part in currentQuestion.questions" :key="part.id" class="part"><h4>{{ part.number }}. <span v-html="renderInline(part.text)"></span></h4><div class="options"><button v-for="(text,key) in part.options" :key="key" :class="{selected:selectedFor(part.id).includes(key),correct:paper.analysisReleasedAt && submittedCurrent && part.answers.includes(key),wrong:paper.analysisReleasedAt && submittedCurrent && selectedFor(part.id).includes(key) && !part.answers.includes(key)}" :disabled="Boolean(paper.analysisReleasedAt && submittedCurrent)" @click="select(part.id,key)"><b>{{ key }}</b><span v-html="renderInline(text)"></span></button></div><div v-if="paper.analysisReleasedAt && submittedCurrent" class="part-result">{{ part.answers.join('、') }} · {{ part.explanation || '' }}</div></section></div>
        <div class="question-actions"><span v-if="submittedCurrent">{{ paper.analysisReleasedAt ? `得分 ${paper.submissions[currentId]?.score}/${paper.submissions[currentId]?.maxScore}` : '已提交，等待老师开放解析' }}</span><button v-if="!(paper.analysisReleasedAt && submittedCurrent)" class="primary" :disabled="busy || !canSubmit" @click="submitCurrent">{{ busy ? '提交中…' : (submittedCurrent ? '修改并重新提交' : '提交本题') }}</button></div>
        <div v-if="paper.analysisReleasedAt && submittedCurrent" class="answer-box"><b>{{ isWrong(currentId) ? '本题有错误' : '本题正确' }}</b><p>参考答案：{{ answerLabel(currentQuestion) }}</p><div v-if="currentQuestion.explanation" class="markdown" v-html="renderMd(currentQuestion.explanation)"></div></div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { authFetch } from '../utils/auth';
import { renderCspMarkdown as renderMd, renderCspInline as renderInline } from '../utils/cspMarkdown';
import { cspChoicePapers } from '../data/cspChoicePapers';
import { cspProgramProblems } from '../data/cspProgramProblems';
import { csp2025ChoicePapers, csp2025ProgramProblems } from '../data/csp2025';
import { csp2026ChoicePapers, csp2026ProgramProblems } from '../data/csp2026';
import { cspSTrainingChoices, cspSTrainingPrograms } from '../data/trainingCspS';
import { gespPapers } from '../data/gespPapers';

const gespQuestions = Object.values(gespPapers).flatMap(sessions => Object.values(sessions).flatMap(paper => Object.entries(paper.sections).flatMap(([type, section]) => section.questions.map(item => ({ ...item, _paperType: 'GESP', _questionType: type, _score: Number(section.scorePerQuestion) || 1 })) )));
const choices = [...Object.values(cspChoicePapers).flat(), ...Object.values(csp2025ChoicePapers).flat(), ...Object.values(csp2026ChoicePapers).flat(), ...cspSTrainingChoices, ...gespQuestions.filter(item => item.options)];
const programs = [...cspProgramProblems, ...csp2025ProgramProblems, ...csp2026ProgramProblems, ...cspSTrainingPrograms];
const choiceMap = new Map(choices.map(item => [item.id, item])); const programMap = new Map(programs.map(item => [item.id, item]));
const assignments = ref([]); const paper = ref(null); const currentId = ref(''); const questionCard = ref(null); const drafts = ref({}); const loading = ref(false); const busy = ref(false); const error = ref('');
function isChoiceQuestion(q) { return Boolean(q && q.options && !Array.isArray(q.questions)); }
const currentQuestion = computed(() => choiceMap.get(currentId.value) || programMap.get(currentId.value));
const submittedCurrent = computed(() => Boolean(paper.value?.submissions?.[currentId.value]?.submitted));
const scoreSummary = computed(() => {
  const groups = [
    { type: 'choice', label: '选择题', items: [] },
    { type: 'judgment', label: '判断题', items: [] },
    { type: 'reading', label: '阅读程序题', items: [] },
    { type: 'completion', label: '完善程序题', items: [] },
  ];
  for (const id of paper.value?.questionIds || []) {
    const question = choiceMap.get(id) || programMap.get(id);
    const type = questionKind(id);
    const submission = paper.value?.submissions?.[id];
    const maxScore = (type === 'choice' || type === 'judgment') ? Number(question?._score || 2) : (question?.questions || []).reduce((sum, part) => sum + Number(part.score || 0), 0);
    groups.find(group => group.type === type)?.items.push({ id, label: label(id), score: Number(submission?.score || 0), maxScore });
  }
  for (const group of groups) {
    group.score = group.items.reduce((sum, item) => sum + item.score, 0);
    group.maxScore = group.items.reduce((sum, item) => sum + item.maxScore, 0);
  }
  return { groups, score: groups.reduce((sum, group) => sum + group.score, 0), maxScore: groups.reduce((sum, group) => sum + group.maxScore, 0) };
});
const canSubmit = computed(() => { const q = currentQuestion.value; if (!q) return false; if (isChoiceQuestion(q)) return selectedFor(q.id).length > 0; return q.questions.every(part => selectedFor(part.id).length > 0); });
function readJson(response) { return response.json().then(data => { if (!response.ok) throw new Error(data.error || '请求失败'); return data; }); }
function questionKind(id) { const q = choiceMap.get(id) || programMap.get(id); if (q?._questionType === 'judgment' || id.includes('-judgment-')) return 'judgment'; return isChoiceQuestion(q) ? 'choice' : (q?.type || (id.includes('-reading-') ? 'reading' : 'completion')); }
function label(id) { const q = choiceMap.get(id) || programMap.get(id); const type = questionKind(id); return `${type === 'choice' ? '选择题' : type === 'judgment' ? '判断题' : type === 'reading' ? '阅读' : '完善'} ${q?.number || id.match(/-(\d+)$/)?.[1] || ''}`; }
function selectedFor(id) { const value = drafts.value[id]; return Array.isArray(value) ? value : value ? [value] : []; }
function isSubmitted(id) { return Boolean(paper.value?.submissions?.[id]?.submitted); }
function isWrong(id) { return paper.value?.analysisReleasedAt && paper.value?.submissions?.[id]?.correct === false; }
function answerLabel(q) { if (isChoiceQuestion(q)) return q.answer; return q.questions.map(part => `${part.number}.${part.answers.join('、')}`).join('；'); }
function select(id, key) { drafts.value = { ...drafts.value, [id]: [key] }; }
function goToQuestion(id) { currentId.value = id; nextTick(() => questionCard.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }
async function loadAssignments({ silent = false } = {}) { if (!silent) loading.value = true; error.value = ''; try { assignments.value = await readJson(await authFetch('/api/csp-papers/student/assignments')); window.dispatchEvent(new Event('csp-paper-updated')); } catch (e) { if (!silent) error.value = e.message; } finally { if (!silent) loading.value = false; } }
async function openAssignment(id) { error.value = ''; try { paper.value = await readJson(await authFetch(`/api/csp-papers/student/assignments/${id}`)); drafts.value = {}; for (const [questionId, submission] of Object.entries(paper.value.submissions || {})) { Object.assign(drafts.value, submission.answers || {}); } currentId.value = paper.value.questionIds[0] || ''; } catch (e) { error.value = e.message; } }
async function submitCurrent() { if (!paper.value || !currentQuestion.value) return; busy.value = true; error.value = ''; try { await authFetch(`/api/csp-papers/student/assignments/${paper.value.id}/questions/${encodeURIComponent(currentId.value)}/start`, { method: 'POST', body: '{}' }); const answers = isChoiceQuestion(currentQuestion.value) ? { [currentQuestion.value.id]: selectedFor(currentQuestion.value.id) } : Object.fromEntries(currentQuestion.value.questions.map(part => [part.id, selectedFor(part.id)])); await readJson(await authFetch(`/api/csp-papers/student/assignments/${paper.value.id}/questions/${encodeURIComponent(currentId.value)}/submit`, { method: 'POST', body: JSON.stringify({ answers }) })); await openAssignment(paper.value.id); await loadAssignments({ silent: true }); const next = paper.value.questionIds.find(id => !isSubmitted(id)); if (next) currentId.value = next; } catch (e) { error.value = e.message; } finally { busy.value = false; } }
let refreshTimer = null;
function handleVisibilityChange() { if (document.visibilityState === 'visible') loadAssignments({ silent: true }); }
onMounted(() => { loadAssignments(); refreshTimer = window.setInterval(() => { if (document.visibilityState === 'visible') loadAssignments({ silent: true }); }, 30000); document.addEventListener('visibilitychange', handleVisibilityChange); });
onUnmounted(() => { if (refreshTimer) window.clearInterval(refreshTimer); document.removeEventListener('visibilitychange', handleVisibilityChange); });
</script>

<style scoped>
.paper-page{height:100%;overflow:auto;padding:26px 30px 60px;background:#f7f9fc;color:#172033}.page-head,.paper-head{display:flex;justify-content:space-between;gap:16px;align-items:start}.eyebrow{color:#6366f1;font-size:13px;font-weight:800}.paper-page h2{margin:0;color:#3730a3}.paper-page p{color:#64748b}.assignment-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}.assignment{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:16px;border:1px solid #c7d2fe;border-radius:12px;background:#fff;color:#3730a3;text-align:left;cursor:pointer}.assignment span{color:#64748b;font-size:13px}.assignment-result{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:3px}.assignment-result strong{font-size:16px;color:#166534}.released{color:#15803d}.paper-workspace{margin-top:18px;padding:20px;border:1px solid #dbe3f0;border-radius:14px;background:#fff}.score-card{margin:16px 0;padding:16px;border:1px solid #a7f3d0;border-radius:12px;background:#f0fdf4}.score-card>header{display:flex;justify-content:space-between;color:#166534}.score-card>header strong{font-size:20px}.section-scores{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}.section-scores b{padding:7px 10px;border-radius:8px;background:#fff;color:#166534}.score-card summary{color:#4338ca;font-weight:700;cursor:pointer}.score-details{display:grid;grid-template-columns:repeat(3,1fr);align-items:start;gap:12px;margin-top:12px}.score-group{display:flex;flex-wrap:wrap;align-content:flex-start;gap:7px;padding:12px;border-radius:10px;background:#fff}.score-group h4{width:100%;margin:0 0 5px}.score-item{display:flex;align-items:center;gap:5px;padding:6px 9px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;color:#334155;font:inherit;font-size:13px;cursor:pointer;transition:.15s}.score-item:hover,.score-item:focus-visible{border-color:#6366f1;background:#eef2ff;transform:translateY(-1px)}.score-item.full{border-color:#86efac;background:#f0fdf4;color:#166534}.score-item.zero{border-color:#fecaca;background:#fff7f7;color:#b91c1c}.score-group:not(.choice) .score-item{flex:1 1 130px;flex-direction:column;align-items:flex-start;gap:6px;padding:11px 12px}.score-group:not(.choice) .score-item strong{font-size:17px}.question-nav{display:flex;flex-wrap:wrap;gap:7px;margin:16px 0;padding-bottom:12px;border-bottom:1px solid #e2e8f0}.question-nav button{padding:7px 10px;border:1px solid #c7d2fe;border-radius:8px;background:#eef2ff;color:#3730a3;cursor:pointer}.question-nav button.active{background:#4f46e5;color:#fff}.question-nav button.done{border-color:#86efac}.question-nav button.wrong{border-color:#fca5a5;color:#b91c1c}.question-card{padding:8px 0;scroll-margin-top:16px}.markdown{line-height:1.7}.options{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.options button{display:flex;gap:10px;align-items:center;padding:13px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#172033;text-align:left;font:inherit;cursor:pointer}.options button.selected{border-color:#6366f1;background:#eef2ff}.options button.correct{border-color:#22c55e;background:#f0fdf4}.options button.wrong{border-color:#ef4444;background:#fef2f2}.options button:disabled{cursor:default}.program-body{margin-top:12px}.part{padding:12px 0;border-top:1px solid #eef2f7}.part-result{margin-top:7px;padding:8px;background:#f0fdf4;color:#166534;font-size:13px}.question-actions{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:20px}.primary{padding:10px 16px;border:0;border-radius:8px;background:#4f46e5;color:#fff;font-weight:700}.answer-box{margin-top:18px;padding:14px;border-left:4px solid #22c55e;background:#f0fdf4}.error{margin:12px 0;color:#b91c1c}.state-card{padding:30px;background:#fff;border-radius:12px}@media(max-width:800px){.paper-page{padding:18px 14px}.options,.score-details{grid-template-columns:1fr}.page-head,.paper-head{flex-direction:column}}
</style>
