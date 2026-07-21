<template>
  <div class="manage-page">
    <header class="manage-head">
      <h2>👥 学生账号管理</h2>
      <button class="btn-primary" @click="showAdd = true">+ 添加学生</button>
    </header>

    <div v-if="message" class="msg" :class="msgType">{{ message }}</div>

    <table class="students-table">
      <thead><tr><th>用户名</th><th>姓名</th><th>班级</th><th>创建时间</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="s in students" :key="s.id">
          <td>{{ s.username }}</td>
          <td><b>{{ s.name }}</b></td>
          <td>{{ s.class_name || '-' }}</td>
          <td>{{ formatTime(s.created_at) }}</td>
          <td class="actions">
            <button @click="resetPwd(s)">重置密码</button>
            <button @click="openTransfer(s)">移交</button>
            <button class="danger" @click="removeStudent(s)">删除</button>
          </td>
        </tr>
        <tr v-if="!students.length"><td colspan="5" class="empty-cell">暂无学生，点击上方按钮添加</td></tr>
      </tbody>
    </table>

    <!-- 添加学生弹窗 -->
    <div v-if="showAdd" class="modal-mask" @click.self="showAdd = false">
      <div class="modal">
        <h3>添加学生</h3>
        <div class="field"><label>用户名</label><input v-model="form.username" placeholder="登录用户名" /></div>
        <div class="field"><label>密码</label><input v-model="form.password" placeholder="默认 123456" /></div>
        <div class="field"><label>姓名</label><input v-model="form.name" placeholder="学生真实姓名" /></div>
        <div class="field"><label>班级</label><input v-model="form.class_name" placeholder="如：六年级1班" /></div>
        <div class="modal-actions">
          <button @click="showAdd = false">取消</button>
          <button class="btn-primary" @click="addStudent" :disabled="!form.username || !form.name">确认添加</button>
        </div>
        <hr />
        <h4>批量添加</h4>
        <p class="hint">每行一个学生，格式：用户名,姓名,班级（密码默认123456）</p>
        <textarea v-model="batchText" rows="5" placeholder="zhangsan,张三,六年级1班&#10;lisi,李四,六年级1班"></textarea>
        <button class="btn-primary" style="margin-top:10px" @click="batchAdd" :disabled="!batchText.trim()">批量导入</button>
      </div>
    </div>
    <!-- 移交学生弹窗 -->
    <div v-if="transferTarget" class="modal-mask" @click.self="transferTarget = null">
      <div class="modal">
        <h3>移交学生</h3>
        <p class="hint">将学生 <b>{{ transferTarget.name }}</b> 移交给其他老师管理。</p>
        <div class="field"><label>接收老师用户名</label><input v-model="transferUsername" placeholder="输入姓名模糊搜索，或直接输入用户名" @input="searchTeachers" /></div>
        <div v-if="searchResults.length" class="search-results">
          <div v-for="t in searchResults" :key="t.id" class="search-item" @click="pickTeacher(t)">
            <b>{{ t.name }}</b><span>@{{ t.username }}</span>
          </div>
        </div>
        <p v-else-if="transferUsername.trim() && searched" class="hint no-result">未找到匹配的老师</p>
        <div class="modal-actions">
          <button @click="transferTarget = null">取消</button>
          <button class="btn-primary" @click="doTransfer" :disabled="!transferUsername.trim()">确认移交</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { authFetch } from '../utils/auth';

const students = ref([]);
const showAdd = ref(false);
const message = ref('');
const msgType = ref('ok');
const batchText = ref('');
const transferTarget = ref(null);
const transferUsername = ref('');
const searchResults = ref([]);
const searched = ref(false);
const form = ref({ username: '', password: '', name: '', class_name: '' });

function formatTime(t) { return t ? t.replace('T', ' ').slice(0, 16) : ''; }
function showMsg(text, type = 'ok') { message.value = text; msgType.value = type; setTimeout(() => message.value = '', 4000); }

async function loadStudents() {
  try {
    const resp = await authFetch('/api/auth/students');
    students.value = await resp.json();
  } catch (e) { students.value = []; }
}

