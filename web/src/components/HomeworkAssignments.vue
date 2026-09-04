<template>
  <main class="homework-page">
    <header class="page-head">
      <div><p class="eyebrow">教师教学管理</p><h2>📝 作业管理</h2><p>从 CSP-J/S、GESP、NOIP 题库按知识点筛选题目，组合成一次课后作业。</p></div>
      <button class="ghost" @click="loadAll" :disabled="loading">{{ loading ? '刷新中…' : '刷新' }}</button>
    </header>
    <p v-if="error" class="error">{{ error }}</p>

    <section class="panel create-panel">
      <h3>新建作业</h3>
      <div class="form-grid">
        <label>作业名称<input v-model.trim="form.title" placeholder="例如：循环与字符串课后练习"></label>
        <label>截止时间<input v-model="form.deadline" type="datetime-local"></label>
        <label class="check-line"><input v-model="form.lockPractice" type="checkbox"> 未完成作业时锁定相同题目练习</label>
      </div>
      <div class="filter-bar">
        <label>级别<select v-model="filters.level" @change="handleLevelChange"><option value="all">全部级别</option><option value="CSP-J">CSP-J</option><option value="CSP-S">CSP-S</option><option value="NOIP">NOIP</option><option v-for="level in gespLevels" :key="level" :value="level">{{ level }}</option></select></label>
        <label>年份/考期<select v-model="filters.year" @change="loadCatalog"><option value="all">全部年份</option><option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option></select></label>
        <label>题型<select v-model="filters.type" @change="loadCatalog"><option value="all">全部题型</option><option value="choice">选择题</option><option value="judgment">判断题</option><option value="reading">阅读程序题</option><option value="completion">完善程序题</option></select></label>
        <label>知识点<select v-model="filters.tag" @change="loadCatalog"><option value="all">全部知识点</option><option v-for="tag in tags" :key="tag" :value="tag">{{ tag }}</option></select></label>
        <label class="keyword">关键词<input v-model.trim="filters.keyword" @keydown.enter="loadCatalog" placeholder="题目或知识点"></label>
        <button class="filter-button" @click="loadCatalog">筛选</button>
      </div>
      <div class="select-actions"><span>题目已选 {{ selectedQuestionIds.length }} 道</span><button @click="selectVisible">全选当前筛选</button><button @click="clearVisible">清空当前筛选</button></div>
      <div class="catalog-grid">
        <label v-for="item in catalog" :key="item.id" class="catalog-item" :class="{ selected: selectedQuestionIds.includes(item.id) }">
          <input v-model="selectedQuestionIds" type="checkbox" :value="item.id">
          <span class="catalog-main"><b>{{ item.label }}</b><small>{{ item.tags.join(' · ') || '综合程序分析' }}</small><em>{{ item.preview || '点击查看题目' }}</em></span>
        </label>
      </div>
      <p v-if="!catalog.length" class="empty">没有符合筛选条件的题目。</p>
      <h4>布置给学生</h4>
      <div class="select-actions"><span>学生已选 {{ selectedStudentIds.length }} 人</span><button @click="selectedStudentIds = students.map(item => item.id)">全选学生</button><button @click="selectedStudentIds = []">清空学生</button></div>
      <div class="student-grid"><label v-for="student in students" :key="student.id" :class="{ selected: selectedStudentIds.includes(student.id) }"><input v-model="selectedStudentIds" type="checkbox" :value="student.id"><span>{{ student.name }}</span><small>{{ student.class_name || '未分班' }}</small></label></div>
      <button class="primary" :disabled="saving || !form.title || !selectedQuestionIds.length || !selectedStudentIds.length" @click="createAssignment">{{ saving ? '保存中…' : '布置作业' }}</button>
    </section>

    <section class="panel">
      <h3>已布置作业</h3>
      <p v-if="!assignments.length" class="empty">还没有作业。</p>
      <div class="assignment-list">
        <button v-for="item in assignments" :key="item.id" class="assignment-card" :class="{ active: detail?.id === item.id }" @click="detail?.id === item.id ? detail = null : loadDetail(item.id)">
          <b>{{ item.title }}</b><span>{{ item.questionCount }} 题 · {{ item.completed_count || 0 }}/{{ item.student_count || 0 }} 人完成</span><small>{{ item.analysisReleased ? '解析已开放' : '等待教师开放解析' }}</small>
        </button>
      </div>
      <div v-if="detail" class="detail-panel">
        <div class="detail-head"><div><h3>{{ detail.title }}</h3><p>{{ detail.questionCount }} 道题 · {{ detail.students.length }} 名学生</p></div><div class="detail-buttons"><button @click="releaseDetail" :disabled="detail.analysisReleasedAt || saving">{{ detail.analysisReleasedAt ? '解析已开放' : '开放已提交题目的解析' }}</button><button class="danger" @click="deleteDetail" :disabled="saving">删除作业</button><button class="ghost" @click="detail = null">收起详情</button></div></div>
        <div class="student-summary"><span v-for="student in detail.students" :key="student.studentId"><b>{{ student.name }}</b>：{{ student.submitted }}/{{ student.total }} 题，{{ student.score }}/{{ student.maxScore }} 分</span></div>
        <h4>每题答题情况</h4>
        <article v-for="stat in detail.stats" :key="stat.questionId" class="question-stat"><div><b>{{ stat.label }}</b><span>{{ stat.submitted }}/{{ stat.total }} 人提交 · 平均正确率 {{ stat.averagePercent == null ? '—' : stat.averagePercent + '%' }}</span></div><details><summary>查看答题明细</summary><p v-for="answer in stat.details" :key="answer.studentId" :class="answer.submitted ? (answer.correct ? 'ok' : 'bad') : 'muted'"><b>{{ answer.name }}</b>：{{ answer.submitted ? `${answer.score}/${answer.maxScore} 分${answer.correct ? '，正确' : '，错误'}` : '未提交' }}</p></details></article>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { authFetch } from '../utils/auth';

