<template>
  <div class="paper-page">
    <h2>📝 CSP 整卷测评</h2>
    <p class="hint">选择完整试卷，布置给学生并查看每题答题情况。</p>

    <div class="layout">
      <section class="panel">
        <h3>新建整卷任务</h3>
        <div class="form">
          <label>级别
            <select v-model="form.level">
              <option>CSP-J</option>
              <option>CSP-S</option>
            </select>
          </label>
          <label>年份
            <select v-model.number="form.year">
              <option v-for="year in years" :key="year">{{ year }}</option>
            </select>
          </label>
          <label>任务名称
            <input v-model="form.title" placeholder="默认使用试卷名称">
          </label>
          <label>截止时间
            <input v-model="form.deadline" type="datetime-local">
          </label>
        </div>

        <h4>学生</h4>
        <div class="actions">
          <button @click="selectedIds = students.map(student => student.id)">全选</button>
          <button @click="selectedIds = []">清空</button>
          <span>已选 {{ selectedIds.length }} 人</span>
        </div>
        <div class="student-grid">
          <label v-for="student in students" :key="student.id">
            <input v-model="selectedIds" type="checkbox" :value="student.id">
            <span>{{ student.name }}</span>
            <small>{{ student.class_name || '未分班' }}</small>
          </label>
        </div>
        <button class="create-button" :disabled="busy || !selectedIds.length" @click="createAssignment">
          {{ busy ? '保存中…' : '布置整卷' }}
        </button>
      </section>

      <section class="panel">
        <h3>已布置整卷</h3>
        <p v-if="!assignments.length" class="empty">还没有整卷任务。</p>
        <button
          v-for="item in assignments"
          :key="item.id"
          class="assignment"
          @click="detail?.id === item.id ? closeDetail() : loadDetail(item.id)"
        >
          <strong>{{ item.title }}</strong>
          <span>{{ item.level }} · {{ item.year }} · {{ item.completed_count || 0 }}/{{ item.student_count || 0 }} 人完成 · {{ item.submission_count || 0 }} 题次</span>
        </button>

        <div v-if="detail" class="detail">
          <header>
            <div>
              <h3>{{ detail.title }}</h3>
              <p>{{ detail.level }} {{ detail.year }} · {{ detail.students.length }} 人 · 题库分值 {{ detail.maxScore }}</p>
            </div>
            <div class="detail-actions">
              <select v-model.number="extraStudentId">
                <option :value="0">补充学生</option>
                <option v-for="student in availableExtraStudents" :key="student.id" :value="student.id">{{ student.name }}</option>
              </select>
              <button class="action-button add-button" @click="addStudent" :disabled="busy || !extraStudentId">添加学生</button>
              <button class="action-button edit-button" @click="startEdit" :disabled="busy">编辑任务</button>
              <button class="action-button delete-button" @click="deleteAssignment" :disabled="busy">删除任务</button>
              <button class="action-button export-button" @click="exportAssignmentDetail" :disabled="!detail.questions?.length">导出本卷记录</button>
              <button v-if="!detail.analysisReleasedAt" class="action-button release-button" @click="release" :disabled="busy">开放整卷解析</button>
              <b v-else class="released">✓ 解析已开放</b>
              <button class="action-button close-detail-button" @click="closeDetail">收起任务详情</button>
            </div>
          </header>

          <div v-if="editing" class="edit-form">
            <label>任务名称
              <input v-model="editForm.title" maxlength="120">
            </label>
            <label>截止时间
              <input v-model="editForm.deadline" type="datetime-local">
            </label>
            <div>
              <button class="action-button save-button" @click="saveEdit" :disabled="busy">保存修改</button>
              <button class="action-button cancel-button" @click="cancelEdit" :disabled="busy">取消</button>
            </div>
          </div>

          <div class="summary">
            <span v-for="item in detail.students" :key="item.studentId">
              {{ item.name }}：{{ item.submitted }}/{{ item.total }}，{{ item.score }}/{{ item.maxScore }}
            </span>
          </div>

          <h4>每题答题情况</h4>
          <article v-for="item in detail.questions" :key="item.questionId" class="question-stat">
            <div>
              <strong>{{ item.type }} {{ item.number }}</strong>
              <span>{{ item.submitted }}/{{ item.total }} 人提交 · 平均 {{ item.averagePercent == null ? '—' : item.averagePercent + '%' }}</span>
            </div>
            <details @toggle="setQuestionDetailOpen(item.questionId, $event)">
              <summary>
                {{ questionDetailOpen(item.questionId) ? '收起明细' : '查看明细' }}
              </summary>
              <p
                v-for="answer in item.details"
                :key="answer.studentId"
                :class="answer.submitted ? (answer.correct ? 'ok' : 'bad') : 'muted'"
              >
                <b>{{ answer.name }}</b>：
                {{ answer.submitted ? (answer.score + '/' + answer.maxScore + (answer.correct ? ' 正确' : ' 错误')) : '未提交' }}
                <small v-if="answer.submitted">
                  ；作答 {{ formatAnswers(answer.answers) }}
                  <span v-if="answer.parts?.length">；小问 {{ answer.parts.map(part => part.correct ? '对' : '错').join('、') }}</span>
                </small>
              </p>
            </details>
          </article>

        </div>
      </section>
    </div>

    <section class="panel history-panel" :class="{ 'is-open': historyOpen }">
      <div class="history-collapsed-head">
        <div>
          <h3>学生整卷历史记录</h3>
          <p>默认折叠，不影响布置整卷；展开后查看历史成绩和 AI 分析。</p>
        </div>
        <button class="history-toggle" @click="historyOpen = !historyOpen">
          {{ historyOpen ? '收起历史记录' : '展开历史记录' }}
        </button>
      </div>

      <div v-if="historyOpen" class="history-content">
        <div class="history-head">
          <div>
            <h4>历史成绩与分析</h4>
            <p>可查看每次整卷的总分、分部分数、错题知识点，并按需生成 AI 分析。</p>
          </div>
          <div class="history-tools">
            <select v-model.number="historyStudentId" @change="loadStudentHistory">
              <option :value="0">选择学生</option>
              <option v-for="student in students" :key="student.id" :value="student.id">{{ student.name }}</option>
            </select>
            <button class="action-button refresh-button" @click="loadStudentHistory" :disabled="historyLoading || !historyStudentId">刷新记录</button>
            <button class="action-button export-button" @click="exportPaperHistory" :disabled="historyLoading || !history?.papers?.length">导出整卷记录</button>
            <button class="action-button ai-button" @click="analyzeHistory" :disabled="historyLoading || analysisLoading === 'history' || !historyStudentId || !history?.papers?.some(paper => paper.submittedCount > 0)">
              {{ analysisLoading === 'history' ? '分析中…' : (history?.papers?.some(paper => paper.submittedCount > 0) ? 'AI分析历史' : '完成提交后可分析') }}
            </button>
          </div>
        </div>

        <p v-if="historyLoading" class="history-status">正在加载该学生的整卷记录…</p>
        <template v-else-if="history">
          <div class="history-student">
            <strong>{{ history.student.name }}</strong>
            <span>{{ history.student.className || '未分班' }} · 共 {{ history.papers.length }} 次整卷</span>
          </div>
          <p v-if="!history.papers.length" class="history-status">该学生还没有整卷练习记录。</p>

          <article v-for="paper in history.papers" :key="paper.assignmentId" class="history-paper">
            <div class="history-paper-head">
              <div>
                <h5>{{ paper.title }}</h5>
                <p>{{ paper.level }} · {{ paper.year }} · {{ paper.completedAt || paper.assignedAt || '尚未开始' }}</p>
              </div>
              <div class="paper-total-score">
                <strong>{{ paper.score }}/{{ paper.maxScore }} 分</strong>
                <span>{{ paper.submittedCount ? (paper.percent + '%') : '未开始' }}</span>
              </div>
            </div>
            <div class="section-score-grid">
              <span v-for="section in Object.values(paper.sections)" :key="section.type">
                <b>{{ section.label }}</b>
                {{ section.score }}/{{ section.maxScore }} 分
                <small>{{ section.submittedQuestions }}/{{ section.totalQuestions }} 题</small>
              </span>
            </div>
            <details v-if="paper.wrongQuestions.length" class="wrong-question-list">
              <summary>查看失分题（{{ paper.wrongQuestions.length }}）</summary>
              <p v-for="item in paper.wrongQuestions" :key="item.questionId">
                {{ item.typeLabel }}第{{ item.number }}题：{{ item.score }}/{{ item.maxScore }} 分
                <small v-if="item.knowledgeTags?.length">；知识点：{{ item.knowledgeTags.join('、') }}</small>
                <small v-if="item.parts?.length">（{{ item.parts.map(part => part.id + '：作答 ' + (part.selected.join('/') || '未答') + '，正确 ' + part.correctAnswers.join('/')).join('；') }}）</small>
              </p>
            </details>
            <button
              class="action-button ai-button paper-ai-button"
              @click="analyzePaper(paper)"
              :disabled="!paper.submittedCount || analysisLoading === 'paper:' + paper.assignmentId"
            >
              {{ analysisLoading === 'paper:' + paper.assignmentId ? '分析中…' : (paper.submittedCount ? 'AI分析本卷' : '未提交，暂不能分析') }}
            </button>
            <div v-if="paperAnalyses[paper.assignmentId]" class="ai-result markdown" v-html="renderAi(paperAnalyses[paper.assignmentId])"></div>
            <div v-else-if="analysisLoading === 'paper:' + paper.assignmentId" class="ai-result ai-pending">正在生成分析，请稍候…</div>
          </article>

          <div v-if="analysisLoading === 'history' || historyAnalysis" class="history-analysis">
            <h5>AI历史表现分析</h5>
            <p v-if="analysisLoading === 'history' && !historyAnalysis" class="history-status">正在分析历史练习情况…</p>
            <div v-if="historyAnalysis" class="ai-result markdown" v-html="renderAi(historyAnalysis)"></div>
            <div v-else-if="analysisLoading === 'history'" class="ai-result ai-pending">正在生成历史分析，请稍候…</div>
          </div>
        </template>
      </div>
    </section>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { authFetch } from '../utils/auth';
