<template>
  <main class="syntax-panel">
    <header class="syntax-header">
      <div>
        <h2>🧩 语法可视化</h2>
        <p>把代码的执行顺序、变量变化和输出过程一步步看清楚。</p>
      </div>
      <nav class="syntax-tabs" aria-label="语法可视化知识点">
        <button
          v-for="item in syntaxTopics"
          :key="item.id"
          type="button"
          :class="{ active: selectedId === item.id }"
          @click="selectTopic(item.id)"
        >
          <span>{{ item.icon }}</span>{{ item.label }}
        </button>
      </nav>
    </header>

    <section v-if="!selectedId" class="syntax-empty" aria-label="语法可视化使用提示">
      <div class="syntax-empty-mark" aria-hidden="true">🧩</div>
      <h3>让每一行代码动起来</h3>
      <p>选择一个知识点，观察代码执行时变量、数组和输出怎样变化。</p>
      <div class="syntax-empty-suggestions">
        <button type="button" @click="selectTopic('for-loop')">🔁 for 循环</button>
        <button type="button" @click="selectTopic('nested-loop')">🧮 嵌套循环</button>
        <button type="button" @click="selectTopic('array')">🧱 一维数组</button>
      </div>
    </section>

    <template v-else>
      <section class="syntax-summary">
        <div>
          <span>{{ selectedTopic.icon }}</span>
          <strong>{{ demo.title }}</strong>
          <p>{{ demo.summary }}</p>
        </div>
        <label v-if="selectedId === 'branch'" class="branch-input">
          演示分数
          <input v-model.number="branchScore" type="number" @change="reset" />
        </label>
        <button type="button" class="reset-button" @click="reset">↻ 重置演示</button>
      </section>

      <section class="syntax-step-banner">
        <b>第 {{ stepIndex + 1 }} / {{ demo.steps.length }} 步</b>
        <strong>{{ step.title }}</strong>
        <p>{{ step.message }}</p>
      </section>

      <section class="syntax-stage">
        <div class="syntax-left-stack">
          <article class="code-card">
            <header>代码执行位置</header>
            <pre><code><span
              v-for="(line, index) in demo.code"
              :key="`${selectedId}-${index}`"
              :class="['code-line', { active: step.line === index + 1 }]"
            ><i>{{ index + 1 }}</i><span v-html="highlightCode(line)"></span></span></code></pre>
          </article>

          <article class="console-card">
            <header>输出区</header>
            <pre>{{ (step.output || []).join('\n') || '暂时没有输出' }}</pre>
          </article>
        </div>

        <article class="state-card">
          <header>运行状态</header>

          <div v-if="demo.visual === 'branch'" class="branch-view">
            <div :class="['branch-score', { active: step.flow === 'start' }]">
              <span>当前分数</span>
              <strong>{{ step.variables?.score ?? branchScore }}</strong>
            </div>

            <div :class="['branch-condition', { active: step.flow === 'decision' }]">
              <span>程序正在判断</span>
              <div class="branch-expression">
                <b>{{ step.variables?.score ?? branchScore }}</b>
                <i>≥</i>
                <b>60</b>
              </div>
              <strong :class="['branch-result', branchResultClass]">{{ branchResultText }}</strong>
            </div>

            <div class="branch-routes">
              <div :class="['branch-route', 'pass', branchRouteClass('if')]">
                <span class="route-status">条件成立</span>
                <b>走 if 分支</b>
                <strong>输出 pass</strong>
                <span class="route-light" aria-hidden="true"></span>
              </div>
              <div :class="['branch-route', 'retry', branchRouteClass('else')]">
                <span class="route-status">条件不成立</span>
                <b>走 else 分支</b>
                <strong>输出 retry</strong>
                <span class="route-light" aria-hidden="true"></span>
              </div>
            </div>

            <div :class="['branch-progress', { done: step.flow === 'done' }]">
              <span class="progress-dot"></span>
              <strong>{{ branchProgressText }}</strong>
            </div>
          </div>

          <div v-else-if="demo.visual === 'variables'" class="memory-boxes-view">
            <div
              v-for="[name, value] in memoryVariables(step.variables)"
              :key="name"
              :class="['memory-box-wrap', { active: step.active === name }]"
            >
              <div class="memory-box"><b>{{ value }}</b></div>
              <strong>{{ name }}</strong>
            </div>
            <div v-if="step.active === 'a + b'" class="expression-chip">3 + 5 = 8</div>
          </div>

          <div v-else-if="demo.visual === 'for-loop'" class="for-loop-view">
            <div class="loop-stages" aria-label="for 循环四个阶段">
              <div v-for="stage in loopStages" :key="stage.id" :class="['loop-stage', loopStageClass(stage.id)]">
                <small>{{ stage.order }}</small><strong>{{ stage.label }}</strong>
              </div>
            </div>
            <div class="condition-screen">
              <span>本轮条件</span><strong>{{ step.loop?.condition }}</strong>
              <b :class="step.loop?.result === false ? 'false' : step.loop?.result === true ? 'true' : ''">{{ loopResultText }}</b>
            </div>
            <div class="iteration-track">
              <div v-for="value in [1, 2, 3, 4]" :key="value" :class="['iteration-cell', { current: step.loop?.current === value, visited: step.loop?.visited?.includes(value), failed: value === 4 && step.loop?.result === false }]">
                <small>i</small><strong>{{ value }}</strong><span>{{ step.loop?.visited?.includes(value) ? '已输出' : value === 4 ? '停止' : '等待' }}</span>
              </div>
            </div>
          </div>

          <div v-else-if="demo.visual === 'while-compare'" class="while-compare-view">
            <div :class="['while-lane', { active: step.whileCompare?.phase === 'while-check' }]">
              <header><strong>while</strong><span>先判断，再执行</span></header>
              <div class="lane-order"><b>判断 x &lt; 3</b><i>→</i><b>循环体</b></div>
              <div class="lane-result"><strong>执行 {{ step.whileCompare?.whileRuns || 0 }} 次</strong><span>{{ step.whileCompare?.phase === 'while-check' ? '3 < 3 为 false，跳过' : '等待比较' }}</span></div>
            </div>
            <div :class="['while-lane', 'do-lane', { active: step.whileCompare?.phase?.startsWith('do-') }]">
              <header><strong>do-while</strong><span>先执行，再判断</span></header>
              <div class="lane-order"><b>循环体</b><i>→</i><b>判断 x &lt; 3</b></div>
              <div class="lane-result"><strong>执行 {{ step.whileCompare?.doRuns || 0 }} 次</strong><span>{{ step.whileCompare?.phase === 'do-body' ? '先输出 3' : step.whileCompare?.phase === 'do-check' ? '4 < 3 为 false，停止' : '等待执行' }}</span></div>
            </div>
          </div>

          <div v-else-if="demo.visual === 'nested-loop'" class="nested-loop-view">
            <div class="nested-axis"><span>外层 i = {{ step.variables?.i }}</span><b>选中第 {{ step.variables?.i }} 行</b><span>内层 j = {{ step.variables?.j }}</span></div>
            <div class="nested-board" :style="{ gridTemplateColumns: `repeat(${step.nested?.cols || 1}, 1fr)` }">
              <div v-for="(_, index) in nestedCells(step.nested)" :key="index" :class="['nested-cell', cellClass(step.nested, index)]">
                <small>i={{ Math.floor(index / step.nested.cols) + 1 }}, j={{ index % step.nested.cols + 1 }}</small>
                <strong>{{ nestedCellValue(step.nested, index) }}</strong>
              </div>
            </div>
            <div class="nested-counters"><span>外层走 {{ step.variables?.i || 0 }} 行</span><span>当前行走到第 {{ step.variables?.j || 0 }} 格</span></div>
          </div>

          <div v-else-if="demo.visual === 'flow-control'" class="flow-control-view">
            <div class="control-track">
              <div v-for="(state, index) in step.control?.states || []" :key="index" :class="['control-cell', state, { current: step.control?.current === index + 1 }]">
                <small>i = {{ index + 1 }}</small><strong>{{ controlStateText(state) }}</strong>
              </div>
            </div>
            <div :class="['control-action', step.control?.action]"><strong>{{ controlActionTitle }}</strong><span>{{ controlActionMessage }}</span></div>
          </div>

          <div v-else-if="demo.visual === 'grid'" class="matrix-view" :style="{ gridTemplateColumns: `repeat(${step.grid?.cols || 1}, minmax(42px, 1fr))` }">
            <div
              v-for="(_, index) in gridCells(step.grid)"
              :key="index"
              :class="['matrix-cell', cellClass(step.grid, index)]"
            >{{ gridValue(step.grid, index) }}</div>
          </div>

          <div v-else-if="demo.visual === 'cells'" class="cells-view">
            <span v-if="step.cells?.labels" class="cells-label">{{ step.cells.labels }}</span>
            <div class="cell-row">
              <div
                v-for="(value, index) in step.cells?.values || []"
                :key="index"
                :class="['data-cell', { active: step.cells?.active === index, error: step.cells?.error && step.cells?.active === index, shifted: step.cells?.shift?.includes(index) }]"
              >
                <small>{{ index }}</small><b>{{ value === '' ? '空位' : value }}</b>
              </div>
              <div v-if="(step.cells?.values || []).length === 0" class="empty-container-state">当前容器为空</div>
              <div v-if="step.cells?.error" class="data-cell error"><small>4</small><b>越界</b></div>
            </div>
          </div>

          <div v-else-if="demo.visual === 'string-ops'" class="string-ops-view">
            <div class="string-operation"><span>当前操作</span><strong>{{ step.stringOp?.operation }}</strong></div>
            <div class="string-compare">
              <div class="string-line before">
                <span>操作前</span>
                <div class="string-cells">
                  <div v-for="(value, index) in stringCharacters(step.stringOp?.before)" :key="`before-${index}`" :class="['string-cell', { removed: step.stringOp?.removed?.includes(index) }]">
                    <small>{{ index }}</small><b>{{ value }}</b>
                  </div>
                  <em v-if="stringCharacters(step.stringOp?.before).length === 0">还没有字符</em>
                </div>
              </div>
              <div class="string-arrow">↓</div>
              <div class="string-line after">
                <span>操作后：{{ step.stringOp?.resultName }}</span>
                <div class="string-cells">
                  <div v-for="(value, index) in stringCharacters(step.stringOp?.after)" :key="`after-${index}`" :class="['string-cell', { active: step.stringOp?.active?.includes(index) }]">
                    <small>{{ index }}</small><b>{{ value }}</b>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="demo.visual === 'input'" class="input-view">
            <div><small>剩余输入</small><b>{{ step.input?.buffer || '已读完' }}</b></div>
            <div><small>cin 结果</small><b>{{ step.input?.cin || '—' }}</b></div>
            <div><small>getline 结果</small><b>{{ step.input?.getline || '—' }}</b></div>
          </div>

          <div v-else-if="demo.visual === 'frames'" class="frames-view">
            <div v-for="frame in step.frames || []" :key="frame.name" class="frame-card">
              <strong>{{ frame.name }}()</strong>
              <span v-for="(value, name) in frame.values" :key="name">{{ name }} = {{ value }}</span>
            </div>
          </div>

          <div v-else-if="demo.visual === 'scopes'" class="scopes-view">
            <div v-for="scope in step.scopes || []" :key="scope.name" :class="['scope-box', { active: scope.active }]">
              <strong>{{ scope.name }}</strong><span v-for="value in scope.values" :key="value">{{ value }}</span>
            </div>
          </div>

          <div v-else-if="demo.visual === 'memory'" class="memory-view">
            <div class="memory-slot"><small>地址 0x100</small><b>x = {{ step.memory?.value }}</b></div>
            <div v-if="step.memory?.pointer !== '未指向'" class="memory-arrow">{{ step.memory.pointer }} ───→</div>
            <div v-if="step.memory?.reference !== '未绑定'" class="memory-reference">{{ step.memory.reference }} 与 x 指向同一位置</div>
          </div>

          <div v-else-if="demo.visual === 'record'" class="record-view">
            <strong>{{ step.record?.active === 'definition' ? 'struct Student' : 'Student tom' }}</strong>
            <div :class="{ active: step.record?.active === 'name' }"><span>name</span><b>{{ step.record?.name }}</b></div>
            <div :class="{ active: step.record?.active === 'score' }"><span>score</span><b>{{ step.record?.score }}</b></div>
          </div>

          <div v-else-if="demo.visual === 'digit-separation'" class="digit-separation-view">
            <div class="digit-number-group">
              <span>当前 n</span>
              <div class="digit-number">
                <b v-for="(char, index) in String(step.digits?.number ?? 0).split('')" :key="`${char}-${index}`" :class="{ active: index === String(step.digits?.number ?? 0).length - 1 && step.digits?.action === 'extract' }">{{ char }}</b>
              </div>
            </div>
            <div :class="['digit-calculation', step.digits?.action]">
              <small>本步运算</small>
              <strong v-if="step.digits?.action === 'extract'">{{ step.digits.before }} % 10 = {{ step.digits.digit }}</strong>
              <strong v-else-if="step.digits?.action === 'divide' || step.digits?.action === 'done'">{{ step.digits.before }} / 10 = {{ step.digits.number }}</strong>
              <strong v-else>准备从个位开始</strong>
            </div>
            <div class="digit-results">
              <span>已取出的数位（从低位到高位）</span>
              <div><b v-for="(digit, index) in step.digits?.extracted || []" :key="index">{{ digit }}</b><em v-if="!step.digits?.extracted?.length">等待取出</em></div>
            </div>
          </div>

          <div v-else-if="demo.visual === 'common-functions'" class="common-functions-view">
            <div v-for="card in step.commonFunctions?.cards || []" :key="card.id" :class="['function-result-card', { active: card.id === step.commonFunctions?.active, waiting: card.result === '等待执行' }]">
              <span>{{ card.meaning }}</span>
              <strong>{{ card.expression }}</strong>
              <b>{{ card.result }}</b>
            </div>
          </div>

          <div v-else class="variable-placeholder">等待这一行代码执行</div>
        </article>
      </section>

      <footer class="syntax-controls">
        <button type="button" title="上一步" :disabled="stepIndex === 0" @click="previous">←</button>
        <button type="button" :class="{ playing }" :title="playing ? '暂停' : '自动播放'" @click="togglePlay">{{ playing ? '■' : '▶' }}</button>
        <button type="button" title="下一步" :disabled="stepIndex === demo.steps.length - 1" @click="next">→</button>
        <label>速度
          <select v-model="speed">
            <option :value="0.5">0.5x</option>
            <option :value="1">1x</option>
            <option :value="2">2x</option>
          </select>
        </label>
      </footer>
    </template>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { getSyntaxDemo, syntaxTopics } from '../utils/syntaxVisualizer';

