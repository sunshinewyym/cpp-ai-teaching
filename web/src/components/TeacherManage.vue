<template>
  <div class="manage-page">
    <header class="manage-head">
      <h2>🧑‍🏫 教师账号管理</h2>
      <button class="btn-primary" @click="showAdd = true">+ 添加老师</button>
    </header>

    <div v-if="message" class="msg" :class="msgType">{{ message }}</div>

    <table class="students-table">
      <thead><tr><th>用户名</th><th>姓名</th><th>创建时间</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="t in teachers" :key="t.id">
          <td>{{ t.username }}</td>
          <td><b>{{ t.name }}</b><span v-if="t.username === 'admin'" class="admin-tag">管理员</span></td>
          <td>{{ formatTime(t.created_at) }}</td>
          <td class="actions" v-if="t.username !== 'admin'">
            <button @click="resetPwd(t)">重置密码</button>
            <button class="danger" @click="removeTeacher(t)">删除</button>
          </td>
          <td v-else class="actions"><span class="muted">-</span></td>
        </tr>
        <tr v-if="!teachers.length"><td colspan="4" class="empty-cell">暂无老师账号</td></tr>
      </tbody>
    </table>

    <div v-if="showAdd" class="modal-mask" @click.self="showAdd = false">
      <div class="modal">
        <h3>添加老师</h3>
        <div class="field"><label>用户名</label><input v-model="form.username" placeholder="登录用户名" /></div>
        <div class="field"><label>密码</label><input v-model="form.password" placeholder="登录密码" /></div>
        <div class="field"><label>姓名</label><input v-model="form.name" placeholder="老师姓名" /></div>
        <div class="modal-actions">
          <button @click="showAdd = false">取消</button>
          <button class="btn-primary" @click="addTeacher" :disabled="!form.username || !form.password || !form.name">确认添加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { authFetch } from '../utils/auth';

const teachers = ref([]);
const showAdd = ref(false);
const message = ref('');
const msgType = ref('ok');
const form = ref({ username: '', password: '', name: '' });

function formatTime(t) { return t ? t.replace('T', ' ').slice(0, 16) : ''; }
function showMsg(text, type = 'ok') { message.value = text; msgType.value = type; setTimeout(() => message.value = '', 4000); }

async function loadTeachers() {
  try {
    const resp = await authFetch('/api/auth/teachers');
    teachers.value = await resp.json();
  } catch (e) { teachers.value = []; }
}

async function addTeacher() {
  try {
    const resp = await authFetch('/api/auth/teachers', {
      method: 'POST',
      body: JSON.stringify(form.value),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error);
    showMsg(`老师 ${form.value.name} 添加成功`);
    form.value = { username: '', password: '', name: '' };
    showAdd.value = false;
    loadTeachers();
  } catch (e) { showMsg(e.message, 'err'); }
}

async function resetPwd(t) {
  if (!confirm(`确定重置 ${t.name} 的密码为 123456？`)) return;
  try {
    await authFetch(`/api/auth/teachers/${t.id}/reset-password`, { method: 'POST', body: JSON.stringify({}) });
    showMsg(`${t.name} 密码已重置为 123456`);
  } catch (e) { showMsg(e.message, 'err'); }
}

async function removeTeacher(t) {
  if (!confirm(`确定删除老师 ${t.name}？其名下的学生和练习记录也会被删除。`)) return;
  try {
    await authFetch(`/api/auth/teachers/${t.id}`, { method: 'DELETE' });
    showMsg(`已删除 ${t.name}`);
    loadTeachers();
  } catch (e) { showMsg(e.message, 'err'); }
}

onMounted(loadTeachers);
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
.admin-tag { margin-left: 8px; padding: 2px 8px; background: #fef3c7; color: #92400e; border-radius: 10px; font-size: 11px; }
.muted { color: #94a3b8; }
.actions { display: flex; gap: 8px; }
.actions button { padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; font-size: 13px; cursor: pointer; }
.actions button:hover { background: #f1f5f9; }
.actions button.danger { color: #dc2626; border-color: #fca5a5; }
.actions button.danger:hover { background: #fee2e2; }
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { width: 400px; padding: 28px; background: #fff; border-radius: 14px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
.modal h3 { margin: 0 0 18px; color: #1e293b; }
.field { margin-bottom: 14px; }
.field label { display: block; margin-bottom: 5px; font-size: 13px; font-weight: 600; color: #374151; }
.field input { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
.field input:focus { outline: none; border-color: #4f46e5; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
.modal-actions button { padding: 10px 18px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; font-size: 14px; }
.modal-actions .btn-primary { background: #4f46e5; color: #fff; border: none; font-weight: 700; }
.modal-actions .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