const catalog = ref([]); const tags = ref([]); const students = ref([]); const assignments = ref([]); const detail = ref(null); const loading = ref(false); const saving = ref(false); const error = ref('');
const selectedQuestionIds = ref([]); const selectedStudentIds = ref([]);
const form = ref({ title: '', deadline: '', lockPractice: true });
const filters = ref({ level: 'all', year: 'all', type: 'all', tag: 'all', keyword: '' });
const gespLevels = ['GESP-2', 'GESP-3', 'GESP-4', 'GESP-5', 'GESP-6', 'GESP-7', 'GESP-8'];
const years = ref([]);
const yearsByLevel = ref({});
let catalogRequest = 0;
let metadataPromise = null;
let metadataReady = false;
function deriveTags(items) { return [...new Set((Array.isArray(items) ? items : []).flatMap(item => Array.isArray(item?.tags) ? item.tags : []).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN')); }
function deriveYears(items) { return [...new Set((Array.isArray(items) ? items : []).flatMap(item => [String(item?.year || ''), item?.session].filter(Boolean)))].sort((a, b) => b.localeCompare(a, 'zh-CN')); }
function deriveYearsByLevel(items) { const grouped = {}; for (const item of (Array.isArray(items) ? items : [])) { const level = String(item?.level || ''); if (!level) continue; grouped[level] = [...new Set([...(grouped[level] || []), String(item?.year || ''), item?.session].filter(Boolean))].sort((a, b) => b.localeCompare(a, 'zh-CN')); } return grouped; }
function applyFilterMetadata(data, includeLevelYears = false) {
  const responseTags = Array.isArray(data?.tags) ? data.tags.filter(Boolean) : [];
  const responseYears = Array.isArray(data?.years) ? data.years.filter(Boolean) : [];
  const itemTags = deriveTags(data?.items);
  const itemYears = deriveYears(data?.items);
  if (includeLevelYears) { const grouped = deriveYearsByLevel(data?.items); if (Object.keys(grouped).length) yearsByLevel.value = grouped; }
  if (responseTags.length) tags.value = responseTags;
  else if (!tags.value.length && itemTags.length) tags.value = itemTags;
  if (responseYears.length) years.value = responseYears;
  else if (!years.value.length && itemYears.length) years.value = itemYears;
}
const yearOptions = computed(() => filters.value.level === 'all' ? years.value : (yearsByLevel.value[filters.value.level] || years.value));
function handleLevelChange() { if (filters.value.year !== 'all' && !yearOptions.value.includes(filters.value.year)) filters.value.year = 'all'; if (filters.value.level === 'NOIP' && ['choice', 'judgment'].includes(filters.value.type)) filters.value.type = 'all'; loadCatalog(); }
function readJson(response) { return response.text().then(text => { let data = {}; try { data = text ? JSON.parse(text) : {}; } catch { throw new Error(text.startsWith('<') ? '服务器返回了网页，请检查后端是否已更新' : '服务器返回的数据格式不正确'); } if (!response.ok) throw new Error(data.error || '请求失败'); return data; }); }
async function loadFilterMetadata() {
  if (metadataReady) return;
  if (!metadataPromise) {
    metadataPromise = (async () => {
      try {
        const data = await readJson(await authFetch('/api/homework/catalog?level=all&year=all&type=all&tag=all&keyword='));
        applyFilterMetadata(data, true);
        metadataReady = tags.value.length > 0 || years.value.length > 0;
      } catch { /* 目录请求会显示具体错误，筛选元数据下次刷新重试 */ }
      finally { metadataPromise = null; }
    })();
  }
  await metadataPromise;
}
async function loadCatalog() { const requestId = ++catalogRequest; error.value = ''; try { const params = new URLSearchParams(filters.value); const data = await readJson(await authFetch(`/api/homework/catalog?${params}`)); if (requestId !== catalogRequest) return; catalog.value = data.items || []; applyFilterMetadata(data); } catch (e) { if (requestId === catalogRequest) error.value = e.message; } }
async function loadStudents() { const data = await readJson(await authFetch('/api/auth/students')); students.value = Array.isArray(data) ? data : (data.students || []); }
async function loadAssignments() { assignments.value = await readJson(await authFetch('/api/homework/assignments')); }
async function loadAll() { loading.value = true; error.value = ''; try { await Promise.all([loadCatalog(), loadFilterMetadata(), loadStudents(), loadAssignments()]); } catch (e) { error.value = e.message; } finally { loading.value = false; } }
function selectVisible() { selectedQuestionIds.value = [...new Set([...selectedQuestionIds.value, ...catalog.value.map(item => item.id)])]; }
function clearVisible() { const visible = new Set(catalog.value.map(item => item.id)); selectedQuestionIds.value = selectedQuestionIds.value.filter(id => !visible.has(id)); }
async function createAssignment() { saving.value = true; error.value = ''; try { await readJson(await authFetch('/api/homework/assignments', { method: 'POST', body: JSON.stringify({ title: form.value.title, deadline: form.value.deadline, lockPractice: form.value.lockPractice, questionIds: selectedQuestionIds.value, studentIds: selectedStudentIds.value }) })); form.value.title = ''; form.value.deadline = ''; selectedQuestionIds.value = []; await loadAssignments(); window.dispatchEvent(new Event('homework-updated')); } catch (e) { error.value = e.message; } finally { saving.value = false; } }
async function loadDetail(id) { saving.value = true; error.value = ''; try { detail.value = await readJson(await authFetch(`/api/homework/assignments/${id}`)); } catch (e) { error.value = e.message; } finally { saving.value = false; } }
async function releaseDetail() { if (!detail.value) return; saving.value = true; try { await readJson(await authFetch(`/api/homework/assignments/${detail.value.id}/release`, { method: 'POST', body: '{}' })); await loadDetail(detail.value.id); await loadAssignments(); window.dispatchEvent(new Event('homework-updated')); } catch (e) { error.value = e.message; } finally { saving.value = false; } }
async function deleteDetail() { if (!detail.value || !window.confirm('确定删除这份作业吗？已提交的作业不能删除。')) return; saving.value = true; try { await readJson(await authFetch(`/api/homework/assignments/${detail.value.id}`, { method: 'DELETE' })); detail.value = null; await loadAssignments(); } catch (e) { error.value = e.message; } finally { saving.value = false; } }
onMounted(loadAll);
</script>

<style scoped>
.homework-page{height:100%;overflow:auto;padding:24px 28px 56px;background:#f7f9fc;color:#172033}.page-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.eyebrow{margin:0;color:#6366f1;font-size:13px;font-weight:800}.homework-page h2{margin:3px 0;color:#3730a3}.homework-page p{color:#64748b}.panel{margin-top:18px;padding:20px;border:1px solid #dbe3f0;border-radius:14px;background:#fff}.form-grid,.filter-bar{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}.form-grid label,.filter-bar label{display:flex;flex-direction:column;gap:5px;font-weight:700;color:#475569;font-size:13px}.form-grid input,.filter-bar input,.filter-bar select{min-height:38px;padding:7px 10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#172033;font:inherit}.form-grid label:first-child{flex:1 1 280px}.keyword{flex:1 1 210px}.check-line{flex-direction:row!important;align-items:center;margin:10px 0}.filter-bar{margin-top:18px;padding:12px;border-radius:10px;background:#f8fafc}.filter-button,.select-actions button,.ghost,.detail-buttons button{padding:8px 12px;border:1px solid #c7d2fe;border-radius:8px;background:#eef2ff;color:#3730a3;font:inherit;cursor:pointer}.select-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:14px 0;color:#64748b}.select-actions span{font-weight:800;margin-right:auto}.catalog-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:8px;max-height:460px;overflow:auto;padding-right:3px}.catalog-item,.student-grid label{display:flex;gap:9px;align-items:flex-start;padding:10px;border:1px solid #dbe3f0;border-radius:9px;background:#fff;cursor:pointer}.catalog-item.selected,.student-grid label.selected{border-color:#818cf8;background:#eef2ff}.catalog-main{display:flex;flex-direction:column;gap:3px;min-width:0}.catalog-main b{color:#3730a3}.catalog-main small{color:#b45309}.catalog-main em{color:#64748b;font-style:normal;font-size:12px;line-height:1.4;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.student-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;max-height:210px;overflow:auto;margin-bottom:14px}.student-grid label{align-items:center}.student-grid small{margin-left:auto;color:#94a3b8}.primary{padding:10px 18px;border:0;border-radius:8px;background:#4f46e5;color:#fff;font-weight:800;cursor:pointer}.primary:disabled,.detail-buttons button:disabled,.ghost:disabled{opacity:.5;cursor:not-allowed}.assignment-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}.assignment-card{display:flex;flex-direction:column;align-items:flex-start;gap:5px;padding:14px;border:1px solid #c7d2fe;border-radius:10px;background:#f8faff;color:#3730a3;text-align:left;cursor:pointer}.assignment-card.active{background:#eef2ff;border-color:#6366f1}.assignment-card span,.assignment-card small{color:#64748b}.detail-panel{margin-top:18px;padding-top:16px;border-top:1px solid #e2e8f0}.detail-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}.detail-buttons{display:flex;flex-wrap:wrap;gap:7px;justify-content:flex-end}.detail-buttons .danger{border-color:#fecaca;background:#fff7f7;color:#b91c1c}.student-summary{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.student-summary span{padding:7px 10px;border-radius:8px;background:#f1f5f9;color:#475569}.question-stat{padding:12px 0;border-top:1px solid #eef2f7}.question-stat>div:first-child{display:flex;justify-content:space-between;gap:8px}.question-stat span{color:#64748b;font-size:13px}.question-stat summary{margin-top:7px;color:#4338ca;cursor:pointer}.question-stat p{margin:5px 0}.ok{color:#15803d}.bad{color:#b91c1c}.muted{color:#94a3b8}.empty{padding:22px;border-radius:10px;background:#f8fafc}.error{color:#b91c1c}@media(max-width:800px){.homework-page{padding:18px 14px}.page-head,.detail-head{flex-direction:column}.detail-buttons{justify-content:flex-start}.question-stat>div:first-child{flex-direction:column}}
</style>