const selectedId = ref(null);
const stepIndex = ref(0);
const playing = ref(false);
const speed = ref(1);
const branchScore = ref(72);
let timer = null;

const selectedTopic = computed(() => syntaxTopics.find((item) => item.id === selectedId.value) || syntaxTopics[0]);
const demo = computed(() => getSyntaxDemo(selectedId.value || 'variables', { score: branchScore.value }));
const step = computed(() => demo.value.steps[stepIndex.value] || demo.value.steps[0]);
const interval = computed(() => ({ 0.5: 1600, 1: 950, 2: 520 })[speed.value] || 950);
const branchHasResult = computed(() => step.value.flow !== 'start');
const branchResultText = computed(() => {
  if (!branchHasResult.value) return '等待比较';
  return step.value.branch === 'if' ? '成立 true' : '不成立 false';
});
const branchResultClass = computed(() => {
  if (!branchHasResult.value) return 'waiting';
  return step.value.branch === 'if' ? 'passed' : 'failed';
});
const branchProgressText = computed(() => {
  if (step.value.flow === 'start') return '读取 score，准备判断';
  if (step.value.flow === 'decision') return `判断完成，选择 ${step.value.branch} 分支`;
  if (step.value.flow === 'done') return `执行结束，本次输出 ${step.value.output?.[0] || ''}`;
  return `正在执行 ${step.value.branch} 分支`;
});
const loopStages = [
  { id: 'init', order: 1, label: '初始化' },
  { id: 'check', order: 2, label: '判断' },
  { id: 'body', order: 3, label: '循环体' },
  { id: 'update', order: 4, label: '更新' },
];
const loopResultText = computed(() => {
  if (step.value.loop?.result === true) return '成立，继续';
  if (step.value.loop?.result === false) return '不成立，停止';
  return step.value.loop?.phase === 'init' ? '准备第一次判断' : '即将重新判断';
});
const controlActionTitle = computed(() => ({ output: '正常执行', continue: '跳过本轮', break: '结束循环' })[step.value.control?.action] || '等待执行');
const controlActionMessage = computed(() => ({
  output: `i = ${step.value.control?.current} 被送到输出区`,
  continue: '立即前往下一轮，后面的 cout 不执行',
  break: '后续所有轮次都不会再执行',
})[step.value.control?.action] || '');

