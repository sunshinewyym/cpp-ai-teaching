<template>
  <div class="training-page">
    <header class="page-head">
      <div>
        <p class="eyebrow">教师专属课程</p>
        <h2>📅 {{ workingCourse?.title || 'CSP-J 十天集训' }} <small v-if="workingCourse?.variant">（{{ variantLabel(workingCourse.variant) }}）</small></h2>
        <p v-if="workingCourse">{{ workingCourse.summary }}</p>
      </div>
      <div v-if="course" class="head-actions">
        <button v-if="!editing" class="primary" @click="startEdit">编辑课程</button>
        <template v-else>
          <button @click="cancelEdit" :disabled="saving">取消</button>
          <button class="primary" @click="saveCourse" :disabled="saving">
            {{ saving ? '保存中……' : '保存修改' }}
          </button>
        </template>
      </div>
    </header>

    <div v-if="message" class="message" :class="messageType">{{ message }}</div>
    <div v-if="loading" class="state-card">正在读取集训课程……</div>
    <div v-else-if="!course" class="state-card error">{{ loadError || '管理员尚未分配集训课程。' }}</div>

    <template v-else>
      <section v-if="editing" class="course-meta edit-card">
        <label>
          <span>课程名称</span>
          <input v-model="draft.title" maxlength="100" />
        </label>
        <label>
          <span>课程说明</span>
          <textarea v-model="draft.summary" rows="3" maxlength="1000"></textarea>
        </label>
      </section>

      <nav class="day-tabs" aria-label="集训日期">
        <button
          v-for="(item, index) in workingCourse.days"
          :key="item.day"
          :class="{ active: selectedDay === index }"
          @click="selectDay(index)"
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
          <label v-if="editing" class="date-field">
            <span>上课日期</span>
            <input v-model="currentDay.date" type="date" />
          </label>
          <time v-else>{{ formatFullDate(currentDay.date) }}</time>
        </header>

        <section class="assignment-card">
          <header>
            <div>
              <h3>本日课程布置与解析开放</h3>
              <p>已布置 {{ assignment.students.length }} 人；学生逐题提交，全部完成后可单独开放该题解析。</p>
            </div>
            <button class="primary" @click="toggleRecipients" :disabled="assignmentLoading">
              {{ recipientsOpen ? '收起名单' : '布置本日课程' }}
            </button>
          </header>

          <div v-if="recipientsOpen" class="recipient-editor">
            <div class="recipient-actions">
              <select v-model="selectedClass">
                <option value="">选择班级</option>
                <option v-for="name in classNames" :key="name" :value="name">{{ name }}</option>
              </select>
              <button @click="addSelectedClass" :disabled="!selectedClass">加入全班</button>
              <button @click="selectAllStudents" :disabled="!students.length">全选</button>
              <button @click="selectedStudentIds = []">清空</button>
              <strong>已选择 {{ selectedStudentIds.length }} 人</strong>
            </div>
            <div v-if="students.length" class="student-checks">
              <label v-for="student in students" :key="student.id">
                <input v-model="selectedStudentIds" type="checkbox" :value="student.id" />
                <span>{{ student.name }}</span>
                <small>{{ student.class_name || '未分班' }}</small>
              </label>
            </div>
            <p v-else class="empty-text">请先在“学生管理”中添加学生。</p>
            <div class="recipient-save">
              <button class="primary" @click="saveAssignments" :disabled="assigning">
                {{ assigning ? '保存中……' : '保存布置名单' }}
              </button>
            </div>
          </div>

          <div v-if="assignment.questions.length" class="progress-list">
            <article v-for="item in assignment.questions" :key="item.questionId">
              <div>
                <b>{{ questionLabel(item.questionId) }}</b>
                <span>
                  已提交 {{ item.submitted }}/{{ item.total }}
                  <template v-if="item.averagePercent !== null"> · 平均正确率 {{ item.averagePercent }}%</template>
                </span>
                <small v-if="item.missingStudents.length">
                  未提交：{{ item.missingStudents.map(student => student.name).join('、') }}
                </small>
              </div>
              <div class="progress-actions">
                <strong v-if="item.released" class="released-badge">解析已开放</strong>
                <button
                  v-else
                  @click="releaseQuestion(item)"
                  :disabled="releasingId === item.questionId || !item.total || item.submitted < item.total"
                >
                  {{ releasingId === item.questionId ? '开放中……' : '开放本题解析' }}
                </button>
                <button
                  v-if="item.submitted"
                  type="button"
                  class="details-button"
                  @click="toggleQuestionDetails(item.questionId)"
                >
                  {{ detailOpen[item.questionId] ? '收起答题明细' : '查看答题明细' }}
                </button>
              </div>
              <div v-if="detailOpen[item.questionId]" class="answer-details">
                <div
                  v-for="detail in (item.details || [])"
                  :key="detail.studentId"
                  class="answer-detail"
                  :class="detail.submitted ? (detail.correct ? 'correct' : 'wrong') : 'missing'"
                >
                  <span>{{ detail.name }}<small v-if="detail.className">（{{ detail.className }}）</small></span>
                  <b v-if="detail.submitted && isProgramQuestion(item.questionId)">
                    得分 {{ detail.score }}/{{ detail.maxScore }}
                  </b>
                  <b v-else-if="detail.submitted">{{ detail.correct ? '正确' : '错误' }}</b>
                  <b v-else>未提交</b>
                </div>
              </div>
            </article>
          </div>
          <p v-else-if="assignmentLoading" class="empty-text">正在读取布置进度……</p>
        </section>

        <section class="session">
          <div class="session-title">
            <span class="period">上午 3 小时</span>
            <h3>{{ currentDay.morning.theme }}</h3>
          </div>

          <div v-if="editing" class="edit-grid">
            <EditField v-model="currentDay.morning.theme" label="主题焦点" />
            <EditField v-model="currentDay.morning.timing" label="教学环节与用时" textarea wide />
            <EditField v-model="currentDay.morning.goals" label="核心学习目标" textarea wide />
            <EditField v-model="currentDay.morning.knowledge" label="知识点与讲授要点" textarea wide />
            <EditField v-model="currentDay.morning.practice" label="本时段针对性练习" textarea wide />
            <EditField v-model="currentDay.morning.notes" label="教学提示与常见陷阱" textarea wide />
          </div>
          <div v-else class="info-grid">
            <InfoBlock label="教学环节与用时" :text="currentDay.morning.timing" />
            <InfoBlock label="核心学习目标" :text="currentDay.morning.goals" />
            <InfoBlock label="知识点与讲授要点" :text="currentDay.morning.knowledge" />
            <InfoBlock label="本时段针对性练习" :text="currentDay.morning.practice" />
            <InfoBlock label="教学提示与常见陷阱" :text="currentDay.morning.notes" />
          </div>

          <div class="question-section">
            <div class="section-heading">
              <div>
                <h4>历年真题题池</h4>
                <p>点击题目可查看题面、答案和解析；课堂精做，其余可作为作业或机动。</p>
              </div>
            </div>
            <div class="question-groups">
              <QuestionGroup
                title="选择题"
                type="choice"
                :ids="currentDay.questions.choice"
                :editing="editing"
                :locked-ids="answeredQuestionIds"
                :options="availableQuestions('choice')"
                v-model:selected="questionSelections.choice"
                @open="openQuestion"
                @add="addQuestion('choice')"
                @remove="removeQuestion('choice', $event)"
              />
              <QuestionGroup
                title="阅读程序题"
                type="reading"
                :ids="currentDay.questions.reading"
                :editing="editing"
                :locked-ids="answeredQuestionIds"
                :options="availableQuestions('reading')"
                v-model:selected="questionSelections.reading"
                @open="openQuestion"
                @add="addQuestion('reading')"
                @remove="removeQuestion('reading', $event)"
              />
              <QuestionGroup
                title="完善程序题"
                type="completion"
                :ids="currentDay.questions.completion"
                :editing="editing"
                :locked-ids="answeredQuestionIds"
                :options="availableQuestions('completion')"
                v-model:selected="questionSelections.completion"
                @open="openQuestion"
                @add="addQuestion('completion')"
                @remove="removeQuestion('completion', $event)"
              />
            </div>
          </div>
        </section>

        <section class="session afternoon">
          <div class="session-title">
            <span class="period">下午 3 小时</span>
            <h3>{{ currentDay.afternoon.theme }}</h3>
          </div>

          <div v-if="editing" class="edit-grid">
            <EditField v-model="currentDay.afternoon.theme" label="主题焦点" />
            <EditField v-model="currentDay.afternoon.timing" label="教学环节与用时" textarea wide />
            <EditField v-model="currentDay.afternoon.goals" label="核心学习目标" textarea wide />
            <EditField v-model="currentDay.afternoon.knowledge" label="知识点与讲授要点" textarea wide />
            <EditField v-model="currentDay.afternoon.practice" label="本时段针对性练习" textarea wide />
            <EditField v-model="currentDay.afternoon.notes" label="教学提示与常见陷阱" textarea wide />
          </div>
          <div v-else class="info-grid">
            <InfoBlock label="教学环节与用时" :text="currentDay.afternoon.timing" />
            <InfoBlock label="核心学习目标" :text="currentDay.afternoon.goals" />
            <InfoBlock label="知识点与讲授要点" :text="currentDay.afternoon.knowledge" />
            <InfoBlock label="本时段针对性练习" :text="currentDay.afternoon.practice" />
            <InfoBlock label="教学提示与常见陷阱" :text="currentDay.afternoon.notes" />
          </div>

          <div class="program-section">
            <div class="section-heading">
              <div>
                <h4>编程题链接（洛谷重点，东方博宜补充）</h4>
                <p>洛谷题目为本日编程训练重点，东方博宜 OJ 题目作为补充；系统仅提供题号链接，请前往对应平台提交代码。</p>
              </div>
            </div>
            <div class="program-groups">
              <ProgramGroup
                title="洛谷基础题（重点）"
                description="优先完成，巩固本日知识点与常用模板"
                :ids="currentDay.programming.luoguBasic || []"
                platform="luogu"
                :editing="editing"
                v-model:input="problemInputs.luoguBasic"
                @add="addProblem('luoguBasic')"
                @remove="removeProblem('luoguBasic', $event)"
              />
              <ProgramGroup
                title="洛谷提高/迁移题（重点）"
                description="面向已掌握模板的学生，训练建模、边界与迁移"
                :ids="currentDay.programming.luoguAdvanced || []"
                platform="luogu"
                :editing="editing"
                v-model:input="problemInputs.luoguAdvanced"
                @add="addProblem('luoguAdvanced')"
                @remove="removeProblem('luoguAdvanced', $event)"
              />
              <ProgramGroup
                title="东方博宜基础补充题"
                description="巩固标准模型和代码正确率"
                :ids="currentDay.programming.basic || []"
                platform="oj"
                :editing="editing"
                v-model:input="problemInputs.basic"
                @add="addProblem('basic')"
                @remove="removeProblem('basic', $event)"
              />
              <ProgramGroup
                title="东方博宜提高补充题"
                description="面向已掌握模板的学生，强调建模与迁移"
                :ids="currentDay.programming.advanced || []"
                platform="oj"
                :editing="editing"
                v-model:input="problemInputs.advanced"
                @add="addProblem('advanced')"
                @remove="removeProblem('advanced', $event)"
              />
            </div>
          </div>
        </section>
      </article>
    </template>

    <div v-if="preview" class="modal-mask" @click.self="preview = null">
      <section class="question-modal" role="dialog" aria-modal="true" aria-label="真题详情">
        <header>
          <div>
            <span>{{ questionTypeLabel(preview.type) }}</span>
            <h3>{{ questionLabel(preview.id) }}</h3>
          </div>
          <button class="close" aria-label="关闭" @click="preview = null">×</button>
        </header>

        <div class="answer-controls">
          <button type="button" class="answer-toggle" @click="answerVisible = !answerVisible">
            {{ answerVisible ? '隐藏答案' : '显示答案' }}
          </button>
          <span>课堂讲解模式：默认隐藏答案</span>
        </div>

        <div v-if="preview.type === 'choice'" class="question-body">
          <div class="markdown" v-html="renderMd(preview.item.question)"></div>
          <ol class="option-list">
            <li v-for="(text, key) in preview.item.options" :key="key">
              <b>{{ key }}</b><span v-html="renderInline(text)"></span>
            </li>
          </ol>
          <AnswerBox
            v-if="answerVisible"
            :answer="preview.item.answer"
            :explanation="choiceExplanation(preview.item)"
          />
        </div>

        <div v-else class="question-body">
          <div class="markdown statement" v-html="renderMd(preview.item.statement || preview.item.description)"></div>
          <article v-for="item in preview.item.questions" :key="item.id" class="sub-question">
            <h4>{{ item.number }}. <span v-html="renderInline(item.text)"></span></h4>
            <ol class="option-list">
              <li v-for="(text, key) in item.options" :key="key">
                <b>{{ key }}</b><span v-html="renderInline(text)"></span>
              </li>
            </ol>
            <AnswerBox
              v-if="answerVisible"
              :answer="item.answers.join('、')"
              :explanation="programExplanation(item, preview.item)"
            />
          </article>
        </div>
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

