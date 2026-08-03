<template>
  <div class="student-training">
    <header class="page-head">
      <div>
        <p class="eyebrow">我的集训</p>
        <h2>📘 {{ currentCourse?.title || '集训课程' }} <small v-if="currentCourse?.variant">（{{ variantLabel(currentCourse.variant) }}）</small></h2>
        <p>{{ currentCourse?.summary }}</p>
      </div>
      <button @click="loadCourses" :disabled="loading">{{ loading ? '刷新中……' : '刷新课程' }}</button>
    </header>

    <div v-if="message" class="message" :class="{ error: messageType === 'error' }">{{ message }}</div>
    <div v-if="loading && !courses.length" class="state-card">正在读取集训课程……</div>
    <div v-else-if="!courses.length" class="state-card">老师还没有给你布置集训课程。</div>

    <template v-else>
      <nav v-if="courses.length > 1" class="course-tabs" aria-label="课程">
        <button
          v-for="(item, index) in courses"
          :key="item.id"
          :class="{ active: selectedCourse === index }"
          @click="selectCourse(index)"
        >{{ item.title }}</button>
      </nav>

      <p class="teacher-name">授课教师：{{ currentCourse.teacherName }}</p>
      <nav class="day-tabs" aria-label="已布置日期">
        <button
          v-for="(item, index) in currentCourse.days"
          :key="item.day"
          :class="{ active: selectedDay === index }"
          @click="selectedDay = index"
        >
          <b>Day {{ item.day }}</b>
          <span>{{ formatDate(item.date) }}</span>
        </button>
      </nav>

      <article v-if="currentDay" class="day-content">
        <header class="day-head">
          <div>
            <span>Day {{ currentDay.day }}</span>
            <h3>{{ currentDay.morning.theme }} · {{ currentDay.afternoon.theme }}</h3>
          </div>
          <time>{{ formatFullDate(currentDay.date) }}</time>
        </header>

        <section class="session">
          <div class="session-title"><span>上午</span><h3>{{ currentDay.morning.theme }}</h3></div>
          <div class="info-grid">
            <InfoBlock label="学习目标" :text="currentDay.morning.goals" />
            <InfoBlock label="知识点与讲授要点" :text="currentDay.morning.knowledge" />
          </div>

          <InfoBlock label="本时段针对性练习" :text="currentDay.morning.practice" />

          <div class="question-section">
            <div class="section-heading">
              <h4>历年真题</h4>
              <p>每道大题独立提交。提交后不能修改，等待老师统一开放答案与解析。</p>
            </div>
            <div class="question-groups">
              <section v-for="group in questionGroups" :key="group.type" class="question-group">
                <h5>{{ group.title }}</h5>
                <button
                  v-for="id in currentDay.questions[group.type]"
                  :key="id"
                  class="question-card"
                  @click="openQuestion(id)"
                >
                  <span>{{ questionLabel(id) }}</span>
                  <b :class="statusClass(questionState(id), id)">{{ statusLabel(questionState(id), id) }}</b>
                </button>
                <p v-if="!currentDay.questions[group.type].length" class="empty-text">本日未布置</p>
              </section>
            </div>
          </div>
        </section>

        <section class="session afternoon">
          <div class="session-title"><span>下午</span><h3>{{ currentDay.afternoon.theme }}</h3></div>
          <div class="info-grid">
            <InfoBlock label="学习目标" :text="currentDay.afternoon.goals" />
            <InfoBlock label="知识点与讲授要点" :text="currentDay.afternoon.knowledge" />
          </div>

          <InfoBlock label="本时段针对性练习" :text="currentDay.afternoon.practice" />

          <div class="program-section">
            <div class="section-heading">
              <h4>编程题链接（洛谷重点，东方博宜补充）</h4>
              <p>洛谷题目为本日编程训练重点，东方博宜 OJ 题目作为补充；系统仅提供题号链接，请前往对应平台提交代码。</p>
            </div>
            <div class="program-groups">
              <ProgramLinks
                v-if="currentDay.programming.luoguBasic?.length"
                title="洛谷基础题（重点）"
                :ids="currentDay.programming.luoguBasic"
                platform="luogu"
              />
              <ProgramLinks
                v-if="currentDay.programming.luoguAdvanced?.length"
                title="洛谷提高/迁移题（重点）"
                :ids="currentDay.programming.luoguAdvanced"
                platform="luogu"
              />
              <ProgramLinks title="东方博宜基础补充题" :ids="currentDay.programming.basic" />
              <ProgramLinks title="东方博宜提高补充题" :ids="currentDay.programming.advanced" />
            </div>
          </div>
        </section>
      </article>
    </template>

    <div v-if="preview" class="modal-mask" @click.self="closePreview">
      <section
        class="question-modal"
        :class="{ 'program-modal': preview.type !== 'choice' }"
        role="dialog"
        aria-modal="true"
        aria-label="集训真题"
      >
        <header>
          <div>
            <span>{{ questionTypeLabel(preview.type) }}</span>
            <h3>{{ questionLabel(preview.id) }}</h3>
          </div>
          <button class="close" aria-label="关闭" @click="closePreview">×</button>
        </header>

        <div v-if="preview.type === 'choice'" class="question-body">
          <div class="markdown" v-html="renderMd(preview.item.question)"></div>
          <OptionList
            :question="choicePart(preview.item)"
            :selected="draftAnswers[preview.id] || []"
            :disabled="preview.state.submitted"
            :show-result="preview.state.released"
            :correct-answers="[preview.item.answer]"
            @select="selectOption(choicePart(preview.item), $event)"
          />
          <AnswerBox
            v-if="preview.state.released"
            :answer="preview.item.answer"
            :explanation="choiceExplanation(preview.item)"
          />
        </div>

        <div v-else class="question-body program-question-body">
          <div class="program-statement-pane">
            <div class="markdown statement" v-html="renderMd(preview.item.statement || preview.item.description)"></div>
          </div>
          <div class="program-items-pane">
            <article v-for="item in preview.item.questions" :key="item.id" class="sub-question">
              <h4>{{ item.number }}. <span v-html="renderInline(item.text)"></span></h4>
              <OptionList
                :question="item"
                :selected="draftAnswers[item.id] || []"
                :disabled="preview.state.submitted"
                :show-result="preview.state.released"
                :correct-answers="item.answers"
                @select="selectOption(item, $event)"
              />
              <AnswerBox
                v-if="preview.state.released"
                :answer="item.answers.join('、')"
                :explanation="programExplanation(item, preview.item)"
              />
            </article>
          </div>
        </div>

        <footer class="submit-bar">
          <p v-if="preview.state.released" class="released">
            本题得分：{{ preview.state.score }} / {{ preview.state.maxScore }}，答案与解析已开放。
          </p>
          <p v-else-if="preview.state.submitted" class="waiting">本题已提交，等待老师开放答案与解析。</p>
          <button
            v-else
            class="primary"
            :disabled="submitting || !canSubmit"
            @click="submitQuestion"
          >{{ submitting ? '提交中……' : '提交本题' }}</button>
        </footer>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, ref } from 'vue';