function branchRouteClass(branch) {
  if (!branchHasResult.value) return 'waiting';
  if (step.value.branch !== branch) return 'skipped';
  return step.value.flow === 'done' ? 'completed' : 'active';
}

function loopStageClass(stage) {
  const phase = step.value.loop?.phase;
  if (phase === 'done') return stage === 'check' ? 'failed' : 'completed';
  if (phase === stage) return 'active';
  const order = ['init', 'check', 'body', 'update'];
  return order.indexOf(stage) < order.indexOf(phase) ? 'completed' : '';
}

function controlStateText(state) {
  return ({ output: '输出', continue: '跳过', break: '停止', blocked: '不执行', waiting: '等待' })[state] || state;
}

function selectTopic(id) {
  stop();
  selectedId.value = id;
  stepIndex.value = 0;
}

function next() {
  if (stepIndex.value < demo.value.steps.length - 1) stepIndex.value += 1;
  else stop();
}

function previous() {
  if (stepIndex.value > 0) stepIndex.value -= 1;
}

function reset() {
  stop();
  stepIndex.value = 0;
}

function start() {
  if (playing.value || stepIndex.value >= demo.value.steps.length - 1) return;
  playing.value = true;
  timer = window.setInterval(() => {
    if (stepIndex.value >= demo.value.steps.length - 1) stop();
    else next();
  }, interval.value);
}