import { renderCspMarkdown } from '../utils/cspMarkdown';
import { downloadMarkdown } from '../utils/downloadMarkdown';

const years = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
const students = ref([]);
const selectedIds = ref([]);
const assignments = ref([]);
const detail = ref(null);
const extraStudentId = ref(0);
const busy = ref(false);
const error = ref('');
const editing = ref(false);
const editForm = ref({ title: '', deadline: '' });
const historyStudentId = ref(0);
const history = ref(null);
const historyOpen = ref(false);
const historyLoading = ref(false);
const historyAnalysis = ref('');
const paperAnalyses = ref({});
const analysisLoading = ref('');
const expandedQuestionDetails = ref(new Set());

const availableExtraStudents = computed(() => students.value.filter(student =>
  !detail.value?.students?.some(item => Number(item.studentId) === Number(student.id))
));
const form = ref({ level: 'CSP-J', year: 2025, title: '', deadline: '' });

function readJson(response) {
  return response.json().then(data => {
    if (!response.ok) throw new Error(data.error || '请求失败');
    return data;
  });
}

function formatAnswers(answers) {
  return Object.values(answers || {})
    .map(value => Array.isArray(value) ? value.join('、') : String(value || ''))
    .filter(Boolean)
    .join('；') || '—';
}

function exportPaperHistory() {
  if (!history.value?.papers?.length) return;
  const headers = ['学生', '账号', '班级', '整卷任务', '级别', '年份', '完成时间', '提交题数', '总题数', '总分', '满分', '得分率', '分部分数', '错题与知识点'];
  const rows = history.value.papers.map(paper => [
    history.value.student.name,
    history.value.student.username || '',
    history.value.student.className || '',
    paper.title,
    paper.level,
    paper.year,
    paper.completedAt || paper.assignedAt || '',
    paper.submittedCount,
    paper.totalQuestions,
    paper.score,
    paper.maxScore,
    paper.submittedCount ? `${paper.percent}%` : '',
    Object.values(paper.sections || {}).map(section => `${section.label}${section.score}/${section.maxScore}分（${section.submittedQuestions}/${section.totalQuestions}题）`).join('；'),
    (paper.wrongQuestions || []).map(item => {
      const parts = (item.parts || []).map(part => `${part.id}：作答${part.selected?.join('/') || '未答'}，正确${part.correctAnswers?.join('/') || ''}`).join('；');
      return `${item.typeLabel}第${item.number}题 ${item.score}/${item.maxScore}分${item.knowledgeTags?.length ? `（${item.knowledgeTags.join('、')}）` : ''}${parts ? `：${parts}` : ''}`;
    }).join('；'),
  ]);
  downloadMarkdown(`CSP整卷练习记录-${history.value.student.name}-${new Date().toLocaleDateString('sv-SE')}.md`, `CSP整卷练习记录（${history.value.student.name}）`, headers, rows);
}