import { authFetch } from '../utils/auth';
import { renderCspMarkdown as renderMd, renderCspInline as renderInline } from '../utils/cspMarkdown';
import { cspChoicePapers } from '../data/cspChoicePapers';
import { cspProgramProblems } from '../data/cspProgramProblems';
import { csp2025ChoicePapers, csp2025ProgramProblems } from '../data/csp2025';
import { listGespQuestions } from '../data/gespPapers';
import { problemUrl } from '../data/problemIndex';
import { cspSTrainingChoices, cspSTrainingPrograms } from '../data/trainingCspS';
import { buildLegacyChoiceExplanation, buildLegacyProgramExplanation } from '../data/cspLegacyAnalysis';

function programUrl(id, platform = 'oj') {
  return platform === 'luogu'
    ? `https://www.luogu.com.cn/problem/${encodeURIComponent(id)}`
    : problemUrl(id.replace(/^P/i, ''));
}

const InfoBlock = defineComponent({
  props: { label: String, text: String },
  setup(props) {
    return () => h('div', { class: 'info-block' }, [
      h('b', props.label),
      h('p', props.text || '—'),
    ]);
  },
});

const ProgramLinks = defineComponent({
  props: { title: String, ids: Array, platform: { type: String, default: 'oj' } },
  setup(props) {
    return () => h('section', { class: 'program-group' }, [
      h('h5', props.title),
      h('div', { class: 'program-links' }, (props.ids || []).length
        ? props.ids.map(id => h('a', {
          href: programUrl(id, props.platform),
          target: '_blank',
          rel: 'noopener noreferrer',
        }, props.platform === 'oj' ? id.replace(/^P/i, '') : id))
        : h('span', { class: 'empty-text' }, '本日未布置')),
    ]);
  },
});

