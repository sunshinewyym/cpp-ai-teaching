<template>
  <main class="leaderboard-page">
    <header class="leaderboard-hero">
      <div>
        <p class="eyebrow">LEARNING LEADERBOARD</p>
        <h2>学习排行榜</h2>
        <p>选择题和判断题按一题计算，阅读程序题和完善程序题按小题计算；跨模块重复作答只记录第一次结果。</p>
      </div>
      <div class="hero-mark" aria-hidden="true">🏆</div>
    </header>

    <section class="leaderboard-card">
      <div class="board-tabs" role="tablist" aria-label="排行榜类型">
        <button
          :class="{ active: boardType === 'practice' }"
          type="button"
          @click="boardType = 'practice'"
        >
          刷题排行榜
        </button>
        <button
          :class="{ active: boardType === 'accuracy' }"
          type="button"
          @click="boardType = 'accuracy'"
        >
          正确率排行榜
        </button>
      </div>

      <div class="filters">
        <label>
          <span>组别</span>
          <select v-model="level">
            <option value="all">全部</option>
            <option value="J">CSP-J</option>
            <option value="S">CSP-S</option>
            <option value="GESP-2">GESP C++ 二级</option><option value="GESP-3">GESP C++ 三级</option><option value="GESP-4">GESP C++ 四级</option><option value="GESP-5">GESP C++ 五级</option><option value="GESP-6">GESP C++ 六级</option><option value="GESP-7">GESP C++ 七级</option><option value="GESP-8">GESP C++ 八级</option>
          </select>
        </label>
        <label>
          <span>时间范围</span>
          <select v-model="period">
            <option value="all">历史总榜</option>
            <option value="training">集训期间</option>
            <option value="today">今日</option>
          </select>
        </label>
        <label v-if="isTeacher && classes.length">
          <span>班级</span>
          <select v-model="className">
            <option value="">全部班级</option>
            <option v-for="item in classes" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
        <p v-if="period === 'training'" class="range-note">
          {{ trainingRangeText }}
        </p>
      </div>

      <div v-if="loading" class="board-state">正在统计排行榜…</div>
      <div v-else-if="error" class="board-state error">
        <span>{{ error }}</span>
        <button type="button" @click="loadLeaderboard">重新加载</button>
      </div>
      <div v-else-if="!orderedRows.length" class="board-state">
        暂无符合条件的答题记录
      </div>

      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="rank-column">排名</th>
              <th>学生</th>
              <th>班级</th>
              <th>去重题数</th>
              <th>已判定</th>
              <th>答对</th>
              <th>正确率</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in orderedRows"
              :key="row.id"
              :class="{ current: row.isCurrentUser, pending: boardType === 'accuracy' && !row.eligible }"
            >
              <td class="rank-column">
                <span
                  v-if="displayRank(row)"
                  class="rank"
                  :class="`rank-${displayRank(row)}`"
                >
                  {{ rankLabel(displayRank(row)) }}
                </span>
                <span v-else class="rank-empty">—</span>
              </td>
              <td>
                <div class="student-name">
                  <strong>{{ row.name }}</strong>
                  <span v-if="row.isCurrentUser">我</span>
                </div>
              </td>
              <td>{{ row.className || '—' }}</td>
              <td><b>{{ row.solvedCount }}</b> 题</td>
              <td>{{ row.accuracyAnswered }} 题</td>
              <td>{{ row.correctCount }} 题</td>
              <td>
                <template v-if="boardType === 'accuracy' && !row.eligible">
                  <span class="threshold-note">至少完成 {{ threshold }} 道已判定题</span>
                </template>
                <strong v-else-if="row.accuracyPercent !== null" class="accuracy">
                  {{ formatPercent(row.accuracyPercent) }}
                </strong>
                <span v-else>—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="board-footnote">
        <span>统计范围：CSP-J/S 练习 + GESP 练习 + 十天集训历年真题</span>
        <span v-if="!isTeacher">未开放答案的集训题仅计入刷题数；答题用时明显异常的提交不参与排名。</span>
        <span v-else>教师可查看实时判定；答题用时明显异常的提交已自动排除。</span>
      </footer>
    </section>
  </main>
</template>

<script setup>
const labels = ['\u4e00', '\u4e8c', '\u4e09', '\u56db', '\u4e94', '\u516d', '\u4e03', '\u516b'];
import { computed, onMounted, ref, watch } from 'vue';
import { authFetch, isTeacher } from '../utils/auth';

const boardType = ref('practice');
const level = ref('all');
const period = ref('all');
const className = ref('');
const rows = ref([]);
const classes = ref([]);
const threshold = ref(10);
const trainingRange = ref(null);
const loading = ref(false);
const error = ref('');
let requestNumber = 0;

const orderedRows = computed(() => [...rows.value].sort((left, right) => {
  if (boardType.value === 'accuracy') {
    if (left.eligible !== right.eligible) return left.eligible ? -1 : 1;
    if (left.eligible) return left.accuracyRank - right.accuracyRank;
    return right.accuracyAnswered - left.accuracyAnswered
      || left.name.localeCompare(right.name, 'zh-CN');
  }
  return (left.practiceRank || Number.MAX_SAFE_INTEGER)
    - (right.practiceRank || Number.MAX_SAFE_INTEGER)
    || left.name.localeCompare(right.name, 'zh-CN');
}));

const trainingRangeText = computed(() => {
  if (!trainingRange.value) return '尚未设置有效的集训日期';
  return `集训日期：${trainingRange.value.start} 至 ${trainingRange.value.end}`;
});