function exportAssignmentDetail() {
  if (!detail.value?.students?.length || !detail.value?.questions?.length) return;
  const typeLabels = { choice: '选择题', reading: '阅读程序题', completion: '完善程序题' };
  const byStudent = new Map(detail.value.students.map(student => [student.studentId, { student, questions: [] }]));
  for (const question of detail.value.questions) {
    for (const answer of question.details || []) {
      const item = byStudent.get(answer.studentId);
      if (!item) continue;
      const result = answer.submitted
        ? `${answer.score}/${answer.maxScore}分，${answer.correct ? '正确' : '错误'}，作答：${formatAnswers(answer.answers)}`
        : '未提交';
      item.questions.push(`${typeLabels[question.type] || question.type}第${question.number}题：${result}`);
    }
  }
  const headers = ['学生', '账号', '班级', '提交题数', '总题数', '总分', '满分', '得分率', '逐题作答'];
  const rows = [...byStudent.values()].map(({ student, questions }) => [
    student.name,
    student.username || '',
    student.className || '',
    student.submitted,
    student.total,
    student.score,
    student.maxScore,
    student.percent == null ? '' : `${student.percent}%`,
    questions.join('；'),
  ]);
  downloadMarkdown(`CSP整卷记录-${detail.value.level}-${detail.value.year}-${new Date().toLocaleDateString('sv-SE')}.md`, `${detail.value.level} ${detail.value.year} CSP整卷记录`, headers, rows);
}