const OptionList = defineComponent({
  props: {
    question: Object,
    selected: Array,
    disabled: Boolean,
    showResult: Boolean,
    correctAnswers: Array,
  },
  emits: ['select'],
  setup(props, { emit }) {
    return () => {
      const correctAnswers = props.correctAnswers || [];
      return h('div', { class: 'option-list' },
      Object.entries(props.question.options || {}).map(([key, text]) => h('button', {
        type: 'button',
        class: {
          selected: props.selected.includes(key),
          'result-correct': props.showResult && correctAnswers.includes(key),
          'result-wrong': props.showResult
            && props.selected.includes(key)
            && !correctAnswers.includes(key),
        },
        disabled: props.disabled,
        onClick: () => emit('select', key),
      }, [
        h('b', key),
        h('span', { innerHTML: renderInline(text) }),
      ]))
      );
    };
  },
});

const AnswerBox = defineComponent({
  props: { answer: String, explanation: String },
  setup(props) {
    return () => h('div', { class: 'answer-box' }, [
      h('b', { class: 'answer-title' }, `参考答案：${props.answer}`),
      h('div', { class: 'markdown', innerHTML: renderMd(props.explanation) }),
    ]);
  },
});

const allChoices = [
  ...Object.values({ ...cspChoicePapers, ...csp2025ChoicePapers }).flat(),
  ...listGespQuestions().filter(item => ['choice', 'judgment'].includes(item.source?.questionType)),
  ...cspSTrainingChoices,
];
const allPrograms = [...cspProgramProblems, ...csp2025ProgramProblems, ...cspSTrainingPrograms];
const choiceMap = new Map(allChoices.map(item => [item.id, item]));
const programMap = new Map(allPrograms.map(item => [item.id, item]));
const questionGroups = [
  { type: 'choice', title: '选择/判断题' },
  { type: 'reading', title: '阅读程序题' },
  { type: 'completion', title: '完善程序题' },
];

const courses = ref([]);
const selectedCourse = ref(0);
const selectedDay = ref(0);
const loading = ref(true);
const submitting = ref(false);
const message = ref('');
const messageType = ref('ok');
const preview = ref(null);
const draftAnswers = ref({});

const currentCourse = computed(() => courses.value[selectedCourse.value]);
const currentDay = computed(() => currentCourse.value?.days?.[selectedDay.value]);
const canSubmit = computed(() => {
  if (!preview.value) return false;
  if (preview.value.type === 'choice') return Boolean(draftAnswers.value[preview.value.id]?.length);
  return preview.value.item.questions.every(item => draftAnswers.value[item.id]?.length);
});

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function showMessage(text, type = 'ok') {
  message.value = text;
  messageType.value = type;
  window.setTimeout(() => {
    if (message.value === text) message.value = '';
  }, 4000);
}

async function loadCourses() {
  loading.value = true;
  try {
    const response = await authFetch('/api/training-courses/student');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '课程读取失败');
    courses.value = data.courses || [];
    if (selectedCourse.value >= courses.value.length) selectedCourse.value = 0;
    if (selectedDay.value >= (currentCourse.value?.days?.length || 0)) selectedDay.value = 0;
    if (preview.value) {
      const state = questionState(preview.value.id);
      preview.value.state = state;
    }
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    loading.value = false;
  }
}

function selectCourse(index) {
  selectedCourse.value = index;
  selectedDay.value = 0;
}

function questionState(id) {
  return currentDay.value?.states?.[id] || { submitted: false, released: false, answers: null };
}

function statusLabel(state, id) {
  if (state.released) {
    const item = choiceMap.get(id) || programMap.get(id);
    if (choiceMap.has(id)) return isChoiceCorrect(item, state) ? '正确' : '错误';
    return `得分 ${state.score ?? 0}/${state.maxScore ?? 0}`;
  }
  if (state.submitted) return '已提交，等待解析';
  return '未提交';
}

function statusClass(state, id) {
  if (state.released) {
    if (choiceMap.has(id)) return isChoiceCorrect(choiceMap.get(id), state) ? 'correct' : 'wrong';
    return 'score';
  }
  if (state.submitted) return 'waiting';
  return 'pending';
}