const EditField = defineComponent({
  props: {
    modelValue: String,
    label: String,
    textarea: Boolean,
    wide: Boolean,
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('label', { class: ['edit-field', { wide: props.wide }] }, [
      h('span', props.label),
      props.textarea
        ? h('textarea', {
          rows: 3,
          value: props.modelValue,
          onInput: event => emit('update:modelValue', event.target.value),
        })
        : h('input', {
          value: props.modelValue,
          onInput: event => emit('update:modelValue', event.target.value),
        }),
    ]);
  },
});

const InfoBlock = defineComponent({
  props: { label: String, text: String },
  setup(props) {
    return () => h('div', { class: 'info-block' }, [
      h('b', props.label),
      h('p', props.text || '—'),
    ]);
  },
});

const QuestionGroup = defineComponent({
  props: {
    title: String,
    type: String,
    ids: Array,
    editing: Boolean,
    lockedIds: Object,
    options: Array,
    selected: String,
  },
  emits: ['open', 'add', 'remove', 'update:selected'],
  setup(props, { emit }) {
    return () => h('section', { class: 'question-group' }, [
      h('h5', props.title),
      h('div', { class: 'question-chips' }, [
        ...(props.ids || []).map(id => h('span', { class: 'question-chip', key: id }, [
          h('button', { type: 'button', onClick: () => emit('open', id) }, questionLabel(id)),
          props.editing ? h('button', {
            type: 'button',
            class: 'remove',
            disabled: props.lockedIds?.has(id),
            title: props.lockedIds?.has(id) ? '已有学生作答，不能移除' : '移除',
            onClick: () => emit('remove', id),
          }, '×') : null,
        ])),
        !(props.ids || []).length ? h('span', { class: 'empty-text' }, '暂未添加') : null,
      ]),
      props.editing ? h('div', { class: 'add-row' }, [
        h('select', {
          value: props.selected,
          onChange: event => emit('update:selected', event.target.value),
        }, [
          h('option', { value: '' }, `选择${props.title}`),
          ...(props.options || []).map(item => h('option', { value: item.id, key: item.id }, item.label)),
        ]),
        h('button', { type: 'button', disabled: !props.selected, onClick: () => emit('add') }, '添加'),
      ]) : null,
    ]);
  },
});

