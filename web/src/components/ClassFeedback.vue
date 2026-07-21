<template>
  <div class="feedback-page">
    <div class="fb-inner">
    <header class="fb-head">
      <h2>📝 课后反馈</h2>
      <button class="style-toggle" @click="showStyle = !showStyle">
        {{ showStyle ? '▲ 收起风格设置' : '⚙️ 课评风格设置' }}
      </button>
    </header>

    <div v-if="showStyle" class="style-panel">
      <p class="style-hint">每位老师可自定义课评风格规则，保存后仅对自己生效；留空则使用系统默认规则。</p>
      <textarea v-model="styleText" rows="16" placeholder="课评风格规则（留空使用默认）"></textarea>
      <div class="style-actions">
        <button class="btn-save" @click="saveStyle" :disabled="savingStyle">{{ savingStyle ? '保存中……' : '保存风格' }}</button>
        <button class="btn-reset" @click="resetStyle">恢复默认</button>
        <span v-if="styleMsg" class="style-msg">{{ styleMsg }}</span>
      </div>
    </div>

    <div class="fb-form">
      <div class="form-row">
        <label>学生</label>
        <div class="student-picker">
          <select v-model="selectedStudent">
            <option value="">请选择学生（保存历史与阶段分析需先选择）</option>
            <option v-for="s in students" :key="s.id" :value="s.id">
              {{ s.name }}{{ s.class_name ? `（${s.class_name}）` : '' }} @{{ s.username }}
            </option>
          </select>
          <button type="button" class="add-student-btn" @click="openAddStudent">＋ 添加学生</button>
        </div>
      </div>

      <div class="form-row">
        <label>上课日期</label>
        <div class="date-picker">
          <button type="button" class="date-display" @click="showCalendar = !showCalendar">
            📅 {{ dateDisplay }}
            <span class="caret-icon">{{ showCalendar ? '▲' : '▼' }}</span>
          </button>
          <button type="button" class="today-btn" @click="gotoToday">回到今天</button>
        </div>
        <div v-if="showCalendar" class="calendar">
          <div class="cal-head">
            <button type="button" class="cal-nav" @click="prevMonth">‹</button>
            <span class="cal-title">{{ viewYear }}年{{ viewMonth }}月</span>
            <button type="button" class="cal-nav" @click="nextMonth">›</button>
          </div>
          <div class="cal-week">
            <span v-for="w in weekdays" :key="w" class="cal-weekday">{{ w }}</span>
          </div>
          <div class="cal-grid">
            <span
              v-for="(c, i) in calendarCells"
              :key="i"
              class="cal-cell"
              :class="{ blank: !c, today: c && isToday(c), selected: c && isSelected(c) }"
              @click="c && pickDay(c)"
            >{{ c || '' }}</span>
          </div>
        </div>
      </div>

      <div class="form-row">
        <label>上课主题</label>
        <input v-model="topic" placeholder="例如：String 类、字符串应用" />
      </div>
      <div class="form-row">
        <label>题号 <span class="optional-tag">（可选）</span></label>
        <input v-model="problemIds" placeholder="没有题号可留空；多个用逗号分隔，例如：1106,1111,1129" />
      </div>
      <div class="form-row">
        <label>课堂表现</label>
        <textarea
          v-model="performance"
          rows="6"
          placeholder="描述学生表现。例如：ASCII 掌握清晰；统计单词个数思路清晰框架正确遍历不越界；习惯直接求助"
        ></textarea>
      </div>
      <button class="gen-btn" @click="generate" :disabled="generating || !topic || !performance">
        {{ generating ? '生成中……' : '✨ 生成课后反馈' }}
      </button>
    </div>

    <p v-if="errorMsg" class="fb-error">{{ errorMsg }}</p>

    <div v-if="generating || result" class="fb-result">
      <div class="result-toolbar">
        <span class="result-status">{{ generating ? 'AI 正在生成……' : '已生成课评' }}</span>
        <div class="toolbar-btns">
          <button v-if="result && !generating" class="copy-btn" @click="copyResult">{{ copied ? '✓ 已复制' : '📋 复制' }}</button>
          <button
            v-if="result && !generating"
            class="save-btn"
            :disabled="!selectedStudent || savingRecord"
            @click="saveRecord"
            :title="selectedStudent ? '' : '请先在上方选择学生'"
          >
            {{ savingRecord ? '保存中……' : savedMsg || '💾 保存为历史记录' }}
          </button>
        </div>
      </div>
      <pre class="result-text">{{ result }}<span v-if="generating" class="caret"></span></pre>
    </div>

    <!-- 历史课评与阶段分析 -->
    <section v-if="selectedStudent" class="history-section">
      <header class="history-head">
        <h3>📚 {{ currentStudentName }} 的历史课评 <small>（{{ historyRecords.length }} 条）</small></h3>
        <button class="analyze-btn" :disabled="analyzing || !historyRecords.length" @click="analyzeStudent">
          {{ analyzing ? '分析中……' : '✨ AI 阶段表现分析' }}
        </button>
      </header>

      <p v-if="analysisError" class="fb-error">{{ analysisError }}</p>
      <div v-if="analyzing || analysis" class="analysis-box">
        <div class="analysis-title">{{ analyzing ? 'AI 正在分析阶段表现……' : '阶段表现分析' }}</div>
        <pre class="result-text">{{ analysis }}<span v-if="analyzing" class="caret"></span></pre>
      </div>

      <div v-if="historyLoading" class="history-empty">加载中……</div>
      <div v-else-if="!historyRecords.length" class="history-empty">该学生还没有保存的课评，生成后点「保存为历史记录」即可。</div>
      <div v-else class="history-list">
        <div v-for="r in historyRecords" :key="r.id" class="history-card">
          <div class="history-card-head" @click="toggleExpand(r.id)">
            <div class="history-meta">
              <span class="history-date">{{ r.date || formatCreated(r.created_at) }}</span>
              <span class="history-topic">{{ r.topic || '未填写主题' }}</span>
            </div>
            <div class="history-card-actions">
              <span class="expand-hint">{{ expanded[r.id] ? '收起 ▲' : '展开 ▼' }}</span>
              <button class="del-btn" @click.stop="deleteRecord(r.id)">删除</button>
            </div>
          </div>
          <pre v-if="expanded[r.id]" class="history-content">{{ r.content }}</pre>
          <div v-else class="history-preview">{{ preview(r.content) }}</div>
        </div>
      </div>
    </section>
    </div>

    <!-- 添加学生弹窗 -->
    <div v-if="showAddStudent" class="modal-mask" @click.self="showAddStudent = false">
      <div class="modal">
        <h3>添加学生</h3>
        <div class="field"><label>用户名</label><input v-model="addForm.username" placeholder="登录用户名" /></div>
        <div class="field"><label>密码</label><input v-model="addForm.password" placeholder="默认 123456" /></div>
        <div class="field"><label>姓名</label><input v-model="addForm.name" placeholder="学生真实姓名" /></div>
        <div class="field"><label>班级</label><input v-model="addForm.class_name" placeholder="如：六年级1班（可选）" /></div>
        <p v-if="addMsg" class="add-msg" :class="{ err: addIsErr }">{{ addMsg }}</p>
        <div class="modal-actions">
          <button @click="showAddStudent = false">取消</button>
          <button class="btn-primary" @click="addStudent" :disabled="!addForm.username || !addForm.name || addingStudent">
            {{ addingStudent ? '添加中……' : '确认添加' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { authFetch } from '../utils/auth';

const date = ref('');
const topic = ref('');
const problemIds = ref('');
const performance = ref('');
const result = ref('');
const generating = ref(false);
const errorMsg = ref('');
const copied = ref(false);

const showStyle = ref(false);
const styleText = ref('');
const defaultStyle = ref('');
const savingStyle = ref(false);
const styleMsg = ref('');

const students = ref([]);
const selectedStudent = ref('');
const savingRecord = ref(false);
const savedMsg = ref('');

const historyRecords = ref([]);
const historyLoading = ref(false);
const expanded = ref({});

const analysis = ref('');
const analyzing = ref(false);
const analysisError = ref('');

// 月视图日历
const showCalendar = ref(false);
const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
const initNow = new Date();
const viewYear = ref(initNow.getFullYear());
const viewMonth = ref(initNow.getMonth() + 1);
const selected = ref({ year: initNow.getFullYear(), month: initNow.getMonth() + 1, day: initNow.getDate() });
date.value = `${initNow.getMonth() + 1}月${initNow.getDate()}日`;

const dateDisplay = computed(() => {
  const t = new Date();
  const isToday =
    selected.value.year === t.getFullYear() &&
    selected.value.month === t.getMonth() + 1 &&
    selected.value.day === t.getDate();
  return date.value + (isToday ? '（今天）' : '');
});

const calendarCells = computed(() => {
  const firstWeekday = new Date(viewYear.value, viewMonth.value - 1, 1).getDay();
  const daysInMonth = new Date(viewYear.value, viewMonth.value, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
});

function prevMonth() {
  if (viewMonth.value === 1) {
    viewMonth.value = 12;
    viewYear.value--;
  } else {
    viewMonth.value--;
  }
}
function nextMonth() {
  if (viewMonth.value === 12) {
    viewMonth.value = 1;
    viewYear.value++;
  } else {
    viewMonth.value++;
  }
}
function isToday(day) {
  const t = new Date();
  return viewYear.value === t.getFullYear() && viewMonth.value === t.getMonth() + 1 && day === t.getDate();
}
function isSelected(day) {
  return (
    selected.value.year === viewYear.value &&
    selected.value.month === viewMonth.value &&
    selected.value.day === day
  );
}
function pickDay(day) {
  selected.value = { year: viewYear.value, month: viewMonth.value, day };
  date.value = `${viewMonth.value}月${day}日`;
  showCalendar.value = false;
}
function gotoToday() {
  const t = new Date();
  viewYear.value = t.getFullYear();
  viewMonth.value = t.getMonth() + 1;
  selected.value = { year: t.getFullYear(), month: t.getMonth() + 1, day: t.getDate() };
  date.value = `${t.getMonth() + 1}月${t.getDate()}日`;
}

const currentStudentName = computed(() => students.value.find((s) => s.id === selectedStudent.value)?.name || '该学生');

// 添加学生
const showAddStudent = ref(false);
const addForm = ref({ username: '', password: '', name: '', class_name: '' });
const addingStudent = ref(false);
const addMsg = ref('');
const addIsErr = ref(false);

function openAddStudent() {
  addForm.value = { username: '', password: '', name: '', class_name: '' };
  addMsg.value = '';
  addIsErr.value = false;
  showAddStudent.value = true;
}

async function addStudent() {
  if (!addForm.value.username || !addForm.value.name) return;
  addingStudent.value = true;
  addMsg.value = '';
  addIsErr.value = false;
  try {
    const resp = await authFetch('/api/auth/students', {
      method: 'POST',
      body: JSON.stringify({ ...addForm.value, password: addForm.value.password || '123456' }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || '添加失败');
    showAddStudent.value = false;
    await loadStudents();
    selectedStudent.value = data.id;
  } catch (e) {
    addIsErr.value = true;
    addMsg.value = e.message || '添加失败，请重试';
  }
  addingStudent.value = false;
}

function formatCreated(t) {
  return t ? t.replace('T', ' ').slice(0, 16) : '';
}
function preview(text) {
  const flat = (text || '').replace(/\s+/g, ' ').trim();
  return flat.length > 60 ? flat.slice(0, 60) + '……' : flat;
}
function toggleExpand(id) {
  expanded.value = { ...expanded.value, [id]: !expanded.value[id] };
}

async function loadStyle() {
  try {
    const resp = await authFetch('/api/feedback/style');
    const data = await resp.json();
    defaultStyle.value = data.defaultStyle || '';
    styleText.value = data.style || '';
  } catch (e) {
    /* 忽略 */
  }
}

async function loadStudents() {
  try {
    const resp = await authFetch('/api/auth/students');
    students.value = await resp.json();
  } catch (e) {
    students.value = [];
  }
}

async function saveStyle() {
  savingStyle.value = true;
  styleMsg.value = '';
  try {
    const resp = await authFetch('/api/feedback/style', { method: 'PUT', body: JSON.stringify({ style: styleText.value }) });
    if (!resp.ok) throw new Error();
    styleMsg.value = '已保存 ✓';
    setTimeout(() => (styleMsg.value = ''), 2500);
  } catch (e) {
    styleMsg.value = '保存失败，请重试';
  }
  savingStyle.value = false;
}

function resetStyle() {
  styleText.value = defaultStyle.value;
  styleMsg.value = '已填入默认规则，记得点「保存风格」';
}

async function generate() {
  if (!topic.value || !performance.value) return;
  generating.value = true;
  result.value = '';
  errorMsg.value = '';
  copied.value = false;
  savedMsg.value = '';
  try {
    const resp = await authFetch('/api/feedback/generate', {
      method: 'POST',
      body: JSON.stringify({
        date: date.value,
        topic: topic.value,
        problemIds: problemIds.value,
        performance: performance.value,
        style: styleText.value,
      }),
    });
    if (!resp.ok || !resp.body) throw new Error();
    await readStream(resp, (json) => {
      if (json.content) result.value += json.content;
      if (json.error) errorMsg.value = json.error;
    });
  } catch (e) {
    errorMsg.value = '生成失败，请确认后端已启动后重试';
  }
  generating.value = false;
}

async function saveRecord() {
  if (!selectedStudent.value || !result.value) return;
  savingRecord.value = true;
  savedMsg.value = '';
  try {
    const resp = await authFetch('/api/feedback/save', {
      method: 'POST',
      body: JSON.stringify({
        student_id: selectedStudent.value,
        date: date.value,
        topic: topic.value,
        problem_ids: problemIds.value,
        performance: performance.value,
        content: result.value,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || '保存失败');
    savedMsg.value = '✓ 已保存';
    setTimeout(() => (savedMsg.value = ''), 2500);
    loadHistory();
  } catch (e) {
    savedMsg.value = '保存失败';
    setTimeout(() => (savedMsg.value = ''), 2500);
  }
  savingRecord.value = false;
}

async function loadHistory() {
  if (!selectedStudent.value) {
    historyRecords.value = [];
    return;
  }
  historyLoading.value = true;
  analysis.value = '';
  analysisError.value = '';
  try {
    const resp = await authFetch(`/api/feedback/history?student_id=${selectedStudent.value}`);
    const data = await resp.json();
    historyRecords.value = data.records || [];
  } catch (e) {
    historyRecords.value = [];
  }
  historyLoading.value = false;
}

async function deleteRecord(id) {
  if (!confirm('确定删除这条课评记录吗？')) return;
  try {
    const resp = await authFetch(`/api/feedback/history/${id}`, { method: 'DELETE' });
    if (!resp.ok) throw new Error();
    loadHistory();
  } catch (e) {
    alert('删除失败，请重试');
  }
}

async function analyzeStudent() {
  if (!selectedStudent.value || analyzing.value) return;
  analyzing.value = true;
  analysis.value = '';
  analysisError.value = '';
  try {
    const resp = await authFetch('/api/feedback/analyze-student', {
      method: 'POST',
      body: JSON.stringify({ student_id: selectedStudent.value }),
    });
    if (!resp.ok || !resp.body) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.error || '分析失败');
    }
    await readStream(resp, (json) => {
      if (json.content) analysis.value += json.content;
      if (json.error) analysisError.value = json.error;
    });
  } catch (e) {
    analysisError.value = e.message || '分析失败，请重试';
  }
  analyzing.value = false;
}

// 通用 SSE 读取
async function readStream(resp, onJson) {
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') continue;
      try {
        onJson(JSON.parse(payload));
      } catch {
        /* 忽略 */
      }
    }
  }
}

async function copyResult() {
  try {
    await navigator.clipboard.writeText(result.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch (e) {
    /* 忽略 */
  }
}

watch(selectedStudent, loadHistory);
onMounted(() => {
  loadStyle();
  loadStudents();
});
</script>

<style scoped>
.feedback-page { height: 100%; overflow-y: auto; padding: 24px 28px; background: #f7f9fc; }
.fb-inner { max-width: 760px; margin: 0 auto; }
.fb-head { width: 100%; max-width: 760px; display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
.fb-head h2 { margin: 0; color: #4f46e5; font-size: 22px; }
.style-toggle { padding: 8px 14px; border: 1px solid #c7d2fe; border-radius: 6px; background: #fff; color: #4338ca; font-size: 13px; cursor: pointer; }
.style-toggle:hover { background: #eef2ff; }

.style-panel { width: 100%; max-width: 760px; margin-bottom: 20px; padding: 16px; background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid #f59e0b; border-radius: 10px; }
.style-hint { margin: 0 0 10px; color: #9a3412; font-size: 13px; }
.style-panel textarea { width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 13px; font-family: inherit; line-height: 1.6; resize: vertical; }
.style-actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.btn-save { padding: 8px 18px; border: none; border-radius: 6px; background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-reset { padding: 8px 14px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; color: #64748b; font-size: 13px; cursor: pointer; }
.btn-reset:hover { background: #f1f5f9; }
.style-msg { color: #16a34a; font-size: 13px; }

.fb-form { display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 760px; padding: 20px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; }
.form-row { display: flex; flex-direction: column; gap: 6px; }
.form-row label { font-size: 14px; font-weight: 600; color: #334155; }
.optional-tag { font-size: 12px; font-weight: 400; color: #94a3b8; }
.form-row input, .form-row select, .form-row textarea { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical; }
.form-row input:focus, .form-row select:focus, .form-row textarea:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1); }
.gen-btn { align-self: flex-start; padding: 11px 26px; border: none; border-radius: 8px; background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; }
.gen-btn:hover:not(:disabled) { opacity: 0.85; }
.gen-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 月视图日历 */
.date-picker { display: flex; align-items: center; gap: 10px; }
.date-display { flex: 1; display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; background: #fff; color: #1e293b; font-size: 14px; cursor: pointer; }
.date-display:hover { border-color: #4f46e5; }
.caret-icon { color: #94a3b8; font-size: 11px; }
.today-btn { width: 110px; padding: 10px 0; border: 1px solid #c7d2fe; border-radius: 8px; background: #eef2ff; color: #4338ca; font-size: 13px; font-weight: 600; text-align: center; cursor: pointer; white-space: nowrap; }
.today-btn:hover { background: #e0e7ff; }
.calendar { margin-top: 8px; padding: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08); max-width: 340px; }
.cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.cal-title { font-size: 15px; font-weight: 700; color: #334155; }
.cal-nav { width: 30px; height: 30px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff; color: #475569; font-size: 18px; line-height: 1; cursor: pointer; }
.cal-nav:hover { background: #f1f5f9; }
.cal-week { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px; }
.cal-weekday { text-align: center; font-size: 12px; color: #94a3b8; padding: 4px 0; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.cal-cell { display: grid; place-items: center; height: 38px; border-radius: 7px; font-size: 14px; color: #334155; cursor: pointer; transition: background 0.12s; }
.cal-cell:hover:not(.blank) { background: #eef2ff; }
.cal-cell.blank { cursor: default; }
.cal-cell.today { border: 1px solid #4f46e5; color: #4f46e5; font-weight: 700; }
.cal-cell.selected { background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; font-weight: 700; }
.cal-cell.selected.today { border-color: transparent; }

.student-picker { display: flex; align-items: center; gap: 10px; }
.student-picker select { flex: 1; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; font-family: inherit; }
.student-picker select:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1); }
.add-student-btn { width: 110px; padding: 10px 0; border: 1px solid #c7d2fe; border-radius: 8px; background: #eef2ff; color: #4338ca; font-size: 13px; font-weight: 600; text-align: center; cursor: pointer; white-space: nowrap; }
.add-student-btn:hover { background: #e0e7ff; }

.modal-mask { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); display: grid; place-items: center; z-index: 100; }
.modal { width: 380px; max-width: 92vw; background: #fff; border-radius: 12px; padding: 22px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25); }
.modal h3 { margin: 0 0 16px; color: #4f46e5; font-size: 18px; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.field label { font-size: 13px; font-weight: 600; color: #334155; }
.field input { padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; font-family: inherit; }
.field input:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1); }
.add-msg { margin: 0 0 12px; font-size: 13px; color: #16a34a; }
.add-msg.err { color: #dc2626; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
.modal-actions button { padding: 9px 16px; border: 1px solid #d1d5db; border-radius: 8px; background: #fff; color: #64748b; font-size: 14px; cursor: pointer; }
.modal-actions button:hover { background: #f1f5f9; }
.modal-actions .btn-primary { background: linear-gradient(135deg, #4f46e5, #6366f1); border: none; color: #fff; font-weight: 600; }
.modal-actions .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.fb-error { margin-top: 16px; padding: 12px 14px; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; font-size: 14px; width: 100%; max-width: 760px; }

.fb-result { margin-top: 20px; width: 100%; max-width: 760px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
.result-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; gap: 10px; }
.result-status { color: #4f46e5; font-size: 14px; font-weight: 600; }
.toolbar-btns { display: flex; gap: 8px; }
.copy-btn, .save-btn { padding: 7px 14px; border: 1px solid #c7d2fe; border-radius: 6px; background: #fff; color: #4338ca; font-size: 13px; cursor: pointer; }
.copy-btn:hover, .save-btn:hover:not(:disabled) { background: #eef2ff; }
.save-btn { border-color: #bbf7d0; color: #15803d; }
.save-btn:hover:not(:disabled) { background: #f0fdf4; }
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.result-text { margin: 0; padding: 20px; white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 15px; line-height: 1.9; color: #1e293b; }
.caret { display: inline-block; width: 8px; height: 16px; margin-left: 2px; background: #4f46e5; vertical-align: middle; animation: blink 1s steps(2) infinite; }
@keyframes blink { 50% { opacity: 0; } }

.history-section { margin-top: 28px; width: 100%; max-width: 760px; }
.history-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 10px; }
.history-head h3 { margin: 0; color: #334155; font-size: 17px; }
.history-head small { color: #94a3b8; font-weight: 400; }
.analyze-btn { padding: 9px 16px; border: none; border-radius: 8px; background: linear-gradient(135deg, #0f766e, #14b8a6); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
.analyze-btn:hover:not(:disabled) { opacity: 0.85; }
.analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.analysis-box { margin-bottom: 18px; background: #f0fdfa; border: 1px solid #99f6e4; border-left: 4px solid #14b8a6; border-radius: 10px; overflow: hidden; }
.analysis-title { padding: 12px 16px; color: #0f766e; font-size: 14px; font-weight: 600; border-bottom: 1px solid #ccfbf1; }

.history-empty { padding: 30px; text-align: center; color: #94a3b8; font-size: 14px; background: #fff; border: 1px dashed #e2e8f0; border-radius: 10px; }
.history-list { display: flex; flex-direction: column; gap: 12px; }
.history-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
.history-card-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; cursor: pointer; gap: 10px; }
.history-card-head:hover { background: #f8fafc; }
.history-meta { display: flex; align-items: center; gap: 12px; min-width: 0; }
.history-date { flex-shrink: 0; padding: 3px 10px; background: #eef2ff; color: #4338ca; border-radius: 12px; font-size: 12px; font-weight: 600; }
.history-topic { color: #334155; font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.history-card-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.expand-hint { color: #94a3b8; font-size: 12px; }
.del-btn { padding: 4px 10px; border: 1px solid #fecaca; border-radius: 5px; background: #fff; color: #dc2626; font-size: 12px; cursor: pointer; }
.del-btn:hover { background: #fef2f2; }
.history-preview { padding: 0 16px 14px; color: #64748b; font-size: 13px; line-height: 1.6; }
.history-content { margin: 0; padding: 16px; border-top: 1px solid #f1f5f9; background: #fafbfc; white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 14px; line-height: 1.8; color: #1e293b; }
</style>