function isChoiceCorrect(item, state) {
  const selected = state.answers?.[item.id];
  return Array.isArray(selected) && selected.length === 1 && selected[0] === item.answer;
}

async function openQuestion(id) {
  const item = choiceMap.get(id) || programMap.get(id);
  if (!item) return showMessage(`题库中未找到 ${id}`, 'error');
  const state = questionState(id);
  if (!state.submitted) {
    try {
      const response = await authFetch(
        `/api/training-courses/student/courses/${currentCourse.value.id}/days/${currentDay.value.day}/questions/${encodeURIComponent(id)}/start`,
        { method: 'POST' }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '开始答题失败');
    } catch (error) {
      return showMessage(error.message, 'error');
    }
  }
  preview.value = {
    id,
    item,
    type: choiceMap.has(id) ? 'choice' : item.type,
    state,
  };
  draftAnswers.value = state.answers ? deepClone(state.answers) : {};
}

function closePreview() {
  if (!submitting.value) preview.value = null;
}

function choicePart(item) {
  return { id: item.id, options: item.options, multiple: false };
}

function selectOption(question, key) {
  if (preview.value?.state.submitted) return;
  const selected = draftAnswers.value[question.id] || [];
  const nextSelected = question.multiple
    ? (selected.includes(key) ? selected.filter(item => item !== key) : [...selected, key])
    : [key];
  // Replace the answer map so the submit-state computed value updates reliably
  // even when the selected question id was not present in the initial object.
  draftAnswers.value = { ...draftAnswers.value, [question.id]: nextSelected };
}

async function submitQuestion() {
  if (!preview.value || !canSubmit.value) return;
  submitting.value = true;
  try {
    const response = await authFetch(
      `/api/training-courses/student/courses/${currentCourse.value.id}/days/${currentDay.value.day}/questions/${encodeURIComponent(preview.value.id)}/submit`,
      { method: 'POST', body: JSON.stringify({ answers: draftAnswers.value }) }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '提交失败');
    const state = questionState(preview.value.id);
    state.submitted = true;
    state.submittedAt = new Date().toISOString();
    state.answers = deepClone(draftAnswers.value);
    preview.value.state = state;
    showMessage(data.message);
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    submitting.value = false;
  }
}

function questionLabel(id) {
  const choice = choiceMap.get(id);
  if (choice?.source?.level) {
    if (choice.source.level === 'CSP-S') {
      return `CSP-S ${choice.source.year || ''} ${choice.source.typeLabel || '选择题'}第 ${choice.number} 题`;
    }
    const level = String(choice.source.level).replace(/^GESP-/, '');
    return `GESP C++${level}级 ${choice.source.session || ''} ${choice.source.typeLabel || '选择题'}第 ${choice.number} 题`;
  }
  if (choice) return `${id.slice(0, 4)} 选择题第 ${choice.number} 题`;
  const problem = programMap.get(id);
  if (problem) return `${problem.year} ${questionTypeLabel(problem.type)}第 ${problem.number} 题`;
  return id;
}

function variantLabel(value) {
  return value === 'progress' ? '进阶组' : '高阶组';
}

function questionTypeLabel(type) {
  if (type === 'choice') return '选择题';
  if (type === 'reading') return '阅读程序题';
  return '完善程序题';
}

function choiceExplanation(item) {
  if (item.source?.level === 'CSP-S' || item.source?.level?.startsWith('GESP-')) return item.explanation;
  const year = Number(item.id.slice(0, 4));
  return year >= 2019 && year <= 2024 ? buildLegacyChoiceExplanation(item) : item.explanation;
}

function programExplanation(item, problem) {
  if (problem.source?.level === 'CSP-S') return item.explanation;
  const year = Number(problem.year);
  return year >= 2019 && year <= 2024 ? buildLegacyProgramExplanation(item, problem) : item.explanation;
}

function formatDate(value) {
  if (!value) return '待定';
  const [, month, day] = value.split('-');
  return `${Number(month)}月${Number(day)}日`;
}

function formatFullDate(value) {
  return value ? value.replaceAll('-', ' / ') : '日期待定';
}

onMounted(loadCourses);
</script>

