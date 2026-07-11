<template>
  <div class="chat-panel">
    <div class="messages" ref="messagesRef">
      <div v-if="!messages.length && !streaming" class="empty-state">
        <div class="empty-state-mark">AI</div>
        <h2>一起把 C++ 学明白</h2>
        <p>可以从一个小问题开始，我会用更容易理解的方式陪你拆开思路。</p>
        <div class="suggestions">
          <button
            v-for="suggestion in suggestions"
            :key="suggestion"
            type="button"
            @click="useSuggestion(suggestion)"
          >
            {{ suggestion }}
          </button>
        </div>
      </div>
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
      <div v-if="streaming && !streamBuffer" class="message assistant assistant-thinking">
        <div class="message-avatar">🤖</div>
        <div class="message-content">
          <div class="thinking-title"><span class="thinking-dots"><i></i><i></i><i></i></span>AI 正在组织讲解……</div>
          <div class="chat-tip-window"><div class="chat-tip-track"><p v-for="tip in chatLoadingTips" :key="tip">{{ tip }}</p></div></div>
        </div>
      </div>
      <div v-if="streaming && streamBuffer" class="message assistant">
        <div class="message-avatar">🤖</div>
        <div class="message-content">
          <div v-html="renderMarkdown(streamBuffer)"></div>
          <span class="typing-cursor">▍</span>
        </div>
      </div>
    </div>

    <div class="chat-input-area">
      <div class="input-row">
        <textarea
          v-model="input"
          @keydown.enter.exact.prevent="send"
          placeholder="输入问题（Enter 发送，Shift+Enter 换行）"
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
import { ref, nextTick, computed, onMounted } from 'vue';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { streamPost } from '../utils/api';

const messages = ref([]);
const input = ref('');
const streaming = ref(false);
const streamBuffer = ref('');
const messagesRef = ref(null);
const chatNewsTips = ref([]);
const suggestions = [
  '用生活例子解释递归',
  'BFS 和 DFS 有什么区别？',
  '如何判断一个算法的时间复杂度？',
];

const chatFallbackTips = [
  '正在把复杂问题拆成可以一步步理解的小问题。',
  '程序员小知识：第一个「Bug」曾被记录为一只飞蛾。',
  '历史上的今天，计算机科学一直在给世界增加新玩法。',
  '好问题比立刻得到答案更接近真正的学习。',
];

const chatLoadingTips = computed(() => {
  const items = [...chatNewsTips.value, ...chatFallbackTips];
  return Array.from({ length: 8 }, (_, index) => items[index % items.length]);
});

onMounted(async () => {
  try {
    const response = await fetch('/api/news');
    const data = await response.json();
    chatNewsTips.value = (data.items || []).map(item => item.title).filter(Boolean).slice(0, 8);
  } catch {
    chatNewsTips.value = [];
  }
});

function useSuggestion(suggestion) {
  input.value = suggestion;
}

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
  let queuedText = '';
  let typing = false;

  const typeQueuedText = async () => {
    typing = true;
    while (queuedText) {
      streamBuffer.value += queuedText.slice(0, 2);
      queuedText = queuedText.slice(2);
      scrollToBottom();
      await new Promise(resolve => setTimeout(resolve, 16));
    }
    typing = false;
  };

  const history = messages.value.slice(0, -1).map(m => ({
    role: m.role,
    content: m.content,
  }));

  await streamPost('/api/chat', {
    message: msg,
    history,
  }, (chunk) => {
    queuedText += chunk;
    if (!typing) void typeQueuedText();
  });

  while (typing || queuedText) {
    await new Promise(resolve => setTimeout(resolve, 16));
  }

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
  background: #f8fafc;
}

.empty-state {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  text-align: center;
  color: #475569;
}

.empty-state-mark {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  margin-bottom: 16px;
  border: 2px solid #a5b4fc;
  border-radius: 18px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0;
}

.empty-state h2 {
  margin: 0 0 8px;
  color: #1e293b;
  font-size: 24px;
}

.empty-state p {
  max-width: 440px;
  margin: 0;
  line-height: 1.7;
  font-size: 15px;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
}

.suggestions button {
  padding: 8px 12px;
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  background: #fff;
  color: #4338ca;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.suggestions button:hover {
  border-color: #818cf8;
  background: #eef2ff;
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

.message.assistant .message-content {
  font-size: 16px;
  line-height: 1.8;
}

.assistant-thinking .message-content {
  min-width: min(420px, 75vw);
}

.thinking-title {
  display: flex;
  align-items: center;
  gap: 9px;
  font-weight: 700;
  color: #4338ca;
}

.thinking-dots {
  display: inline-flex;
  gap: 4px;
}

.thinking-dots i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #06b6d4;
  animation: chat-bounce 0.9s ease-in-out infinite;
}

.thinking-dots i:nth-child(2) { animation-delay: 0.15s; background: #6366f1; }
.thinking-dots i:nth-child(3) { animation-delay: 0.3s; background: #f59e0b; }

.chat-tip-window {
  height: 24px;
  margin-top: 5px;
  overflow: hidden;
  color: #64748b;
  font-size: 13px;
}

.chat-tip-track {
  animation: chat-tip-scroll 28s steps(8) infinite;
}

.chat-tip-track p {
  height: 24px;
  margin: 0;
  line-height: 24px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.typing-cursor {
  margin-left: 3px;
  color: #4f46e5;
  animation: cursor-blink 0.8s steps(2) infinite;
}

@keyframes chat-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.45; }
  40% { transform: translateY(-5px); opacity: 1; }
}

@keyframes chat-tip-scroll {
  to { transform: translateY(-192px); }
}

@keyframes cursor-blink {
  50% { opacity: 0; }
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