function stop() {
  playing.value = false;
  if (timer) window.clearInterval(timer);
  timer = null;
}

function togglePlay() {
  if (playing.value) stop();
  else start();
}

watch(speed, () => {
  if (playing.value) {
    stop();
    start();
  }
});

watch(branchScore, () => {
  if (selectedId.value === 'branch') reset();
});

function gridCells(grid = {}) {
  return Array.from({ length: (grid.rows || 1) * (grid.cols || 1) });
}

function nestedCells(nested = {}) {
  return Array.from({ length: (nested.rows || 1) * (nested.cols || 1) });
}

function nestedCellValue(nested = {}, index) {
  const row = Math.floor(index / nested.cols);
  const col = index % nested.cols;
  const active = nested.active?.[0] === row && nested.active?.[1] === col;
  const visited = nested.visited?.some(([r, c]) => r === row && c === col);
  return active || visited ? nested.value || '★' : '·';
}

function stringCharacters(value) {
  return Array.isArray(value) ? value : Array.from(value || '');
}

function gridValue(grid = {}, index) {
  if (!grid.values) return '';
  const row = Math.floor(index / grid.cols);
  const col = index % grid.cols;
  return grid.values[row]?.[col] ?? '';
}

function cellClass(grid = {}, index) {
  const row = Math.floor(index / grid.cols);
  const col = index % grid.cols;
  const key = `${row}-${col}`;
  const active = grid.active?.[0] === row && grid.active?.[1] === col;
  const visited = grid.visited?.some(([r, c]) => `${r}-${c}` === key);
  return { active, visited };
}

function memoryVariables(variables = {}) {
  return Object.entries(variables).filter(([name]) => !name.includes('+'));
}

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightCode(value) {
  let line = escapeHtml(value || ' ');
  line = line.replace(/(\/\/.*)$/g, '<em>$1</em>');
  line = line.replace(/(&quot;.*?&quot;)/g, '<span class="token-string">$1</span>');
  line = line.replace(/\b(int|double|char|bool|void|string|vector|struct|if|else|for|while|do|return|break|continue|cout|cin|getline)\b/g, '<span class="token-keyword">$1</span>');
  line = line.replace(/\b(\d+)\b/g, '<span class="token-number">$1</span>');
  return line || '&nbsp;';
}

onBeforeUnmount(stop);
</script>