<style scoped>
.student-training { height: 100%; overflow-y: auto; padding: 24px 28px 60px; background: #f7f9fc; color: #172033; }
.page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 14px; }
.page-head h2 { margin: 2px 0 8px; color: #4f46e5; font-size: 26px; }
.page-head p { max-width: 850px; margin: 0; color: #64748b; line-height: 1.7; }
.eyebrow { color: #818cf8 !important; font-size: 12px; font-weight: 800; letter-spacing: .12em; }
button { border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; color: #475569; padding: 9px 15px; cursor: pointer; }
button:hover:not(:disabled) { border-color: #818cf8; color: #4338ca; }
button:disabled { opacity: .65; cursor: not-allowed; }
button.primary { border-color: #4f46e5; background: #4f46e5; color: #fff; font-weight: 700; }
.message { margin-bottom: 16px; border: 1px solid #86efac; border-radius: 8px; background: #dcfce7; color: #166534; padding: 11px 15px; }
.message.error { border-color: #fca5a5; background: #fee2e2; color: #991b1b; }
.state-card { min-height: 180px; display: grid; place-items: center; border: 1px solid #dbe2ea; border-radius: 10px; background: #fff; color: #64748b; }
.teacher-name { margin: 0 0 12px; color: #64748b; font-size: 13px; }
.course-tabs, .day-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.course-tabs button.active, .day-tabs button.active { border-color: #4f46e5; background: #eef2ff; color: #4338ca; }
.day-tabs { display: grid; grid-template-columns: repeat(5, minmax(110px, 1fr)); }
.day-tabs button { display: grid; gap: 3px; text-align: left; }
.day-tabs span { color: #94a3b8; font-size: 12px; }
.day-content { display: grid; gap: 18px; }
.day-head { display: flex; justify-content: space-between; gap: 20px; border-radius: 10px; background: linear-gradient(135deg, #312e81, #4f46e5); color: #fff; padding: 20px 22px; }
.day-head span { color: #c7d2fe; font-weight: 800; }
.day-head h3 { margin: 5px 0 0; font-size: 20px; }
.day-head time { align-self: center; color: #e0e7ff; }
.session { border: 1px solid #dbe2ea; border-radius: 10px; background: #fff; padding: 22px; }
.session.afternoon { border-top: 4px solid #0ea5e9; }
.session-title { display: flex; align-items: center; gap: 12px; margin-bottom: 17px; }
.session-title span { border-radius: 999px; background: #e0e7ff; color: #4338ca; padding: 5px 10px; font-size: 12px; font-weight: 800; }
.session-title h3 { margin: 0; font-size: 19px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.info-block { border: 1px solid #eef2f7; border-radius: 8px; background: #f8fafc; padding: 14px 15px; }
.info-block :deep(b) { color: #4f46e5; font-size: 13px; }
.info-block :deep(p) { margin: 7px 0 0; color: #475569; line-height: 1.7; white-space: pre-line; }
.question-section, .program-section { margin-top: 22px; border-top: 1px solid #e2e8f0; padding-top: 19px; }
.section-heading h4 { margin: 0; font-size: 17px; }
.section-heading p { margin: 5px 0 0; color: #64748b; font-size: 13px; }
.question-groups { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 14px; }
.question-group, .program-group { border: 1px solid #dbe2ea; border-radius: 8px; padding: 14px; }
.question-group h5, .program-group :deep(h5) { margin: 0 0 10px; font-size: 15px; }
.question-card { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 7px; text-align: left; }
.question-card b { flex-shrink: 0; border-radius: 999px; padding: 3px 7px; font-size: 11px; }
.question-card b.pending { background: #f1f5f9; color: #64748b; }
.question-card b.waiting { background: #fff7ed; color: #c2410c; }
.question-card b.released { background: #dcfce7; color: #15803d; }
.question-card b.correct { background: #dcfce7; color: #15803d; }
.question-card b.wrong { background: #fee2e2; color: #b91c1c; }
.question-card b.score { background: #dbeafe; color: #1d4ed8; }
.program-groups { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
.program-group :deep(.program-links) { display: flex; flex-wrap: wrap; gap: 8px; }
.program-group :deep(.program-links a) { display: inline-flex; border: 1px solid #bfdbfe; border-radius: 6px; background: #eff6ff; color: #2563eb; padding: 7px 10px; font-weight: 800; text-decoration: none; }
.program-group :deep(.program-links a:hover) { border-color: #60a5fa; background: #dbeafe; }
.empty-text { color: #94a3b8; font-size: 13px; }
.modal-mask { position: fixed; inset: 0; z-index: 120; display: flex; align-items: center; justify-content: center; background: rgba(15, 23, 42, .55); padding: 24px; }
.question-modal { width: min(960px, 100%); max-height: 90vh; overflow-y: auto; border-radius: 12px; background: #fff; box-shadow: 0 24px 70px rgba(15, 23, 42, .3); }
.question-modal.program-modal { width: min(1280px, 100%); }
.question-modal > header { position: sticky; top: 0; z-index: 2; display: flex; justify-content: space-between; gap: 20px; border-bottom: 1px solid #e2e8f0; background: #fff; padding: 18px 22px; }
.question-modal > header span { color: #6366f1; font-size: 12px; font-weight: 800; }
.question-modal > header h3 { margin: 4px 0 0; }
.question-modal .close { border: 0; padding: 0 7px; font-size: 28px; line-height: 1; }
.question-body { padding: 22px; }
.program-question-body { display: grid; grid-template-columns: minmax(420px, 1.1fr) minmax(400px, .9fr); gap: 22px; align-items: start; }
.program-statement-pane { position: sticky; top: 82px; max-height: calc(90vh - 175px); overflow: auto; border: 1px solid #dbe2ea; border-radius: 8px; background: #f8fafc; padding: 16px; }
.program-items-pane { min-width: 0; }
.program-items-pane .sub-question:first-child { border-top: 0; padding-top: 0; }
.markdown { color: #334155; line-height: 1.75; }
.markdown :deep(pre) { overflow: auto; border-radius: 7px; background: #0d1117; color: #e2e8f0; padding: 16px; }
.option-list { display: grid; gap: 8px; margin-top: 14px; }
.option-list :deep(button) { width: 100%; display: flex; align-items: flex-start; gap: 10px; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; color: #334155; padding: 11px 13px; font: inherit; text-align: left; cursor: pointer; }
.option-list :deep(button:hover:not(:disabled)) { border-color: #818cf8; background: #f8faff; }
.option-list :deep(button.selected) { border-color: #6366f1; background: #eef2ff; color: #3730a3; }
.option-list :deep(button.result-correct) { border-color: #22c55e; background: #f0fdf4; color: #166534; }
.option-list :deep(button.result-wrong) { border-color: #ef4444; background: #fef2f2; color: #b91c1c; }
.option-list :deep(button b) { min-width: 22px; color: #4f46e5; }
.sub-question { border-top: 1px solid #e2e8f0; padding: 18px 0; }
.sub-question h4 { line-height: 1.7; }
.answer-box { margin-top: 14px; border-left: 4px solid #22c55e; border-radius: 5px; background: #f0fdf4; padding: 13px 15px; }
.answer-box :deep(.answer-title) { color: #166534; }
.answer-box :deep(.markdown) { margin-top: 8px; }
.submit-bar { position: sticky; bottom: 0; display: flex; justify-content: flex-end; border-top: 1px solid #e2e8f0; background: #fff; padding: 14px 22px; }
.submit-bar p { width: 100%; margin: 0; border-radius: 6px; padding: 10px 13px; }
.submit-bar .waiting { background: #fff7ed; color: #9a3412; }
.submit-bar .released { background: #dcfce7; color: #166534; }
@media (max-width: 900px) {
  .question-groups, .program-groups, .info-grid { grid-template-columns: 1fr; }
  .day-tabs { grid-template-columns: repeat(2, 1fr); }
  .program-question-body { grid-template-columns: 1fr; }
  .program-statement-pane { position: static; max-height: none; }
}
@media (max-width: 640px) {
  .student-training { padding: 18px 14px 48px; }
  .page-head, .day-head { flex-direction: column; }
  .question-card { align-items: flex-start; flex-direction: column; }
}
</style>

<style>
.student-training .math-fraction { display: inline-flex; flex-direction: column; vertical-align: middle; line-height: 1.05; text-align: center; margin: 0 .12em; }
.student-training .math-fraction > span:first-child { border-bottom: 1px solid currentColor; padding: 0 .18em; }
.student-training .math-fraction > span:last-child { padding: 0 .18em; }
.student-training .math-radical { display: inline-flex; align-items: flex-start; vertical-align: middle; }
.student-training .math-radical > span { border-top: 1px solid currentColor; padding: 0 .12em; }
</style>
