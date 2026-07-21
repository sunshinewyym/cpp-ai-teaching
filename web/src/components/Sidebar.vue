<template>
  <div class="sidebar">
    <div class="sidebar-logo">
      <span class="logo-icon">🎓</span>
      <span class="logo-text">AI 助教</span>
    </div>

    <nav class="sidebar-nav">
      <button
        v-for="tool in tools"
        :key="tool.id"
        :class="['nav-item', { active: activeTool === tool.id }]"
        @click="$emit('select-tool', tool.id)"
      >
        <span class="nav-icon">{{ tool.icon }}</span>
        <span class="nav-label">{{ tool.label }}</span>
      </button>
    </nav>

    <div class="sidebar-footer" v-if="isLoggedIn">
      <div class="user-info">
        <div class="user-name-wrap">
          <span class="user-name">{{ currentUser?.name }}</span>
          <span class="user-username">@{{ currentUser?.username }}</span>
        </div>
        <span class="user-role">{{ isTeacher ? '老师' : '学生' }}</span>
      </div>
      <button class="logout-btn" @click="$emit('logout')">退出登录</button>
    </div>
    <div class="sidebar-footer" v-else>
      <div class="version">v1.0.0</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { isTeacher, isLoggedIn, isAdmin, currentUser } from '../utils/auth';

const props = defineProps({
  activeTool: String,
});

defineEmits(['select-tool', 'logout']);

const baseTools = [
  { id: 'chat', icon: '💬', label: 'AI 对话' },
  { id: 'syntax-visualizer', icon: '🧩', label: '语法可视化' },
  { id: 'opener', icon: '⚡', label: '算法速懂卡' },
  { id: 'visualizer', icon: '🎞️', label: '算法可视化' },
  { id: 'csp-practice', icon: '🏆', label: 'CSP-J/S 练习' },
  { id: 'debug', icon: '🔍', label: '代码调试' },
  { id: 'edge-case', icon: '🧨', label: '边界盲盒' },
  { id: 'teaching', icon: '🧑‍🏫', label: '教学工具' },
];

const tools = computed(() => {
  const list = [];
  for (const t of baseTools) {
    list.push(t);
    // 老师账号下，把「课后反馈」排在「教学工具」正下方（与其他菜单项对齐）
    if (t.id === 'teaching' && isLoggedIn.value && isTeacher.value) {
      list.push({ id: 'class-feedback', icon: '📝', label: '课后反馈' });
    }
  }
  if (isLoggedIn.value) {
    if (isTeacher.value) {
      list.push({ id: 'teacher-dashboard', icon: '📋', label: '学生记录' });
      list.push({ id: 'student-manage', icon: '👥', label: '学生管理' });
      if (isAdmin.value) {
        list.push({ id: 'teacher-manage', icon: '🧑‍🏫', label: '教师管理' });
      }
    } else {
      list.push({ id: 'my-records', icon: '📊', label: '我的记录' });
      list.push({ id: 'wrong-questions', icon: '📕', label: '错题集' });
    }
  }
  return list;
});
</script>

<style scoped>
.sidebar {
  width: 200px;
  background: #fff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-logo {
  padding: 20px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #e2e8f0;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: #4f46e5;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: #64748b;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.nav-item:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.nav-item.active {
  background: #eef2ff;
  color: #4f46e5;
}

.nav-icon {
  font-size: 18px;
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid #e2e8f0;
}

.version {
  font-size: 11px;
  color: #94a3b8;
  text-align: center;
}

.user-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.user-name-wrap {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.user-username {
  font-size: 11px;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.user-role {
  font-size: 11px;
  padding: 2px 8px;
  background: #eef2ff;
  color: #4f46e5;
  border-radius: 10px;
}

.logout-btn {
  width: 100%;
  padding: 7px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
}

.logout-btn:hover {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fca5a5;
}
</style>
