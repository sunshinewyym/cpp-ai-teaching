<template>
  <div class="records-page">
    <header class="records-head">
      <h2>📊 我的练习记录</h2>
      <div class="filters">
        <select v-model="filterLevel"><option value="">全部级别</option><option value="CSP-J">CSP-J</option><option value="CSP-S">CSP-S</option></select>
        <select v-model="filterType"><option value="">全部题型</option><option value="choice">选择题</option><option value="reading">阅读程序</option><option value="completion">完善程序</option></select>
      </div>
    </header>

    <div v-if="loading" class="loading">加载中……</div>
    <div v-else-if="!records.length" class="empty">暂无练习记录，去做几套题吧！</div>

    <div v-else class="records-list">
      <div class="stats-row">
        <div class="stat-card"><b>{{ records.length }}</b><span>总练习次数</span></div>
        <div class="stat-card"><b>{{ avgRate }}%</b><span>平均得分率</span></div>
        <div class="stat-card"><b>{{ bestScore }}</b><span>最高得分</span></div>
      </div>
      <div class="table-wrap">
        <table class="records-table">
          <thead><tr><th></th><th>时间</th><th>级别</th><th>年份</th><th>题型</th><th>得分</th><th>得分率</th><th>用时</th></tr></thead>
          <tbody>
            <template v-for="r in records" :key="r.id">
              <tr class="record-row" @click="toggle(r.id)">
                <td class="expand-icon">{{ expanded === r.id ? '▼' : '▶' }}</td>
                <td>{{ formatTime(r.created_at) }}</td>
                <td><span class="tag" :class="r.level === 'CSP-J' ? 'j' : 's'">{{ r.level }}</span></td>
                <td>{{ r.year }}</td>
                <td>{{ typeLabel(r.question_type) }}</td>
                <td><b>{{ r.total_score }}/{{ r.max_score }}</b></td>
                <td><span :class="rateClass(r)">{{ rate(r) }}%</span></td>
                <td>{{ r.duration_seconds ? formatDuration(r.duration_seconds) : '-' }}</td>
              </tr>
              <tr v-if="expanded === r.id" class="detail-row">
                <td colspan="8">
                  <div class="detail-content">
                    <div class="ai-section">
                      <button class="ai-btn" @click.stop="analyzeRecord(r)" :disabled="analyzingId === r.id">
                        {{ analyzingId === r.id ? 'AI 分析中……' : '🤖 AI 分析' }}
                      </button>
                      <div v-if="aiResults[r.id]" class="ai-result" v-html="renderMd(aiResults[r.id])"></div>
                    </div>
                    <table class="detail-table">
                      <thead><tr><th>题号</th><th>我的答案</th><th>正确答案</th><th>结果</th><th>得分</th></tr></thead>
                      <tbody>
                        <tr v-for="q in (r.answers?.questions || [])" :key="q.id" :class="q.correct ? 'row-correct' : 'row-wrong'">
                          <td>第 {{ q.number || q.id }} 题</td>
                          <td>{{ q.user_answer || '未作答' }}</td>
                          <td>{{ q.correct_answer }}</td>
                          <td>{{ q.correct ? '✓' : '✗' }}</td>
                          <td>{{ q.score }} 分</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { marked } from 'marked';
import { authFetch, authHeaders } from '../utils/auth';

const records = ref([]);
const loading = ref(false);
const expanded = ref(null);
const analyzingId = ref(null);
const aiResults = ref({});
const filterLevel = ref('');
const filterType = ref('');

const avgRate = computed(() => {
  if (!records.value.length) return 0;
  const sum = records.value.reduce((s, r) => s + r.total_score / r.max_score, 0);
  return Math.round(sum / records.value.length * 100);
});
const bestScore = computed(() => {
  if (!records.value.length) return '-';
  const best = records.value.reduce((b, r) => (r.total_score / r.max_score > b.total_score / b.max_score ? r : b));
  return `${best.total_score}/${best.max_score}`;
});

function toggle(id) { expanded.value = expanded.value === id ? null : id; }
function renderMd(text) { return text ? marked.parse(text) : ''; }