<style scoped>
.syntax-panel { flex: 1; min-width: 0; overflow-y: auto; padding: 10px 20px 16px; background: #f8fafc; }
.syntax-header { display: flex; width: 100%; align-items: center; gap: 10px; margin-bottom: 10px; }
.syntax-header > div { flex: 0 0 auto; }
.syntax-header h2 { color: #1e293b; font-size: 20px; }
.syntax-header p { display: none; }
.syntax-tabs { display: grid; min-width: 0; flex: 1; grid-template-columns: repeat(9, minmax(0, 1fr)); grid-template-rows: repeat(2, 32px); gap: 5px; }
.syntax-tabs button { min-width: 0; width: 100%; padding: 4px 2px; overflow: hidden; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; color: #475569; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; text-overflow: ellipsis; white-space: nowrap; }
.syntax-tabs button:hover { border-color: #818cf8; color: #4338ca; }
.syntax-tabs button.active { border-color: #4f46e5; background: #4f46e5; color: #fff; }
.syntax-empty { display: flex; min-height: 430px; align-items: center; justify-content: center; flex-direction: column; padding: 48px 20px; text-align: center; }
.syntax-empty-mark { display: grid; width: 60px; height: 60px; place-items: center; margin-bottom: 16px; border: 2px solid #a5b4fc; border-radius: 18px; background: #eef2ff; font-size: 30px; }
.syntax-empty h3 { margin: 0 0 8px; color: #1e293b; font-size: 25px; }
.syntax-empty p { max-width: 500px; margin: 0; color: #64748b; font-size: 15px; line-height: 1.7; }
.syntax-empty-suggestions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 24px; }
.syntax-empty-suggestions button { padding: 9px 14px; border: 1px solid #c7d2fe; border-radius: 8px; background: #fff; color: #4338ca; font: inherit; cursor: pointer; }
.syntax-summary { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 10px; padding: 10px 14px; border: 1px solid #dbe4f0; border-radius: 8px; background: #fff; }
.syntax-summary > div { display: grid; grid-template-columns: 28px auto; column-gap: 8px; align-items: center; }
.syntax-summary span { font-size: 22px; }
.syntax-summary strong { color: #1e293b; font-size: 16px; }
.syntax-summary p { grid-column: 2; margin-top: 2px; color: #64748b; font-size: 13px; }
.branch-input { display: flex; align-items: center; gap: 8px; margin-left: auto; color: #475569; font-size: 13px; font-weight: 700; white-space: nowrap; }.branch-input input { width: 76px; padding: 6px 8px; border: 1px solid #a5b4fc; border-radius: 6px; color: #3730a3; font: inherit; font-weight: 800; text-align: center; }.branch-input input:focus { outline: 2px solid #c7d2fe; }
.reset-button { padding: 7px 11px; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; color: #475569; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.syntax-step-banner { margin-bottom: 10px; padding: 10px 14px; border-left: 5px solid #4f46e5; border-radius: 8px; background: #fff; box-shadow: 0 6px 18px rgba(15, 23, 42, .05); }
.syntax-step-banner b { margin-right: 10px; color: #4f46e5; font-size: 14px; }
.syntax-step-banner strong { color: #1e293b; font-size: 16px; }
.syntax-step-banner p { margin-top: 3px; color: #64748b; font-size: 14px; line-height: 1.5; }
.syntax-stage { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; gap: 10px; }
.syntax-left-stack { display: grid; min-width: 0; grid-template-rows: minmax(0, 1fr) auto; gap: 10px; }
.code-card, .state-card, .console-card, .note-card { min-width: 0; overflow: hidden; border: 1px solid #dbe4f0; border-radius: 8px; background: #fff; }
.code-card > header, .state-card > header, .console-card > header, .note-card > header { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 13px; font-weight: 800; }
.code-card { display: flex; flex-direction: column; }.code-card pre { min-height: 238px; flex: 1; margin: 0; padding: 7px 0; overflow: auto; background: #0f172a; color: #cbd5e1; font-family: Consolas, Monaco, monospace; font-size: 13px; line-height: 1.65; }
.code-line { display: grid; grid-template-columns: 34px minmax(0, 1fr); min-height: 21px; padding-right: 10px; white-space: pre; }
.code-line.active { background: rgba(99, 102, 241, .42); }
.code-line i { padding-right: 10px; color: #64748b; font-style: normal; text-align: right; user-select: none; }
.code-line :deep(.token-keyword) { color: #f472b6; }.code-line :deep(.token-number) { color: #fbbf24; }.code-line :deep(.token-string) { color: #86efac; }.code-line :deep(em) { color: #94a3b8; font-style: normal; }
.state-card { display: flex; min-height: 0; flex-direction: column; }
.state-card > :not(header) { margin: 10px 12px; }
.branch-view { display: grid; min-height: 310px; flex: 1; grid-template-columns: minmax(96px, .36fr) minmax(0, 1.64fr); grid-template-rows: minmax(108px, 1fr) minmax(88px, .82fr) auto; align-items: stretch; gap: 12px; padding: 16px !important; background: #f8fafc; }
.branch-score, .branch-condition, .branch-route, .branch-progress { border: 2px solid #dbe4f0; border-radius: 8px; background: #fff; }
.branch-score { display: grid; place-content: center; justify-items: center; gap: 7px; color: #64748b; text-align: center; transition: .25s ease; }
.branch-score span { font-size: 12px; font-weight: 700; }
.branch-score strong { color: #1e293b; font-size: 34px; line-height: 1; }
.branch-score.active { border-color: #818cf8; background: #eef2ff; box-shadow: 0 0 0 4px rgba(99, 102, 241, .12); }
.branch-condition { display: grid; place-content: center; justify-items: center; gap: 10px; padding: 16px; text-align: center; transition: .25s ease; }
.branch-condition > span { color: #64748b; font-size: 12px; font-weight: 700; }
.branch-condition.active { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99, 102, 241, .12); }
.branch-expression { display: flex; align-items: center; gap: 10px; }
.branch-expression b { display: grid; min-width: 48px; height: 48px; place-items: center; border-radius: 7px; background: #eef2ff; color: #3730a3; font-size: 23px; }
.branch-expression i { color: #475569; font-size: 25px; font-style: normal; font-weight: 900; }
.branch-result { padding: 5px 11px; border-radius: 999px; font-size: 12px; }
.branch-result.waiting { background: #f1f5f9; color: #64748b; }
.branch-result.passed { background: #dcfce7; color: #15803d; }
.branch-result.failed { background: #fee2e2; color: #b91c1c; }
.branch-routes { display: grid; min-width: 0; grid-column: 1 / -1; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.branch-route { position: relative; display: grid; min-width: 0; place-content: center; gap: 5px; overflow: hidden; padding: 12px 16px 18px; color: #64748b; text-align: center; transition: opacity .25s ease, border-color .25s ease, background .25s ease, transform .25s ease; }
.branch-route .route-status { font-size: 12px; font-weight: 700; }
.branch-route b { color: #334155; font-size: 15px; }
.branch-route strong { font-size: 18px; }
.branch-route.pass strong { color: #15803d; }
.branch-route.retry strong { color: #b45309; }
.branch-route.waiting { background: #fff; }
.branch-route.skipped { opacity: .35; filter: grayscale(.35); }
.branch-route.active, .branch-route.completed { transform: translateY(-2px); }
.branch-route.pass.active, .branch-route.pass.completed { border-color: #22c55e; background: #f0fdf4; box-shadow: 0 8px 22px rgba(34, 197, 94, .13); }
.branch-route.retry.active, .branch-route.retry.completed { border-color: #f59e0b; background: #fffbeb; box-shadow: 0 8px 22px rgba(245, 158, 11, .13); }
.route-light { position: absolute; right: 0; bottom: 0; left: 0; height: 6px; background: #e2e8f0; }
.branch-route.pass.active .route-light { background: linear-gradient(90deg, #86efac, #16a34a, #86efac); background-size: 200% 100%; animation: route-flow 1.15s linear infinite; }
.branch-route.retry.active .route-light { background: linear-gradient(90deg, #fde68a, #f59e0b, #fde68a); background-size: 200% 100%; animation: route-flow 1.15s linear infinite; }
.branch-route.completed .route-light { background: #4f46e5; }
.branch-progress { display: flex; grid-column: 1 / -1; align-items: center; justify-content: center; gap: 9px; min-height: 44px; border-width: 1px; color: #475569; font-size: 13px; }
.progress-dot { width: 9px; height: 9px; border-radius: 50%; background: #6366f1; box-shadow: 0 0 0 5px rgba(99, 102, 241, .12); animation: status-pulse 1.4s ease-in-out infinite; }
.branch-progress.done .progress-dot { background: #22c55e; box-shadow: 0 0 0 5px rgba(34, 197, 94, .12); animation: none; }
@keyframes route-flow { to { background-position: -200% 0; } }
@keyframes status-pulse { 50% { transform: scale(.72); opacity: .58; } }
.memory-boxes-view { display: flex; flex-wrap: wrap; align-content: center; justify-content: center; gap: 18px; min-height: 140px; }.memory-box-wrap { display: grid; gap: 7px; justify-items: center; transition: .2s ease; }.memory-box { display: grid; width: 104px; height: 78px; place-items: center; border: 3px solid #94a3b8; border-radius: 7px; background: #f8fafc; box-shadow: inset 0 -16px 0 rgba(226, 232, 240, .55); }.memory-box b { color: #0f172a; font-family: Consolas, Monaco, monospace; font-size: 28px; }.memory-box-wrap > strong { color: #334155; font-family: Consolas, Monaco, monospace; font-size: 18px; }.memory-box-wrap.active { transform: translateY(-3px); }.memory-box-wrap.active .memory-box { border-color: #f59e0b; background: #fffbeb; box-shadow: 0 0 0 4px rgba(245, 158, 11, .18), inset 0 -16px 0 rgba(254, 243, 199, .75); }.memory-box-wrap.active .memory-box b, .memory-box-wrap.active > strong { color: #92400e; }.expression-chip { flex-basis: 100%; color: #4338ca; font-family: Consolas, Monaco, monospace; font-weight: 800; text-align: center; }
.for-loop-view { display: grid; min-height: 300px; flex: 1; align-content: center; gap: 14px; padding: 14px !important; background: #f8fafc; }
.loop-stages { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.loop-stage { display: flex; min-width: 0; align-items: center; justify-content: center; gap: 7px; padding: 10px 7px; border: 2px solid #dbe4f0; border-radius: 7px; background: #fff; color: #64748b; transition: .25s ease; }
.loop-stage small { display: grid; width: 21px; height: 21px; place-items: center; border-radius: 50%; background: #e2e8f0; font-weight: 800; }
.loop-stage.active { border-color: #6366f1; background: #eef2ff; color: #3730a3; transform: translateY(-2px); box-shadow: 0 7px 16px rgba(79, 70, 229, .12); }
.loop-stage.completed { border-color: #86efac; background: #f0fdf4; color: #15803d; }.loop-stage.failed { border-color: #fca5a5; background: #fff1f2; color: #b91c1c; }
.condition-screen { display: flex; align-items: center; justify-content: center; gap: 14px; min-height: 58px; padding: 9px 14px; border-radius: 7px; background: #172033; color: #fff; }
.condition-screen > span { color: #a5b4fc; font-size: 12px; }.condition-screen > strong { font: 800 22px/1 Consolas, monospace; }.condition-screen > b { padding: 5px 10px; border-radius: 999px; background: #334155; font-size: 12px; }.condition-screen > b.true { background: #166534; }.condition-screen > b.false { background: #991b1b; }
.iteration-track { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; }
.iteration-cell { display: grid; min-height: 74px; place-content: center; justify-items: center; gap: 1px; border: 2px solid #dbe4f0; border-radius: 7px; background: #fff; color: #94a3b8; transition: .25s ease; }.iteration-cell small { font: 700 11px Consolas, monospace; }.iteration-cell strong { color: #334155; font-size: 25px; }.iteration-cell span { font-size: 11px; }.iteration-cell.visited { border-color: #38bdf8; background: #f0f9ff; color: #0369a1; }.iteration-cell.current { border-color: #f59e0b; background: #fffbeb; transform: translateY(-3px); box-shadow: 0 7px 15px rgba(245, 158, 11, .16); }.iteration-cell.failed { border-color: #ef4444; background: #fff1f2; color: #b91c1c; }
.while-compare-view { display: grid; min-height: 300px; flex: 1; grid-template-columns: repeat(2, minmax(0, 1fr)); align-content: center; gap: 14px; padding: 14px !important; background: #f8fafc; }
.while-lane { display: grid; min-width: 0; gap: 14px; padding: 16px; border: 2px solid #dbe4f0; border-radius: 8px; background: #fff; transition: .25s ease; }.while-lane.active { border-color: #6366f1; background: #eef2ff; transform: translateY(-3px); box-shadow: 0 9px 22px rgba(79, 70, 229, .12); }.while-lane.do-lane.active { border-color: #0ea5e9; background: #f0f9ff; }
.while-lane header { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }.while-lane header strong { color: #312e81; font-size: 20px; }.while-lane header span { color: #64748b; font-size: 12px; }
.lane-order { display: flex; align-items: center; justify-content: center; gap: 8px; }.lane-order b { padding: 10px 8px; border-radius: 6px; background: #f1f5f9; color: #334155; font-size: 12px; text-align: center; }.lane-order i { color: #818cf8; font-style: normal; font-weight: 900; }.lane-result { display: grid; gap: 5px; padding: 10px; border-radius: 7px; background: #fff; color: #64748b; text-align: center; }.lane-result strong { color: #1e293b; }.lane-result span { font-size: 12px; }
.nested-loop-view { display: grid; min-height: 300px; flex: 1; align-content: center; gap: 12px; padding: 14px !important; background: #f8fafc; }.nested-axis, .nested-counters { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #64748b; font-size: 12px; }.nested-axis b { color: #4338ca; font-size: 15px; }.nested-counters span { padding: 6px 10px; border-radius: 999px; background: #eef2ff; color: #4338ca; font-weight: 700; }.nested-board { display: grid; gap: 9px; }.nested-cell { display: grid; min-height: 74px; place-content: center; justify-items: center; gap: 3px; border: 2px solid #cbd5e1; border-radius: 7px; background: #fff; color: #cbd5e1; transition: .25s ease; }.nested-cell small { color: #94a3b8; font: 11px Consolas, monospace; }.nested-cell strong { font-size: 26px; }.nested-cell.visited { border-color: #38bdf8; background: #f0f9ff; color: #0284c7; }.nested-cell.active { border-color: #f59e0b; background: #fffbeb; color: #d97706; transform: scale(1.04); box-shadow: 0 6px 15px rgba(245, 158, 11, .15); }
.flow-control-view { display: grid; min-height: 300px; flex: 1; align-content: center; gap: 18px; padding: 14px !important; background: #f8fafc; }.control-track { display: grid; grid-template-columns: repeat(6, 1fr); gap: 7px; }.control-cell { position: relative; display: grid; min-width: 0; min-height: 76px; place-content: center; justify-items: center; gap: 4px; border: 2px solid #dbe4f0; border-radius: 7px; background: #fff; color: #94a3b8; transition: .25s ease; }.control-cell small { font: 700 11px Consolas, monospace; }.control-cell strong { font-size: 13px; }.control-cell.output { border-color: #22c55e; background: #f0fdf4; color: #15803d; }.control-cell.continue { border-color: #38bdf8; background: #f0f9ff; color: #0369a1; }.control-cell.break { border-color: #ef4444; background: #fff1f2; color: #b91c1c; }.control-cell.blocked { opacity: .42; background: #e2e8f0; text-decoration: line-through; }.control-cell.current { transform: translateY(-5px); box-shadow: 0 8px 18px rgba(15, 23, 42, .14); }.control-action { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 56px; padding: 11px 16px; border-radius: 7px; background: #eef2ff; color: #4338ca; }.control-action span { color: #475569; font-size: 12px; }.control-action.continue { background: #e0f2fe; color: #0369a1; }.control-action.break { background: #fee2e2; color: #b91c1c; }
.matrix-view { display: grid; gap: 7px; align-content: center; min-height: 156px; }.matrix-cell { display: grid; min-height: 52px; place-items: center; border: 1px solid #cbd5e1; border-radius: 7px; color: #64748b; font-weight: 700; }.matrix-cell.visited { background: #e0f2fe; border-color: #38bdf8; color: #0369a1; }.matrix-cell.active { background: #fef3c7; border-color: #f59e0b; color: #92400e; box-shadow: 0 0 0 2px rgba(245, 158, 11, .2); }
.cells-view { display: grid; gap: 8px; align-content: center; min-height: 150px; }.cells-label { color: #64748b; font-size: 13px; }.cell-row { display: flex; gap: 7px; min-width: 0; }.data-cell { display: grid; min-width: 56px; flex: 1; min-height: 70px; place-items: center; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; color: #334155; }.data-cell small { color: #94a3b8; }.data-cell.active { border-color: #f59e0b; background: #fffbeb; color: #92400e; }.data-cell.shifted { border-color: #38bdf8; background: #f0f9ff; }.data-cell.error { border-color: #ef4444; background: #fff1f2; color: #be123c; }.empty-container-state { display: grid; width: 100%; min-height: 70px; place-items: center; border: 2px dashed #cbd5e1; border-radius: 7px; background: #f8fafc; color: #64748b; font-weight: 700; }
.string-ops-view { display: grid; min-height: 300px; flex: 1; grid-template-columns: 150px minmax(0, 1fr); align-items: center; gap: 16px; padding: 14px !important; background: #f8fafc; }.string-operation { display: grid; gap: 8px; padding: 18px 12px; border-radius: 8px; background: #172033; color: #fff; text-align: center; }.string-operation span { color: #a5b4fc; font-size: 12px; }.string-operation strong { overflow-wrap: anywhere; font: 800 15px/1.45 Consolas, monospace; }.string-compare { display: grid; min-width: 0; gap: 6px; }.string-line { display: grid; gap: 6px; }.string-line > span { color: #64748b; font-size: 12px; font-weight: 700; }.string-cells { display: flex; min-width: 0; gap: 6px; }.string-cells > em { padding: 16px; color: #94a3b8; font-style: normal; }.string-cell { display: grid; min-width: 45px; min-height: 58px; flex: 1; place-items: center; border: 2px solid #cbd5e1; border-radius: 6px; background: #fff; color: #334155; transition: .25s ease; }.string-cell small { color: #94a3b8; font-size: 10px; }.string-cell b { font: 800 19px Consolas, monospace; }.string-cell.removed { border-color: #fca5a5; background: #fff1f2; color: #b91c1c; text-decoration: line-through; opacity: .65; }.string-cell.active { border-color: #22c55e; background: #f0fdf4; color: #15803d; transform: translateY(-2px); }.string-arrow { color: #6366f1; font-size: 20px; font-weight: 900; text-align: center; }
.input-view, .frames-view, .scopes-view { display: grid; gap: 10px; align-content: center; min-height: 150px; }.input-view > div, .frame-card, .scope-box { display: flex; gap: 8px; justify-content: space-between; padding: 11px 12px; border: 1px solid #cbd5e1; border-radius: 7px; }.input-view small { color: #64748b; }.input-view b { overflow: hidden; color: #4338ca; text-overflow: ellipsis; white-space: nowrap; }.frame-card { display: grid; gap: 5px; background: #f8fafc; }.frame-card strong { color: #4338ca; }.frame-card span, .scope-box span { color: #475569; font-family: Consolas, monospace; }.scope-box { display: grid; }.scope-box.active { border-color: #818cf8; background: #eef2ff; }.scope-box strong { color: #334155; }
.memory-view { display: grid; justify-items: center; gap: 14px; min-height: 150px; align-content: center; }.memory-slot { display: grid; min-width: 170px; gap: 5px; padding: 14px; border: 2px solid #38bdf8; border-radius: 8px; background: #f0f9ff; text-align: center; }.memory-slot small { color: #64748b; }.memory-slot b { color: #0369a1; font-size: 19px; }.memory-arrow { color: #4f46e5; font-weight: 800; }.memory-reference { padding: 8px 12px; border-radius: 999px; background: #f5f3ff; color: #6d28d9; font-size: 13px; }
.record-view { display: grid; gap: 10px; align-content: center; min-height: 150px; }.record-view > strong { color: #4338ca; font-size: 18px; }.record-view > div { display: flex; justify-content: space-between; padding: 12px; border: 1px solid #cbd5e1; border-radius: 7px; }.record-view > div.active { border-color: #f59e0b; background: #fffbeb; }.record-view span { color: #64748b; }.record-view b { color: #1e293b; }.variable-placeholder { display: grid; min-height: 130px; place-items: center; color: #94a3b8; }
.digit-separation-view { display: grid; min-height: 300px; flex: 1; grid-template-columns: minmax(0, 1fr) 180px; align-content: center; gap: 16px; padding: 16px !important; background: #f8fafc; }.digit-number-group { display: grid; gap: 10px; justify-items: center; }.digit-number-group > span, .digit-results > span { color: #64748b; font-size: 12px; font-weight: 700; }.digit-number { display: flex; gap: 8px; }.digit-number b, .digit-results b { display: grid; width: 58px; height: 68px; place-items: center; border: 2px solid #cbd5e1; border-radius: 7px; background: #fff; color: #1e293b; font: 800 28px Consolas, monospace; transition: .25s ease; }.digit-number b.active { border-color: #f59e0b; background: #fffbeb; color: #b45309; transform: translateY(-4px); box-shadow: 0 7px 16px rgba(245, 158, 11, .16); }.digit-calculation { display: grid; min-height: 100px; place-content: center; gap: 7px; padding: 12px; border-radius: 8px; background: #172033; color: #fff; text-align: center; }.digit-calculation small { color: #a5b4fc; }.digit-calculation strong { font: 800 19px Consolas, monospace; }.digit-calculation.extract { box-shadow: inset 0 -6px #f59e0b; }.digit-calculation.divide, .digit-calculation.done { box-shadow: inset 0 -6px #38bdf8; }.digit-results { display: grid; grid-column: 1 / -1; gap: 8px; }.digit-results > div { display: flex; min-height: 66px; align-items: center; gap: 9px; }.digit-results b { width: 48px; height: 58px; border-color: #38bdf8; background: #f0f9ff; color: #0369a1; }.digit-results em { color: #94a3b8; font-style: normal; }
.common-functions-view { display: grid; min-height: 300px; flex: 1; grid-template-columns: repeat(3, minmax(0, 1fr)); align-content: center; gap: 9px; padding: 14px !important; background: #f8fafc; }.function-result-card { display: grid; min-width: 0; min-height: 82px; align-content: center; gap: 4px; padding: 9px 11px; border: 2px solid #cbd5e1; border-radius: 7px; background: #fff; transition: .25s ease; }.function-result-card span { color: #64748b; font-size: 11px; }.function-result-card strong { overflow-wrap: anywhere; color: #334155; font: 700 13px Consolas, monospace; }.function-result-card b { color: #0f766e; font: 800 20px Consolas, monospace; }.function-result-card.waiting { opacity: .5; }.function-result-card.active { border-color: #f59e0b; background: #fffbeb; transform: translateY(-3px); box-shadow: 0 7px 16px rgba(245, 158, 11, .14); }.function-result-card.active b { color: #b45309; }
.console-card pre { min-height: 50px; margin: 0; padding: 9px 12px; background: #0f172a; color: #a7f3d0; font: 13px/1.45 Consolas, Monaco, monospace; }
.syntax-controls { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 12px 0 0; }.syntax-controls button { display: grid; width: 38px; height: 34px; place-items: center; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; color: #475569; font-size: 16px; cursor: pointer; }.syntax-controls button.playing, .syntax-controls button:nth-child(2) { background: #4f46e5; border-color: #4f46e5; color: #fff; }.syntax-controls button:disabled { opacity: .45; cursor: not-allowed; }.syntax-controls label { display: flex; align-items: center; gap: 6px; margin-left: 6px; color: #64748b; font-size: 12px; }.syntax-controls select { padding: 5px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; color: #334155; font: inherit; }
@media (max-width: 1320px) { .syntax-tabs { grid-template-columns: repeat(9, minmax(0, 1fr)); } }
@media (max-width: 980px) { .syntax-panel { padding: 16px; }.syntax-header { align-items: stretch; flex-direction: column; }.syntax-header p { display: block; }.syntax-tabs { display: flex; width: 100%; flex: none; flex-wrap: wrap; }.syntax-tabs button { width: auto; padding: 7px 9px; font-size: 13px; }.syntax-stage { grid-template-columns: 1fr; }.syntax-summary { align-items: flex-start; flex-direction: column; }.branch-input { margin-left: 0; }.code-card pre { min-height: 210px; }.state-card { min-height: 280px; } }
@media (max-width: 560px) { .syntax-header h2 { font-size: 23px; }.syntax-tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); }.syntax-tabs button { font-size: 12px; }.branch-view, .while-compare-view, .string-ops-view { grid-template-columns: 1fr; }.branch-gate { order: -1; }.loop-stages { grid-template-columns: repeat(2, 1fr); }.control-track { grid-template-columns: repeat(3, 1fr); }.data-cell, .string-cell { min-width: 40px; }.syntax-controls label { margin-left: 0; }.syntax-controls { flex-wrap: wrap; } }
</style>
