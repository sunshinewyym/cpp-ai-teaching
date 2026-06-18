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

    <div class="sidebar-footer">
      <div class="version">v1.0.0</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  activeTool: String,
});

defineEmits(['select-tool']);

const tools = [
  { id: 'chat', icon: '💬', label: 'AI 对话' },
  { id: 'agent', icon: '🤖', label: 'AI Agent' },
  { id: 'opener', icon: '💡', label: '算法脑洞' },
  { id: 'edge-case', icon: '🧨', label: '边界盲盒' },
  { id: 'teaching', icon: '🧑‍🏫', label: '教学工具' },
  { id: 'debug', icon: '🔍', label: '代码调试' },
];
</script>

<style scoped>
.sidebar {
  width: 200px;
  background: #12122a;
  border-right: 1px solid #2a2a4a;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-logo {
  padding: 20px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #2a2a4a;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: #00d4ff;
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
  color: #999;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.nav-item:hover {
  background: #1e1e3a;
  color: #e0e0e0;
}

.nav-item.active {
  background: #1a2a4a;
  color: #00d4ff;
}

.nav-icon {
  font-size: 18px;
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid #2a2a4a;
}

.version {
  font-size: 11px;
  color: #555;
  text-align: center;
}
</style>