async function analyzeRecord(r) {
  if (analyzingId.value) return;
  analyzingId.value = r.id;
  aiResults.value = { ...aiResults.value, [r.id]: '' };
  try {
    const resp = await fetch('/api/practice/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ record_id: r.id }),
    });
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const json = JSON.parse(payload);
            if (json.content) aiResults.value = { ...aiResults.value, [r.id]: (aiResults.value[r.id] || '') + json.content };
            if (json.error) aiResults.value = { ...aiResults.value, [r.id]: '⚠️ ' + json.error };
          } catch {}
        }
      }
    }
  } catch (e) {
    aiResults.value = { ...aiResults.value, [r.id]: '⚠️ 分析请求失败' };
  }
  analyzingId.value = null;
}
function rate(r) { return Math.round(r.total_score / r.max_score * 100); }
function rateClass(r) { const v = rate(r); return v >= 80 ? 'good' : v >= 60 ? 'mid' : 'low'; }
function typeLabel(t) { return { choice: '选择题', reading: '阅读程序', completion: '完善程序' }[t] || t; }
function formatTime(t) { return t ? t.replace('T', ' ').slice(0, 16) : ''; }
function formatDuration(s) { const m = Math.floor(s / 60); return m > 0 ? `${m}分${s % 60}秒` : `${s}秒`; }

async function loadRecords() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (filterLevel.value) params.set('level', filterLevel.value);
    if (filterType.value) params.set('question_type', filterType.value);
    const resp = await authFetch(`/api/practice/my-history?${params}`);
    records.value = await resp.json();
  } catch (e) { records.value = []; }
  loading.value = false;
}

watch([filterLevel, filterType], loadRecords);
onMounted(loadRecords);
</script>

<style scoped>
.records-page { height: 100%; overflow-y: auto; padding: 24px 28px; background: #f7f9fc; }
.records-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.records-head h2 { margin: 0; color: #4f46e5; font-size: 22px; }
.filters { display: flex; gap: 10px; }
.filters select { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
.loading, .empty { text-align: center; padding: 60px 0; color: #64748b; font-size: 16px; }
.stats-row { display: flex; gap: 16px; margin-bottom: 20px; }
.stat-card { flex: 1; padding: 18px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; text-align: center; }
.stat-card b { display: block; font-size: 28px; color: #4f46e5; }
.stat-card span { color: #64748b; font-size: 13px; }
.table-wrap { background: #fff; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden; }
.records-table { width: 100%; border-collapse: collapse; }
.records-table th { padding: 12px 14px; background: #f8fafc; color: #475569; font-size: 13px; text-align: left; border-bottom: 1px solid #e2e8f0; }
.records-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
.record-row { cursor: pointer; transition: background 0.15s; }
.record-row:hover { background: #f8fafc; }
.expand-icon { width: 30px; color: #94a3b8; font-size: 11px; text-align: center; }
.tag { padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; }
.tag.j { background: #dbeafe; color: #1d4ed8; }
.tag.s { background: #fce7f3; color: #be185d; }
.good { color: #16a34a; font-weight: 700; }
.mid { color: #d97706; font-weight: 700; }
.low { color: #dc2626; font-weight: 700; }
.detail-row td { padding: 0 !important; border-bottom: 1px solid #e2e8f0; }
.detail-content { padding: 16px 20px; background: #f8fafc; }
.detail-table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
.detail-table th { padding: 8px 12px; background: #eef2ff; color: #3730a3; font-size: 12px; text-align: left; }
.detail-table td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
.row-correct td { color: #166534; }
.row-wrong td { color: #991b1b; background: #fef2f2; }
.ai-section { margin-bottom: 14px; }
.ai-btn { padding: 8px 16px; border: 1px solid #c7d2fe; border-radius: 6px; background: #eef2ff; color: #4338ca; font-size: 13px; font-weight: 600; cursor: pointer; }
.ai-btn:hover:not(:disabled) { background: #e0e7ff; }
.ai-btn:disabled { opacity: 0.6; cursor: wait; }
.ai-result { margin-top: 12px; padding: 14px 16px; background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid #6366f1; border-radius: 6px; font-size: 14px; line-height: 1.7; }
.ai-result :deep(strong) { color: #4338ca; }
.ai-result :deep(p) { margin: 6px 0; }
</style>