function questionDetailOpen(questionId) {
  return expandedQuestionDetails.value.has(questionId);
}

function setQuestionDetailOpen(questionId, event) {
  const next = new Set(expandedQuestionDetails.value);
  if (event.currentTarget.open) next.add(questionId);
  else next.delete(questionId);
  expandedQuestionDetails.value = next;
}

function sanitizeAnalysis(value) {
  return String(value || '')
    .replace(/完善程序[�?]{1,6}题/g, '完善程序题')
    .replace(/阅读程序[�?]{1,6}题/g, '阅读程序题')
    .replace(/整卷[�?]{1,6}/g, '整卷')
    .replace(/分析[�?]{1,6}/g, '分析')
    .replace(/�+/g, '');
}

function renderAi(value) {
  return renderCspMarkdown(sanitizeAnalysis(value));
}

function resetHistory() {
  history.value = null;
  historyAnalysis.value = '';
  paperAnalyses.value = {};
  analysisLoading.value = '';
  expandedQuestionDetails.value = new Set();
}

async function load() {
  error.value = '';
  try {
    const [studentResponse, assignmentResponse] = await Promise.all([
      authFetch('/api/auth/students'),
      authFetch('/api/csp-papers/assignments'),
    ]);
    students.value = await readJson(studentResponse);
    assignments.value = await readJson(assignmentResponse);
    selectedIds.value = students.value.map(item => item.id);
    historyStudentId.value = Number(students.value[0]?.id || 0);
    // 历史记录默认折叠；后台预取不阻塞布置整卷区域的首屏显示。
    if (historyStudentId.value) void loadStudentHistory();
  } catch (e) {
    error.value = e.message;
  }
}

