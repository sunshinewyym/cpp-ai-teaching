<template>
  <div class="chat-panel">
    <div class="messages" ref="messagesRef">
      <div
        v-for="(msg, i) in messages"
        :key="i"
        :class="['message', msg.role]"
      >
        <div class="message-avatar">
          {{ msg.role === 'user' ? '👤' : '🤖' }}
        </div>
        <div class="message-content" v-html="renderMarkdown(msg.content)"></div>
      </div>
      <div v-if="streaming" class="message assistant">
        <div class="message-avatar">🤖</div>
        <div class="message-content" v-html="renderMarkdown(streamBuffer)"></div>
      </div>
    </div>

    <div class="chat-input-area">
      <div class="topic-bar">
        <input
          v-model="localTopic"
          placeholder="课程主题（可选，如：并查集、BFS）"
          class="topic-input"
        />
      </div>
      <div class="input-row">
        <textarea
          v-model="input"
          @keydown.enter.exact.prevent="send"
          placeholder="输入问题... (Enter发送，Shift+Enter换行)"
          rows="2"
        ></textarea>
        <button @click="send" :disabled="!input.trim() || streaming">
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { streamPost } from '../utils/api';

const props = defineProps({
  courseTopic: String,
});

const messages = ref([]);
const input = ref('');
const streaming = ref(false);
const streamBuffer = ref('');
const messagesRef = ref(null);
const localTopic = ref(props.courseTopic || '');

watch(() => props.courseTopic, (v) => {
  if (v) localTopic.value = v;
});

function renderMarkdown(text) {
  if (!text) return '';
  return marked.parse(text);
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
    }
  });
}

async function send() {
  const msg = input.value.trim();
  if (!msg || streaming.value) return;

  messages.value.push({ role: 'user', content: msg });
  input.value = '';
  streaming.value = true;
  streamBuffer.value = '';
  scrollToBottom();

  const history = messages.value.slice(0, -1).map(m => ({
    role: m.role,
    content: m.content,
  }));

  await streamPost('/api/chat', {
    message: msg,
    history,
    courseTopic: localTopic.value,
  }, (chunk) => {
    streamBuffer.value += chunk;
    scrollToBottom();
  });

  if (streamBuffer.value) {
    messages.value.push({ role: 'assistant', content: streamBuffer.value });
  }
  streamBuffer.value = '';
  streaming.value = false;
  scrollToBottom();
}
</script>

<style scoped>
.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.message.user .message-avatar {
  background: #eef2ff;
  border-color: #c7d2fe;
}

.message-content {
  max-width: 75%;
  padding: 12px 16px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  line-height: 1.7;
  font-size: 14px;
  color: #1e293b;
}

.message.user .message-content {
  background: #eef2ff;
  border-color: #c7d2fe;
}

.message-content :deep(pre) {
  background: #f1f5f9;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
  border: 1px solid #e2e8f0;
}

.message-content :deep(code) {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.message-content :deep(strong) {
  color: #d97706;
}

.chat-input-area {
  padding: 12px 24px 16px;
  background: #fff;
  border-top: 1px solid #e2e8f0;
}

.topic-bar {
  margin-bottom: 8px;
}

.topic-input {
  width: 100%;
  padding: 6px 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #1e293b;
  font-size: 12px;
}

.topic-input:focus {
  outline: none;
  border-color: #4f46e5;
}

.input-row {
  display: flex;
  gap: 10px;
}

.input-row textarea {
  flex: 1;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #1e293b;
  font-size: 14px;
  font-family: inherit;
  resize: none;
}

.input-row textarea:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
}

.input-row button {
  padding: 10px 24px;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.input-row button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
