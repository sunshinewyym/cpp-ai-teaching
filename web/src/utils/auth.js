import { ref, computed } from 'vue';

const token = ref(localStorage.getItem('csp_token') || '');
const user = ref(JSON.parse(localStorage.getItem('csp_user') || 'null'));

export const isLoggedIn = computed(() => Boolean(token.value));
export const currentUser = computed(() => user.value);
export const isTeacher = computed(() => user.value?.role === 'teacher');
export const isAdmin = computed(() => user.value?.is_admin === true);

export function setAuth(tokenValue, userValue) {
  token.value = tokenValue;
  user.value = userValue;
  localStorage.setItem('csp_token', tokenValue);
  localStorage.setItem('csp_user', JSON.stringify(userValue));
}

export function clearAuth() {
  token.value = '';
  user.value = null;
  localStorage.removeItem('csp_token');
  localStorage.removeItem('csp_user');
}

export function authHeaders() {
  return token.value ? { Authorization: `Bearer ${token.value}` } : {};
}

export async function authFetch(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) };
  const resp = await fetch(url, { ...options, headers });
  if (resp.status === 401) {
    clearAuth();
    throw new Error('登录已过期');
  }
  return resp;
}