async function createAssignment() {
  busy.value = true;
  error.value = '';
  try {
    const data = await readJson(await authFetch('/api/csp-papers/assignments', {
      method: 'POST',
      body: JSON.stringify({ ...form.value, studentIds: selectedIds.value }),
    }));
    detail.value = data;
    assignments.value = await readJson(await authFetch('/api/csp-papers/assignments'));
    form.value.title = '';
    resetHistory();
    selectDefaultHistoryStudent();
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}

function selectDefaultHistoryStudent() {
  historyStudentId.value = Number(detail.value?.students?.[0]?.studentId || 0);
  if (historyStudentId.value) loadStudentHistory();
}

async function loadDetail(id) {
  error.value = '';
  resetHistory();
  try {
    detail.value = await readJson(await authFetch(`/api/csp-papers/assignments/${id}`));
    editForm.value = { title: detail.value.title, deadline: detail.value.deadline || '' };
    editing.value = false;
    selectDefaultHistoryStudent();
  } catch (e) {
    error.value = e.message;
  }
}

function closeDetail() {
  detail.value = null;
  editing.value = false;
  extraStudentId.value = 0;
}

function startEdit() {
  if (!detail.value) return;
  editForm.value = { title: detail.value.title, deadline: detail.value.deadline || '' };
  editing.value = true;
}

function cancelEdit() {
  editing.value = false;
}

async function saveEdit() {
  if (!detail.value) return;
  busy.value = true;
  error.value = '';
  try {
    detail.value = await readJson(await authFetch(`/api/csp-papers/assignments/${detail.value.id}`, {
      method: 'PUT',
      body: JSON.stringify(editForm.value),
    }));
    assignments.value = await readJson(await authFetch('/api/csp-papers/assignments'));
    editing.value = false;
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}

async function deleteAssignment() {
  if (!detail.value || !confirm(`确定删除“${detail.value.title}”吗？该任务的提交记录也会一并删除。`)) return;
  busy.value = true;
  error.value = '';
  try {
    await readJson(await authFetch(`/api/csp-papers/assignments/${detail.value.id}`, { method: 'DELETE' }));
    detail.value = null;
    editing.value = false;
    resetHistory();
    assignments.value = await readJson(await authFetch('/api/csp-papers/assignments'));
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}

async function addStudent() {
  if (!detail.value || !extraStudentId.value) return;
  busy.value = true;
  error.value = '';
  try {
    detail.value = await readJson(await authFetch(`/api/csp-papers/assignments/${detail.value.id}/students`, {
      method: 'POST',
      body: JSON.stringify({ studentIds: [extraStudentId.value] }),
    }));
    extraStudentId.value = 0;
    if (historyStudentId.value) loadStudentHistory();
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}

async function release() {
  if (!detail.value || !confirm('确定开放这份整卷的解析吗？已提交学生将立即看到对错和解析。')) return;
  busy.value = true;
  error.value = '';
  try {
    detail.value = await readJson(await authFetch(`/api/csp-papers/assignments/${detail.value.id}/release`, {
      method: 'POST',
      body: '{}',
    }));
    if (historyStudentId.value) loadStudentHistory();
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}

async function loadStudentHistory() {
  if (!historyStudentId.value) {
    history.value = null;
    return;
  }
  historyLoading.value = true;
  error.value = '';
  try {
    history.value = await readJson(await authFetch(`/api/csp-papers/students/${historyStudentId.value}/history`));
    historyAnalysis.value = '';
    paperAnalyses.value = {};
  } catch (e) {
    history.value = null;
    error.value = e.message;
  } finally {
    historyLoading.value = false;
  }
}

async function ensureAnalysisResponse(response) {
  if (response.ok) return response;
  let message = 'AI 分析失败';
  try {
    const data = await response.json();
    message = data.error || message;
  } catch {
    // ignore malformed error body
  }
  throw new Error(message);
}

async function readStream(response, onJson) {
  if (!response.body) throw new Error('AI 服务没有返回分析内容');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let receivedContent = false;
  const consumeLine = line => {
    const normalized = line.replace(/\r$/, '');
    if (!normalized.startsWith('data:')) return;
    const payload = normalized.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    try {
      const parsed = JSON.parse(payload);
      if (parsed.content) receivedContent = true;
      onJson(parsed);
    } catch {
      // Provider frames can be split across network chunks; keep malformed frames out of the UI.
    }
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      if (buffer) consumeLine(buffer);
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    lines.forEach(consumeLine);
  }
  return receivedContent;
}

async function analyzePaper(paper) {
  const key = String(paper.assignmentId);
  if (analysisLoading.value) return;
  analysisLoading.value = `paper:${key}`;
  paperAnalyses.value = { ...paperAnalyses.value, [key]: '' };
  try {
    const response = await ensureAnalysisResponse(await authFetch(
      `/api/csp-papers/assignments/${paper.assignmentId}/students/${historyStudentId.value}/analyze`,
      { method: 'POST', body: '{}' },
    ));
    const received = await readStream(response, payload => {
      if (payload.content) paperAnalyses.value = { ...paperAnalyses.value, [key]: paperAnalyses.value[key] + payload.content };
      if (payload.error) paperAnalyses.value = { ...paperAnalyses.value, [key]: '⚠️ ' + payload.error };
    });
    if (!received && !paperAnalyses.value[key]) {
      paperAnalyses.value = { ...paperAnalyses.value, [key]: '⚠️ AI 服务未返回有效分析内容，请稍后重试。' };
    }
  } catch (e) {
    paperAnalyses.value = { ...paperAnalyses.value, [key]: '⚠️ ' + e.message };
  } finally {
    analysisLoading.value = '';
  }
}

async function analyzeHistory() {
  if (!historyStudentId.value || analysisLoading.value) return;
  analysisLoading.value = 'history';
  historyAnalysis.value = '';
  try {
    const response = await ensureAnalysisResponse(await authFetch(
      `/api/csp-papers/students/${historyStudentId.value}/history/analyze`,
      { method: 'POST', body: '{}' },
    ));
    const received = await readStream(response, payload => {
      if (payload.content) historyAnalysis.value += payload.content;
      if (payload.error) historyAnalysis.value = '⚠️ ' + payload.error;
    });
    if (!received && !historyAnalysis.value) historyAnalysis.value = '⚠️ AI 服务未返回有效分析内容，请稍后重试。';
  } catch (e) {
    historyAnalysis.value = '⚠️ ' + e.message;
  } finally {
    analysisLoading.value = '';
  }
}

onMounted(load);
</script>

<style scoped>
.paper-page {
  height: 100%;
  overflow: auto;
  padding: 26px 30px 60px;
  background: #f7f9fc;
  color: #172033;
}
.paper-page h2 { margin: 0; color: #3730a3; }
.hint { color: #64748b; }
.layout {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(420px, 1fr);
  gap: 18px;
}
.panel {
  padding: 20px;
  border: 1px solid #dbe3f0;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 5px 18px #1e293b0b;
}
.form { display: grid; gap: 10px; }
.form label, .edit-form label {
  display: grid;
  gap: 5px;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
}
.form input, .form select, .edit-form input {
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font: inherit;
}
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0;
}
.actions span { color: #64748b; font-size: 13px; }
.student-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  max-height: 280px;
  overflow: auto;
  margin-bottom: 14px;
}
.student-grid label {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 3px 7px;
  padding: 9px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.student-grid small { grid-column: 2; color: #94a3b8; }
.assignment {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  margin: 8px 0;
  padding: 12px;
  border: 1px solid #c7d2fe;
  border-radius: 9px;
  background: #eef2ff;
  color: #3730a3;
  text-align: left;
  cursor: pointer;
}
.assignment span { color: #64748b; font-size: 12px; }
.detail { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
.detail > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.detail-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}
.detail-actions select, .history-tools select {
  min-height: 42px;
  padding: 0 34px 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  background: #fff;
  color: #475569;
  font: inherit;
}
.action-button {
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: 9px;
  font: inherit;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}
.action-button:disabled { opacity: .48; cursor: not-allowed; }
.add-button, .refresh-button { border-color: #c7d2fe; background: #eef2ff; color: #4338ca; }
.export-button { border-color: #c7d2fe; background: #eef2ff; color: #4338ca; }
.export-button:hover:not(:disabled) { background: #e0e7ff; }
.edit-button, .cancel-button { border-color: #cbd5e1; background: #fff; color: #4338ca; }
.delete-button { border-color: #fecaca; background: #fff7f7; color: #b91c1c; }
.close-detail-button { border-color: #cbd5e1; background: #f8fafc; color: #475569; }
.save-button, .release-button { background: #4f46e5; color: #fff; }
.ai-button { border-color: #a7f3d0; background: #ecfdf5; color: #047857; }
.ai-button:hover:not(:disabled) { background: #d1fae5; }
.paper-ai-button { margin-top: 12px; }
.released {
  padding: 8px 12px;
  border: 1px solid #86efac;
  border-radius: 9px;
  background: #f0fdf4;
  color: #15803d;
  white-space: nowrap;
}
.edit-form {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) auto;
  align-items: end;
  gap: 10px;
  margin: 14px 0;
  padding: 14px;
  border: 1px solid #c7d2fe;
  border-radius: 10px;
  background: #eef2ff;
}
.edit-form > div { display: flex; gap: 8px; }
.summary {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: 10px 0;
}
.summary span {
  padding: 5px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 12px;
}
.question-stat {
  padding: 10px 0;
  border-top: 1px solid #eef2f7;
}
.question-stat > div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.question-stat span { color: #64748b; font-size: 12px; }
.question-stat summary, .wrong-question-list summary {
  margin-top: 7px;
  color: #4f46e5;
  cursor: pointer;
  user-select: none;
}
.question-stat p { margin: 5px 0; font-size: 13px; }
.ok { color: #15803d; }
.bad { color: #b91c1c; }
.muted, .history-status { color: #94a3b8; }
.question-stat small { color: inherit; }
.history-panel {
  margin-top: 18px;
  border-top: 3px solid #c7d2fe;
}
.history-panel:not(.is-open) { padding-top: 14px; padding-bottom: 14px; }
.history-collapsed-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.history-collapsed-head h3 { margin: 0 0 4px; }
.history-collapsed-head p { margin: 0; color: #64748b; font-size: 13px; }
.history-toggle {
  min-height: 40px;
  padding: 0 15px;
  border: 1px solid #c7d2fe;
  border-radius: 9px;
  background: #eef2ff;
  color: #4338ca;
  font: inherit;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}
.history-toggle:hover { background: #e0e7ff; }
.history-content { margin-top: 16px; }
.history-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}
.history-head h4 { margin: 0 0 4px; }
.history-head p { margin: 0; color: #64748b; font-size: 13px; }
.history-tools {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
.history-student {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 16px 0 10px;
}
.history-student span { color: #64748b; font-size: 13px; }
.history-paper {
  margin-top: 12px;
  padding: 14px;
  border: 1px solid #dbe3f0;
  border-radius: 12px;
  background: #fbfdff;
}
.history-paper-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.history-paper h5 { margin: 0; font-size: 15px; color: #1e3a8a; }
.history-paper p { margin: 5px 0 0; color: #64748b; font-size: 12px; }
.paper-total-score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  color: #047857;
}
.paper-total-score strong { font-size: 18px; }
.paper-total-score span { font-size: 12px; }
.section-score-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}
.section-score-grid span {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px;
  border-radius: 8px;
  background: #eff6ff;
  color: #334155;
  font-size: 13px;
}
.section-score-grid b { color: #1d4ed8; }
.section-score-grid small { color: #64748b; font-size: 11px; }
.wrong-question-list { margin-top: 10px; font-size: 12px; }
.wrong-question-list p { color: #b91c1c; }
.wrong-question-list small { color: #64748b; }
.history-analysis {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid #a7f3d0;
  border-radius: 12px;
  background: #f0fdf4;
}
.history-analysis h5 { margin: 0 0 8px; color: #047857; }
.ai-result {
  margin: 12px 0 0;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  color: #334155;
  font: inherit;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
.ai-result :deep(h2) {
  margin: 0 0 10px;
  color: #1e3a8a;
  font-size: 18px;
}
.ai-result :deep(p) { margin: 8px 0; }
.ai-result :deep(ol), .ai-result :deep(ul) { margin: 8px 0 8px 22px; padding: 0; }
.ai-pending { color: #475569; background: #f1f5f9; }
.history-analysis .ai-result { background: #fff; }
.empty { color: #64748b; }
.error { margin-top: 14px; color: #b91c1c; }
.create-button {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  margin-top: 4px;
  padding: 0 20px;
  border: 1px solid #4f46e5;
  border-radius: 10px;
  background: linear-gradient(135deg, #635bff, #4f46e5);
  box-shadow: 0 8px 18px rgba(79, 70, 229, .22);
  color: #fff;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}
.create-button:disabled { border-color: #cbd5e1; background: #e2e8f0; box-shadow: none; color: #94a3b8; cursor: not-allowed; }
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .paper-page { padding: 18px 14px; }
  .student-grid { grid-template-columns: 1fr; }
  .detail > header, .history-head, .history-collapsed-head { flex-direction: column; align-items: flex-start; }
  .detail-actions, .history-tools { width: 100%; justify-content: flex-start; }
  .edit-form { grid-template-columns: 1fr; }
  .edit-form > div { justify-content: flex-start; }
  .section-score-grid { grid-template-columns: 1fr; }
}
</style>