function displayRank(row) {
  return boardType.value === 'accuracy' ? row.accuracyRank : row.practiceRank;
}

function rankLabel(rank) {
  return ({ 1: '🥇', 2: '🥈', 3: '🥉' })[rank] || rank;
}

function formatPercent(value) {
  return `${Number(value).toFixed(Number(value) % 1 ? 2 : 0)}%`;
}

async function loadLeaderboard() {
  const currentRequest = ++requestNumber;
  loading.value = true;
  error.value = '';
  try {
    const params = new URLSearchParams({ level: level.value, period: period.value });
    if (isTeacher.value && className.value) params.set('class_name', className.value);
    const response = await authFetch(`/api/leaderboard?${params}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '排行榜加载失败');
    if (currentRequest !== requestNumber) return;
    rows.value = data.rows || [];
    classes.value = data.classes || [];
    threshold.value = data.threshold || 10;
    trainingRange.value = data.trainingRange || null;
  } catch (loadError) {
    if (currentRequest === requestNumber) error.value = loadError.message || '排行榜加载失败';
  } finally {
    if (currentRequest === requestNumber) loading.value = false;
  }
}

watch([level, period, className], loadLeaderboard);
onMounted(loadLeaderboard);
</script>

<style scoped>
.leaderboard-page {
  min-height: 100%;
  padding: 28px;
  color: #172033;
  background:
    radial-gradient(circle at 85% 0%, rgba(250, 204, 21, 0.14), transparent 32%),
    #f6f8fc;
  overflow-y: auto;
}

.leaderboard-hero {
  display: flex;
  max-width: 1180px;
  margin: 0 auto 18px;
  padding: 30px 34px;
  align-items: center;
  justify-content: space-between;
  border-radius: 20px;
  color: #fff;
  background: linear-gradient(125deg, #312e81, #4f46e5 58%, #7c3aed);
  box-shadow: 0 16px 40px rgba(67, 56, 202, 0.2);
}

.eyebrow {
  margin: 0 0 7px;
  color: #c7d2fe;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.leaderboard-hero h2 {
  margin: 0 0 9px;
  font-size: 30px;
}

.leaderboard-hero p:last-child {
  margin: 0;
  color: #e0e7ff;
  line-height: 1.7;
}

.hero-mark {
  font-size: 64px;
  filter: drop-shadow(0 10px 12px rgba(15, 23, 42, 0.25));
}

.leaderboard-card {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px;
  border: 1px solid #e4e9f2;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
}

.board-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: #eef2ff;
}

.board-tabs button {
  padding: 10px 20px;
  border: 0;
  border-radius: 9px;
  color: #64748b;
  background: transparent;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.board-tabs button.active {
  color: #4338ca;
  background: #fff;
  box-shadow: 0 3px 10px rgba(67, 56, 202, 0.12);
}

.filters {
  display: flex;
  min-height: 68px;
  margin: 18px 0;
  padding: 12px 14px;
  align-items: end;
  gap: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
}

.filters label {
  display: flex;
  min-width: 150px;
  flex-direction: column;
  gap: 5px;
}

.filters label span {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.filters select {
  height: 36px;
  padding: 0 32px 0 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  color: #334155;
  background: #fff;
  font: inherit;
}

.range-note {
  margin: 0 0 8px auto;
  color: #64748b;
  font-size: 13px;
}

.table-wrap {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 15px 16px;
  border-bottom: 1px solid #edf0f5;
  text-align: left;
  white-space: nowrap;
}

th {
  color: #64748b;
  background: #f8fafc;
  font-size: 12px;
  letter-spacing: 0.04em;
}

td {
  color: #475569;
  font-size: 14px;
}

tbody tr:last-child td {
  border-bottom: 0;
}

tbody tr:hover {
  background: #fafaff;
}

tbody tr.current {
  background: #eef2ff;
  box-shadow: inset 4px 0 #6366f1;
}

tbody tr.pending {
  color: #94a3b8;
}

.rank-column {
  width: 70px;
  text-align: center;
}

.rank {
  display: inline-grid;
  min-width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 50%;
  color: #475569;
  background: #f1f5f9;
  font-weight: 800;
}

.rank-1,
.rank-2,
.rank-3 {
  background: transparent;
  font-size: 25px;
}

.rank-empty {
  color: #cbd5e1;
}

.student-name {
  display: flex;
  align-items: center;
  gap: 7px;
}

.student-name strong {
  color: #172033;
  font-size: 15px;
}

.student-name span {
  padding: 2px 7px;
  border-radius: 999px;
  color: #4338ca;
  background: #e0e7ff;
  font-size: 11px;
  font-weight: 700;
}

.accuracy {
  color: #0f766e;
  font-size: 16px;
}

.threshold-note {
  color: #94a3b8;
  font-size: 12px;
}

.board-state {
  display: flex;
  min-height: 220px;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  color: #64748b;
}

.board-state.error {
  color: #b91c1c;
}

.board-state button {
  padding: 7px 12px;
  border: 1px solid #fecaca;
  border-radius: 7px;
  color: #b91c1c;
  background: #fff;
  cursor: pointer;
}

.board-footnote {
  display: flex;
  margin-top: 15px;
  justify-content: space-between;
  gap: 12px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 760px) {
  .leaderboard-page {
    padding: 14px;
  }

  .leaderboard-hero {
    padding: 24px;
  }

  .hero-mark {
    display: none;
  }

  .filters,
  .board-footnote {
    align-items: stretch;
    flex-direction: column;
  }

  .filters label {
    min-width: 0;
  }

  .range-note {
    margin: 0;
  }
}
</style>
