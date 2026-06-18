<template>
  <div class="prompt-buttons">
    <button
      v-for="btn in buttons"
      :key="btn.action"
      class="prompt-btn"
      @click="$emit('action', btn.action)"
      :disabled="loading"
    >
      <span class="btn-icon">{{ btn.icon }}</span>
      <span class="btn-text">{{ btn.label }}</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  loading: Boolean,
});

defineEmits(['action']);

const buttons = [
  { action: 'generate-example', icon: '📝', label: '生成例题' },
  { action: 'generate-exercise', icon: '✏️', label: '生成练习题' },
  { action: 'generate-script', icon: '📋', label: '生成讲稿' },
];
</script>

<style scoped>
.prompt-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.prompt-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 10px;
  color: #e0e0e0;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.prompt-btn:hover:not(:disabled) {
  border-color: #00d4ff;
  background: #1a2a4a;
}

.prompt-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 18px;
}
</style>