async function addStudent() {
  try {
    const resp = await authFetch('/api/auth/students', {
      method: 'POST',
      body: JSON.stringify({ ...form.value, password: form.value.password || '123456' }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error);
    showMsg(`学生 ${form.value.name} 添加成功`);
    form.value = { username: '', password: '', name: '', class_name: '' };
    showAdd.value = false;
    loadStudents();
  } catch (e) { showMsg(e.message, 'err'); }
}

async function batchAdd() {
  const lines = batchText.value.trim().split('\n').filter(Boolean);
  const list = lines.map(line => {
    const [username, name, class_name] = line.split(/[,，]/).map(s => s.trim());
    return { username, name, class_name: class_name || '' };
  });
  try {
    const resp = await authFetch('/api/auth/students/batch', {
      method: 'POST',
      body: JSON.stringify({ students: list }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error);
    showMsg(`成功导入 ${data.created} 名学生${data.errors.length ? '，' + data.errors.length + ' 个失败' : ''}`);
    batchText.value = '';
    loadStudents();
  } catch (e) { showMsg(e.message, 'err'); }
}

async function resetPwd(s) {
  if (!confirm(`确定重置 ${s.name} 的密码为 123456？`)) return;
  try {
    await authFetch(`/api/auth/students/${s.id}/reset-password`, { method: 'POST', body: JSON.stringify({}) });
    showMsg(`${s.name} 密码已重置为 123456`);
  } catch (e) { showMsg(e.message, 'err'); }
}

async function removeStudent(s) {
  if (!confirm(`确定删除学生 ${s.name}？其练习记录也会被删除。`)) return;
  try {
    await authFetch(`/api/auth/students/${s.id}`, { method: 'DELETE' });
    showMsg(`已删除 ${s.name}`);
    loadStudents();
  } catch (e) { showMsg(e.message, 'err'); }
}

function openTransfer(s) {
  transferTarget.value = s;
  transferUsername.value = '';
  searchResults.value = [];
  searched.value = false;
}

async function searchTeachers() {
  const q = transferUsername.value.trim();
  if (!q) { searchResults.value = []; searched.value = false; return; }
  try {
    const resp = await authFetch(`/api/auth/teachers/search?q=${encodeURIComponent(q)}`);
    searchResults.value = await resp.json();
    searched.value = true;
  } catch (e) { searchResults.value = []; }
}

function pickTeacher(t) {
  transferUsername.value = t.username;
  searchResults.value = [];
}

async function doTransfer() {
  if (!transferTarget.value || !transferUsername.value.trim()) return;
  try {
    const resp = await authFetch(`/api/auth/students/${transferTarget.value.id}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ targetUsername: transferUsername.value.trim() }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error);
    showMsg(data.message);
    transferTarget.value = null;
    transferUsername.value = '';
    loadStudents();
  } catch (e) { showMsg(e.message, 'err'); }
}

onMounted(loadStudents);
</script>

<style scoped>
.manage-page { height: 100%; overflow-y: auto; padding: 24px 28px; background: #f7f9fc; }
.manage-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.manage-head h2 { margin: 0; color: #4f46e5; font-size: 22px; }
.btn-primary { padding: 10px 18px; border: none; border-radius: 8px; background: #4f46e5; color: #fff; font-weight: 700; cursor: pointer; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.msg { padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
.msg.ok { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
.msg.err { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
.students-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; }
.students-table th { padding: 12px 14px; background: #f8fafc; color: #475569; font-size: 13px; text-align: left; border-bottom: 1px solid #e2e8f0; }
.students-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
.empty-cell { text-align: center; color: #94a3b8; padding: 40px !important; }
.actions { display: flex; gap: 8px; }
.actions button { padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; font-size: 13px; cursor: pointer; }
.actions button:hover { background: #f1f5f9; }
.actions button.danger { color: #dc2626; border-color: #fca5a5; }
.actions button.danger:hover { background: #fee2e2; }
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { width: 420px; max-height: 80vh; overflow-y: auto; padding: 28px; background: #fff; border-radius: 14px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
.modal h3 { margin: 0 0 18px; color: #1e293b; }
.modal h4 { margin: 16px 0 8px; color: #374151; }
.modal hr { border: none; border-top: 1px solid #e2e8f0; margin: 18px 0; }
.field { margin-bottom: 14px; }
.field label { display: block; margin-bottom: 5px; font-size: 13px; font-weight: 600; color: #374151; }
.field input { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
.field input:focus { outline: none; border-color: #4f46e5; }
.modal textarea { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; font-family: monospace; resize: vertical; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
.modal-actions button { padding: 10px 18px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; font-size: 14px; }
.modal-actions .btn-primary { background: #4f46e5; color: #fff; border: none; font-weight: 700; }
.modal-actions .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.search-results { margin: -6px 0 12px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; max-height: 180px; overflow-y: auto; }
.search-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #fff; cursor: pointer; border-bottom: 1px solid #f1f5f9; }
.search-item:last-child { border-bottom: none; }
.search-item:hover { background: #eef2ff; }
.search-item b { color: #1e293b; font-size: 14px; }
.search-item span { color: #64748b; font-size: 12px; }
.no-result { color: #94a3b8; }
.hint { font-size: 12px; color: #64748b; margin: 0 0 8px; }
</style>