const ProgramGroup = defineComponent({
  props: {
    title: String,
    description: String,
    ids: Array,
    platform: { type: String, default: 'oj' },
    editing: Boolean,
    input: String,
  },
  emits: ['add', 'remove', 'update:input'],
  setup(props, { emit }) {
    return () => h('section', { class: 'program-group' }, [
      h('h5', props.title),
      h('p', props.description),
      h('div', { class: 'program-links' }, [
        ...(props.ids || []).map(id => h('span', { class: 'program-link', key: id }, [
          h('a', {
            href: programUrl(id, props.platform),
            target: '_blank',
            rel: 'noopener noreferrer',
          }, props.platform === 'oj' ? id.replace(/^P/i, '') : id),
          props.editing ? h('button', {
            type: 'button',
            title: '移除',
            onClick: () => emit('remove', id),
          }, '×') : null,
        ])),
        !(props.ids || []).length ? h('span', { class: 'empty-text' }, '暂未添加') : null,
      ]),
      props.editing ? h('div', { class: 'add-row' }, [
        h('input', {
          value: props.input,
          placeholder: props.platform === 'oj' ? '输入东方博宜题号，例如 1001' : '输入洛谷题号，例如 P1001',
          onInput: event => emit('update:input', event.target.value),
          onKeydown: event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              emit('add');
            }
          },
        }),
        h('button', { type: 'button', disabled: !props.input, onClick: () => emit('add') }, '添加'),
      ]) : null,
    ]);
  },
});

