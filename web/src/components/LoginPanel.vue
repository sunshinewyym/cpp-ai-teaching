<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">🎓</div>
      <h2>C++ AI 教学助手</h2>

      <form @submit.prevent="handleLogin">
        <div class="field">
          <label>用户名</label>
          <input v-model="username" placeholder="请输入用户名" autocomplete="username" />
        </div>
        <div class="field">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="请输入密码" autocomplete="current-password" />
        </div>
        <p v-if="error" class="login-error">{{ error }}</p>
        <button type="submit" :disabled="loading">{{ loading ? '登录中……' : '登 录' }}</button>
      </form>
      <p class="login-hint">账号由老师统一分配</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { setAuth } from '../utils/auth';

const emit = defineEmits(['login-success']);
const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleLogin() {
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value }),
    });
    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch {
      throw new Error('无法连接到服务器，请确认后端已启动');
    }
    if (!resp.ok) throw new Error(data.error || '登录失败');
    setAuth(data.token, data.user);
    emit('login-success');
  } catch (e) {
    error.value = e.message || '登录失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-card {
  width: 380px;
  padding: 40px 36px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  text-align: center;
}
.login-logo { font-size: 48px; margin-bottom: 12px; }
.login-card h2 { margin: 0 0 6px; color: #1e293b; font-size: 22px; }
.login-card h2 { margin-bottom: 28px; }
.field { text-align: left; margin-bottom: 18px; }
.field label { display: block; margin-bottom: 6px; color: #374151; font-size: 14px; font-weight: 600; }
.field input {
  width: 100%; padding: 12px 14px; border: 1px solid #d1d5db; border-radius: 8px;
  font-size: 15px; transition: border-color 0.2s;
}
.field input:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
.login-error { color: #dc2626; font-size: 13px; margin: 0 0 12px; }
.login-card button {
  width: 100%; padding: 13px; border: none; border-radius: 8px;
  background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff;
  font-size: 16px; font-weight: 700; cursor: pointer; transition: opacity 0.2s;
}
.login-card button:hover:not(:disabled) { opacity: 0.9; }
.login-card button:disabled { opacity: 0.5; cursor: not-allowed; }
.login-hint { margin-top: 18px; color: #94a3b8; font-size: 12px; }
</style>