const AnswerBox = defineComponent({
  props: { answer: String, explanation: String },
  setup(props) {
    return () => h('div', { class: 'answer-box' }, [
      h('b', `参考答案：${props.answer}`),
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

const course = ref(null);
const draft = ref(null);
const selectedDay = ref(0);
const editing = ref(false);
const loading = ref(true);
const saving = ref(false);
const loadError = ref('');
const message = ref('');
const messageType = ref('ok');
const preview = ref(null);
const answerVisible = ref(false);
const questionSelections = ref({ choice: '', reading: '', completion: '' });
const problemInputs = ref({ basic: '', advanced: '', luoguBasic: '', luoguAdvanced: '' });
const students = ref([]);
const assignment = ref({ students: [], questions: [] });
const selectedStudentIds = ref([]);
const selectedClass = ref('');
const recipientsOpen = ref(false);
const assignmentLoading = ref(false);
const assigning = ref(false);
const releasingId = ref('');
const detailOpen = ref({});

const workingCourse = computed(() => editing.value ? draft.value : course.value);
const currentDay = computed(() => workingCourse.value?.days?.[selectedDay.value]);
const classNames = computed(() => [...new Set(students.value
  .map(item => item.class_name)
  .filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN')));
const answeredQuestionIds = computed(() => new Set(
  assignment.value.questions
    .filter(item => item.submitted > 0)
    .map(item => item.questionId)
));

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

async function loadCourse() {
  loading.value = true;
  loadError.value = '';
  try {
    const response = await authFetch('/api/training-courses/me');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '课程读取失败');
    course.value = data;
    await Promise.all([loadStudents(), loadAssignments()]);
  } catch (error) {
    loadError.value = error.message;
  } finally {
    loading.value = false;
  }
}

async function loadStudents() {
  try {
    const response = await authFetch('/api/auth/students');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '学生名单读取失败');
    students.value = data;
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function loadAssignments() {
  const day = currentDay.value?.day;
  if (!day) return;
  assignmentLoading.value = true;
  try {
    const response = await authFetch(`/api/training-courses/days/${day}/assignments`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '布置进度读取失败');
    if (Number(currentDay.value?.day) !== Number(day)) return;
    assignment.value = data;
    selectedStudentIds.value = data.students.map(item => item.id);
  } catch (error) {
    assignment.value = { students: [], questions: [] };
    showMessage(error.message, 'error');
  } finally {
    assignmentLoading.value = false;
  }
}

function toggleQuestionDetails(questionId) {
  detailOpen.value = { ...detailOpen.value, [questionId]: !detailOpen.value[questionId] };
}

function isProgramQuestion(questionId) {
  return questionId.includes('-reading-') || questionId.includes('-completion-');
}

function toggleRecipients() {
  recipientsOpen.value = !recipientsOpen.value;
  if (recipientsOpen.value) selectedStudentIds.value = assignment.value.students.map(item => item.id);
}

function addSelectedClass() {
  const ids = students.value
    .filter(item => item.class_name === selectedClass.value)
    .map(item => item.id);
  selectedStudentIds.value = [...new Set([...selectedStudentIds.value, ...ids])];
}

function selectAllStudents() {
  selectedStudentIds.value = students.value.map(item => item.id);
}

async function saveAssignments() {
  assigning.value = true;
  try {
    const response = await authFetch(
      `/api/training-courses/days/${currentDay.value.day}/assignments`,
      { method: 'POST', body: JSON.stringify({ studentIds: selectedStudentIds.value }) }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '课程布置失败');
    assignment.value = data;
    selectedStudentIds.value = data.students.map(item => item.id);
    recipientsOpen.value = false;
    showMessage(`已将 Day ${currentDay.value.day} 课程布置给 ${data.students.length} 名学生`);
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    assigning.value = false;
  }
}

async function releaseQuestion(item) {
  releasingId.value = item.questionId;
  try {
    const response = await authFetch(
      `/api/training-courses/days/${currentDay.value.day}/questions/${encodeURIComponent(item.questionId)}/release`,
      { method: 'POST', body: '{}' }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '解析开放失败');
    await loadAssignments();
    showMessage(data.message);
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    releasingId.value = '';
  }
}

function startEdit() {
  draft.value = deepClone(course.value);
  editing.value = true;
}

function cancelEdit() {
  draft.value = null;
  editing.value = false;
  resetAddInputs();
}

async function saveCourse() {
  saving.value = true;
  try {
    const response = await authFetch('/api/training-courses/me', {
      method: 'PUT',
      body: JSON.stringify({
        title: draft.value.title,
        summary: draft.value.summary,
        days: draft.value.days,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '保存失败');
    course.value = data;
    draft.value = null;
    editing.value = false;
    resetAddInputs();
    await loadAssignments();
    showMessage('课程修改已保存');
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    saving.value = false;
  }
}

async function selectDay(index) {
  selectedDay.value = index;
  recipientsOpen.value = false;
  resetAddInputs();
  await loadAssignments();
}

function resetAddInputs() {
  questionSelections.value = { choice: '', reading: '', completion: '' };
  problemInputs.value = { basic: '', advanced: '', luoguBasic: '', luoguAdvanced: '' };
}

function availableQuestions(type) {
  const source = type === 'choice'
    ? allChoices
    : allPrograms.filter(item => item.type === type);
  const selected = new Set(currentDay.value?.questions?.[type] || []);
  return source
    .filter(item => !selected.has(item.id))
    .map(item => ({
      id: item.id,
      label: questionOptionLabel(item, type),
    }))
    .sort((a, b) => b.id.localeCompare(a.id, 'zh-CN', { numeric: true }));
}

function questionOptionLabel(item, type) {
  const year = item.year || item.id.slice(0, 4);
  if (type === 'choice') {
    const plain = String(item.question || '').replace(/[`$*_#]/g, '').replace(/\s+/g, ' ').slice(0, 28);
    if (item.source?.level) {
      if (item.source.level === 'CSP-S') {
        return `CSP-S ${item.source.year || year} ${item.source.typeLabel || '选择题'}第 ${item.number} 题 — ${plain}`;
      }
      const level = String(item.source.level).replace(/^GESP-/, '');
      return `GESP C++${level}级 ${item.source.session || year} ${item.source.typeLabel || '选择题'}第 ${item.number} 题 — ${plain}`;
    }
    return `${year} 选择题第 ${item.number} 题 — ${plain}`;
  }
  return `${year} ${type === 'reading' ? '阅读程序' : '完善程序'}第 ${item.number} 题`;
}

function addQuestion(type) {
  const id = questionSelections.value[type];
  const list = currentDay.value.questions[type];
  if (id && !list.includes(id)) list.push(id);
  questionSelections.value[type] = '';
}

function removeQuestion(type, id) {
  currentDay.value.questions[type] = currentDay.value.questions[type].filter(item => item !== id);
}

function addProblem(level) {
  const raw = (problemInputs.value[level] || '').trim().toUpperCase();
  const id = /^\d{4,6}$/.test(raw) ? `P${raw}` : raw;
  if (!/^P\d{4,6}$/.test(id)) {
    showMessage('请输入正确的题号，例如 1001 或 P1001', 'error');
    return;
  }
  const list = currentDay.value.programming[level] || (currentDay.value.programming[level] = []);
  if (!list.includes(id)) list.push(id);
  problemInputs.value[level] = '';
}

function removeProblem(level, id) {
  currentDay.value.programming[level] = (currentDay.value.programming[level] || []).filter(item => item !== id);
}

function openQuestion(id) {
  const item = choiceMap.get(id) || programMap.get(id);
  if (!item) {
    showMessage(`题库中未找到 ${id}`, 'error');
    return;
  }
  answerVisible.value = false;
  preview.value = {
    id,
    item,
    type: choiceMap.has(id) ? 'choice' : item.type,
  };
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
  if (!value) return '日期待定';
  return `${value.replaceAll('-', ' / ')}`;
}

onMounted(loadCourse);
</script>

<style scoped>
.training-page { height: 100%; overflow-y: auto; padding: 24px 28px 60px; background: #f7f9fc; color: #172033; }
.page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 20px; }
.page-head h2 { margin: 2px 0 8px; color: #4f46e5; font-size: 26px; }
.page-head p { max-width: 850px; margin: 0; color: #64748b; line-height: 1.7; }
.eyebrow { color: #818cf8 !important; font-size: 12px; font-weight: 800; letter-spacing: .12em; }
.head-actions { display: flex; gap: 10px; flex-shrink: 0; }
button { border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; color: #475569; padding: 9px 15px; cursor: pointer; }
button:hover:not(:disabled) { border-color: #818cf8; color: #4338ca; }
button.primary { border-color: #4f46e5; background: #4f46e5; color: #fff; font-weight: 700; }
button:disabled { opacity: .5; cursor: not-allowed; }
.message { margin-bottom: 16px; border: 1px solid #86efac; border-radius: 8px; background: #dcfce7; color: #166534; padding: 11px 15px; }
.message.error { border-color: #fca5a5; background: #fee2e2; color: #991b1b; }
.state-card { min-height: 180px; display: grid; place-items: center; border: 1px solid #dbe2ea; border-radius: 10px; background: #fff; color: #64748b; }
.state-card.error { color: #b91c1c; }
.course-meta { display: grid; gap: 14px; margin-bottom: 18px; }
.edit-card { border: 1px solid #c7d2fe; border-radius: 10px; background: #eef2ff; padding: 18px; }
.course-meta label, .edit-field { display: grid; gap: 6px; }
.course-meta label span, .edit-field span, .date-field span { color: #475569; font-size: 13px; font-weight: 700; }
input, textarea, select { width: 100%; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; color: #1e293b; padding: 9px 11px; font: inherit; box-sizing: border-box; }
textarea { resize: vertical; line-height: 1.6; }
input:focus, textarea:focus, select:focus { outline: 2px solid #c7d2fe; border-color: #6366f1; }
.day-tabs { display: grid; grid-template-columns: repeat(5, minmax(110px, 1fr)); gap: 9px; margin-bottom: 18px; }
.day-tabs button { display: grid; gap: 3px; text-align: left; padding: 11px 13px; }
.day-tabs button span { color: #94a3b8; font-size: 12px; }
.day-tabs button.active { border-color: #4f46e5; background: #eef2ff; color: #4338ca; box-shadow: 0 3px 10px rgba(79, 70, 229, .12); }
.day-tabs button.active span { color: #6366f1; }
.day-content { display: grid; gap: 18px; }
.day-head { display: flex; justify-content: space-between; gap: 20px; border-radius: 10px; background: linear-gradient(135deg, #312e81, #4f46e5); color: #fff; padding: 20px 22px; }
.day-head span { color: #c7d2fe; font-weight: 800; }
.day-head h3 { margin: 5px 0 0; font-size: 20px; }
.day-head time { align-self: center; color: #e0e7ff; }
.date-field { width: 180px; display: grid; gap: 5px; }
.date-field span { color: #e0e7ff; }
.assignment-card { border: 1px solid #c7d2fe; border-radius: 10px; background: #fff; padding: 18px 20px; }
.assignment-card > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.assignment-card h3 { margin: 0; color: #312e81; font-size: 18px; }
.assignment-card header p { margin: 5px 0 0; color: #64748b; font-size: 13px; }
.recipient-editor { margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
.recipient-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.recipient-actions select { width: 180px; }
.recipient-actions strong { margin-left: auto; color: #4338ca; font-size: 13px; }
.student-checks { display: grid; grid-template-columns: repeat(4, minmax(150px, 1fr)); gap: 8px; margin-top: 13px; }
.student-checks label { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; border: 1px solid #e2e8f0; border-radius: 7px; padding: 9px 10px; cursor: pointer; }
.student-checks input { width: auto; grid-row: 1 / 3; align-self: center; }
.student-checks span { color: #334155; font-weight: 700; }
.student-checks small { color: #94a3b8; }
.recipient-save { display: flex; justify-content: flex-end; margin-top: 13px; }
.progress-list { display: grid; gap: 8px; margin-top: 16px; }
.progress-list article { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px 16px; border-top: 1px solid #eef2f7; padding-top: 10px; }
.progress-list article > div { display: grid; gap: 3px; }
.progress-list article > div:first-child { grid-column: 1; }
.progress-list article b { color: #334155; }
.progress-list article span { color: #64748b; font-size: 13px; }
.progress-list article small { color: #c2410c; }
.progress-actions { grid-column: 2; grid-row: 1; display: flex !important; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 7px; }
.released-badge { flex-shrink: 0; border-radius: 999px; background: #dcfce7; color: #15803d; padding: 5px 9px; font-size: 12px; }
.details-button { border-color: #c7d2fe; background: #eef2ff; color: #4338ca; font-size: 12px; }
.answer-details { grid-column: 1 / -1; display: grid; gap: 6px; margin-top: 3px; border-radius: 7px; background: #f8fafc; padding: 9px 11px; }
.answer-detail { display: flex; align-items: center; justify-content: space-between; gap: 12px; border-radius: 5px; padding: 7px 9px; font-size: 13px; }
.answer-detail span { color: #334155 !important; font-size: 13px !important; }
.answer-detail span small { margin-left: 3px; color: #94a3b8 !important; font-size: 11px !important; }
.answer-detail b { font-size: 12px; }
.answer-detail.correct { background: #f0fdf4; color: #15803d; }
.answer-detail.correct b { color: #15803d; }
.answer-detail.wrong { background: #fef2f2; color: #b91c1c; }
.answer-detail.wrong b { color: #b91c1c; }
.answer-detail.missing { background: #fff7ed; color: #c2410c; }
.answer-detail.missing b { color: #c2410c; }
.session { border: 1px solid #dbe2ea; border-radius: 10px; background: #fff; padding: 22px; }
.session.afternoon { border-top: 4px solid #0ea5e9; }
.session-title { display: flex; align-items: center; gap: 12px; margin-bottom: 17px; }
.session-title h3 { margin: 0; color: #1e293b; font-size: 19px; }
.period { border-radius: 999px; background: #e0e7ff; color: #4338ca; padding: 5px 10px; font-size: 12px; font-weight: 800; white-space: nowrap; }
.afternoon .period { background: #e0f2fe; color: #0369a1; }
.info-grid, .edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.info-block { border: 1px solid #eef2f7; border-radius: 8px; background: #f8fafc; padding: 14px 15px; }
.info-block b { color: #4f46e5; font-size: 13px; }
.info-block p { margin: 7px 0 0; color: #475569; line-height: 1.7; white-space: pre-line; }
.edit-field.wide { grid-column: 1 / -1; }
.question-section, .program-section { margin-top: 22px; border-top: 1px solid #e2e8f0; padding-top: 19px; }
.section-heading h4 { margin: 0; color: #1e293b; font-size: 17px; }
.section-heading p { margin: 5px 0 0; color: #64748b; font-size: 13px; }
.question-groups { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 14px; }
.question-group, .program-group { border: 1px solid #dbe2ea; border-radius: 8px; padding: 14px; }
.question-group h5, .program-group h5 { margin: 0 0 10px; color: #334155; font-size: 15px; }
.question-chips, .program-links { display: flex; flex-wrap: wrap; gap: 7px; }
.question-chip, .program-link { display: inline-flex; align-items: stretch; border: 1px solid #c7d2fe; border-radius: 6px; background: #eef2ff; overflow: hidden; }
.question-chip button { border: 0; border-radius: 0; background: transparent; color: #4338ca; padding: 6px 9px; font-size: 12px; }
.question-chip button.remove { border-left: 1px solid #c7d2fe; color: #dc2626; padding-inline: 7px; }
.empty-text { color: #94a3b8; font-size: 13px; }
.add-row { display: flex; gap: 7px; margin-top: 10px; }
.add-row select, .add-row input { min-width: 0; }
.add-row button { flex-shrink: 0; }
.program-groups { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
.program-group > p { margin: -4px 0 12px; color: #64748b; font-size: 13px; }
.program-link a { padding: 7px 10px; color: #2563eb; font-weight: 800; text-decoration: none; }
.program-link a:hover { text-decoration: underline; }
.program-link button { border: 0; border-left: 1px solid #c7d2fe; border-radius: 0; background: transparent; color: #dc2626; padding: 5px 8px; }
.modal-mask { position: fixed; inset: 0; z-index: 120; display: flex; align-items: center; justify-content: center; background: rgba(15, 23, 42, .55); padding: 24px; }
.question-modal { width: min(960px, 100%); max-height: 90vh; overflow-y: auto; border-radius: 12px; background: #fff; box-shadow: 0 24px 70px rgba(15, 23, 42, .3); }
.question-modal > header { position: sticky; top: 0; z-index: 2; display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; border-bottom: 1px solid #e2e8f0; background: #fff; padding: 18px 22px; }
.question-modal > header span { color: #6366f1; font-size: 12px; font-weight: 800; }
.question-modal > header h3 { margin: 4px 0 0; color: #1e293b; }
.question-modal .close { border: 0; padding: 0 7px; color: #64748b; font-size: 28px; line-height: 1; }
.answer-controls { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; padding: 10px 22px; color: #64748b; font-size: 13px; }
.answer-toggle { border: 1px solid #c7d2fe; border-radius: 6px; background: #eef2ff; color: #4338ca; padding: 6px 12px; font-weight: 700; cursor: pointer; }
.answer-toggle:hover { background: #e0e7ff; }
.question-body { padding: 22px; }
.markdown { color: #334155; line-height: 1.75; }
.markdown :deep(pre) { overflow: auto; border-radius: 7px; background: #0d1117; color: #e2e8f0; padding: 16px; }
.markdown :deep(code) { font-size: 14px; }
.option-list { display: grid; gap: 8px; padding: 0; list-style: none; }
.option-list li { display: flex; gap: 10px; border: 1px solid #e2e8f0; border-radius: 7px; padding: 10px 12px; }
.option-list li b { color: #4f46e5; }
.answer-box { margin-top: 14px; border-left: 4px solid #22c55e; border-radius: 5px; background: #f0fdf4; padding: 13px 15px; }
.answer-box > b { color: #166534; }
.answer-box .markdown { margin-top: 8px; }
.sub-question { border-top: 1px solid #e2e8f0; padding: 18px 0; }
.sub-question h4 { line-height: 1.7; }
@media (max-width: 900px) {
  .day-tabs { grid-template-columns: repeat(2, 1fr); }
  .question-groups, .program-groups, .info-grid, .edit-grid { grid-template-columns: 1fr; }
  .student-checks { grid-template-columns: repeat(2, 1fr); }
  .edit-field.wide { grid-column: auto; }
}
@media (max-width: 640px) {
  .training-page { padding: 18px 14px 48px; }
  .page-head, .day-head, .assignment-card > header { flex-direction: column; }
  .progress-list article { grid-template-columns: 1fr; }
  .progress-actions { grid-column: 1; grid-row: auto; justify-content: flex-start; }
  .head-actions, .head-actions button { width: 100%; }
  .date-field { width: 100%; }
  .student-checks { grid-template-columns: 1fr; }
}
</style>

<style>
/* 这些规则只作用于本页的脚本内小组件；用 training-page 限定，避免影响其他页面。 */
.training-page .edit-field > span { color: #475569; font-size: 13px; font-weight: 700; }
.training-page .edit-field > input,
.training-page .edit-field > textarea,
.training-page .add-row > input,
.training-page .add-row > select {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #fff;
  color: #1e293b;
  padding: 9px 11px;
  font: inherit;
}
.training-page .edit-field > textarea { resize: vertical; line-height: 1.6; }
.training-page .edit-field > input:focus,
.training-page .edit-field > textarea:focus,
.training-page .add-row > input:focus,
.training-page .add-row > select:focus {
  outline: 2px solid #c7d2fe;
  border-color: #6366f1;
}
.training-page .info-block > b { color: #4f46e5; font-size: 13px; }
.training-page .info-block > p { margin: 7px 0 0; color: #475569; line-height: 1.7; white-space: pre-line; }
.training-page .question-group > h5,
.training-page .program-group > h5 { margin: 0 0 10px; color: #334155; font-size: 15px; }
.training-page .program-group > p { margin: -4px 0 12px; color: #64748b; font-size: 13px; }
.training-page .question-chips,
.training-page .program-links { display: flex; flex-wrap: wrap; gap: 7px; }
.training-page .question-chip,
.training-page .program-link {
  display: inline-flex;
  align-items: stretch;
  overflow: hidden;
  border: 1px solid #c7d2fe;
  border-radius: 6px;
  background: #eef2ff;
}
.training-page .question-chip > button,
.training-page .program-link > button {
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 6px 9px;
  cursor: pointer;
}
.training-page .question-chip > button:first-child { color: #4338ca; font-size: 12px; }
.training-page .question-chip > button.remove,
.training-page .program-link > button { border-left: 1px solid #c7d2fe; color: #dc2626; padding-inline: 7px; }
.training-page .program-link > a { padding: 7px 10px; color: #2563eb; font-weight: 800; text-decoration: none; }
.training-page .program-link > a:hover { text-decoration: underline; }
.training-page .add-row { display: flex; gap: 7px; margin-top: 10px; }
.training-page .add-row > button {
  flex-shrink: 0;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #fff;
  color: #475569;
  padding: 9px 15px;
  cursor: pointer;
}
.training-page .add-row > button:disabled { opacity: .5; cursor: not-allowed; }
.training-page .answer-box > b { color: #166534; }
.training-page .answer-box > .markdown { margin-top: 8px; }
.training-page .markdown sub,
.training-page .markdown sup,
.training-page .option-list sub,
.training-page .option-list sup { font-size: .72em; line-height: 0; position: relative; vertical-align: baseline; }
.training-page .markdown sub,
.training-page .option-list sub { bottom: -.25em; }
.training-page .markdown sup,
.training-page .option-list sup { top: -.45em; }
.training-page .math-fraction {
  display: inline-flex;
  flex-direction: column;
  vertical-align: middle;
  line-height: 1.05;
  text-align: center;
  margin: 0 .12em;
}
.training-page .math-fraction > span:first-child { border-bottom: 1px solid currentColor; padding: 0 .18em; }
.training-page .math-fraction > span:last-child { padding: 0 .18em; }
.training-page .math-radical { display: inline-flex; align-items: flex-start; vertical-align: middle; }
.training-page .math-radical > span { border-top: 1px solid currentColor; padding: 0 .12em; }
</style>
