<template>
  <main class="visualizer-panel">
    <header class="visualizer-header">
      <div>
        <h2>🎞️ 算法可视化</h2>
        <p>把每一步看清楚，再把算法装进脑袋里。</p>
      </div>
      <div class="algorithm-tabs" role="tablist" aria-label="选择算法">
        <button
          v-for="item in algorithms"
          :key="item.id"
          :class="{ active: algorithm === item.id }"
          @click="selectAlgorithm(item.id)"
        >{{ item.icon }} {{ item.name }}</button>
      </div>
    </header>

    <section class="visualizer-controls">
      <label v-if="algorithm === 'recursion'">计算阶乘 n!
        <input v-model.number="recursionN" type="number" min="1" max="8" @change="reset" />
      </label>
      <label v-else-if="algorithm === 'binary'">查找目标值
        <input v-model.number="binaryTarget" type="number" min="1" max="15" @change="reset" />
      </label>
      <label v-else-if="algorithm === 'bubble'">待排序数字
        <input v-model="bubbleInput" @change="reset" />
      </label>
      <span v-else class="control-hint">{{ algorithm === 'dfs' ? '本演示用 DFS 寻找任意出口：找到终点即结束，不比较最短路径。' : '固定迷宫，观察 BFS 如何一层层向外探索。' }}</span>
      <button class="reset-button" @click="reset">↺ 重置演示</button>
    </section>

    <section class="step-banner" :class="algorithm">
      <span class="step-count">第 {{ stepIndex + 1 }} / {{ steps.length }} 步</span>
      <span v-if="algorithm === 'dfs' && currentStep.backtracks" class="backtrack-count">已回溯 {{ currentStep.backtracks }} 次</span>
      <strong>{{ currentStep.title }}</strong>
      <p>{{ currentStep.message }}</p>
    </section>

    <section class="visual-stage">
      <div v-if="algorithm === 'recursion'" class="recursion-stage">
        <section class="recursion-lane call-lane">
          <div class="lane-heading"><strong>① 向下调用：把问题变小</strong><span>n 每次减 1</span></div>
          <div v-if="currentStep.stack?.length" class="call-chain">
            <template v-for="(call, index) in currentStep.stack" :key="call">
              <div class="call-node" :class="{ active: index === currentStep.stack.length - 1, base: call === 1 }" :style="{ transform: `translateY(${index * 10}px)` }">
                <strong>fact({{ call }})</strong>
                <span>{{ call === 1 ? '终止：返回 1' : `等待 fact(${call - 1})` }}</span>
              </div>
              <span v-if="index < currentStep.stack.length - 1" class="call-arrow">→</span>
            </template>
          </div>
          <div v-else class="empty-lane">从 fact({{ recursionN }}) 开始。</div>
          <div class="formula-strip"><span>当前展开式</span><strong>{{ recursionExpression }}</strong></div>
        </section>

        <section class="recursion-lane return-lane">
          <div class="lane-heading"><strong>② 向上返回：把结果带回来</strong><span>从 n = 1 开始计算</span></div>
          <div v-if="currentStep.completed?.length" class="return-chain">
            <template v-for="(item, index) in currentStep.completed" :key="item.n">
              <div class="return-node" :class="{ active: index === currentStep.completed.length - 1 }">
                <strong>fact({{ item.n }}) = {{ item.answer }}</strong>
                <span>{{ item.n === 1 ? '终止条件' : `${item.n} × ${item.answer / item.n}` }}</span>
              </div>
              <span v-if="index < currentStep.completed.length - 1" class="return-arrow">→</span>
            </template>
          </div>
          <div v-else class="empty-lane">还没到终止条件，结果暂时无法返回。</div>
          <div class="return-summary">{{ currentStep.phase === 'done' ? `最终答案：${recursionN}! = ${currentStep.value}` : '先一路向下，抵达终止条件后再向上返回。' }}</div>
        </section>
      </div>

      <div v-else-if="algorithm === 'binary'" class="binary-stage">
        <div class="number-row">
          <div v-for="(value, index) in binaryArray" :key="value" class="number-cell" :class="binaryCellClass(index)">
            <small>{{ index + 1 }}</small><strong>{{ value }}</strong>
          </div>
        </div>
        <div class="binary-arrows" aria-label="left、mid 和 right 指针位置">
          <div v-for="(_, index) in binaryArray" :key="index" class="arrow-cell">
            <span v-if="index === currentStep.left" class="left-arrow">↑ left</span>
            <span v-if="index === currentStep.mid" class="mid-arrow">↑ mid</span>
            <span v-if="index === currentStep.right" class="right-arrow">↑ right</span>
          </div>
        </div>
        <div class="pointer-row"><span>left = {{ displayIndex(currentStep.left) }}</span><span>mid = {{ displayIndex(currentStep.mid) }}</span><span>right = {{ displayIndex(currentStep.right) }}</span></div>
      </div>

      <div v-else-if="algorithm === 'bubble'" class="bubble-stage">
        <div class="bar-row">
          <div v-for="(value, index) in currentStep.array" :key="`${value}-${index}`" class="bar-wrap">
            <div class="bar" :class="{ comparing: currentStep.compare?.includes(index), sorted: currentStep.sorted?.includes(index) }" :style="{ height: `${value * 24 + 18}px` }"><span>{{ value }}</span></div>
          </div>
        </div>
      </div>

      <div v-else-if="algorithm === 'bfs' || algorithm === 'dfs'" class="bfs-stage">
        <div class="maze-grid">
          <div v-for="(cell, index) in bfsCells" :key="index" class="maze-cell" :class="mazeCellClass(index)">
            <span v-if="index === bfsStart">起</span><span v-else-if="index === bfsEnd">终</span><span v-else-if="mazeWalls.includes(index)">■</span>
          </div>
        </div>
        <div class="maze-legend"><span class="legend-start">起点</span><span class="legend-wall">墙</span><span class="legend-visited">已访问</span><span class="legend-frontier">{{ algorithm === 'dfs' ? '准备深入' : '刚入队' }}</span><span class="legend-active">当前格</span><span v-if="algorithm === 'dfs'" class="legend-backtracked">刚回溯离开</span><span class="legend-path">{{ algorithm === 'dfs' ? '当前/最终路径' : '最短路径' }}</span></div>
        <div class="queue-label"><strong>{{ algorithm === 'dfs' ? '当前递归栈' : '当前队列' }}</strong><span v-if="!worklist.length">空</span><div v-else><i v-for="cell in worklist" :key="cell">{{ formatCell(cell) }}</i></div></div>
      </div>
    </section>

    <footer class="playback-bar">
      <button title="上一步" :disabled="stepIndex === 0" @click="previous">←</button>
      <button class="play-button" :title="playing ? '暂停' : '自动播放'" @click="togglePlay">{{ playing ? 'Ⅱ' : '▶' }}</button>
      <button title="下一步" :disabled="stepIndex === steps.length - 1" @click="next">→</button>
      <div class="progress"><span :style="{ width: `${((stepIndex + 1) / steps.length) * 100}%` }"></span></div>
    </footer>

    <section class="learning-note">
      <strong>本节抓住：</strong>{{ learningNotes[algorithm] }}
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';

const algorithms = [
  { id: 'recursion', icon: '🪜', name: '递归回溯' },
  { id: 'binary', icon: '🔎', name: '二分查找' },
  { id: 'bubble', icon: '↔️', name: '冒泡排序' },
  { id: 'bfs', icon: '🗺️', name: 'BFS 走迷宫' },
  { id: 'dfs', icon: '🧭', name: 'DFS 走迷宫' },
];
const learningNotes = {
  recursion: '每一次调用都会先压入调用栈；到达终止条件后，结果才会一层层返回。',
  binary: '每次比较中点后都能排除一半区间，所以有序是二分查找的前提。',
  bubble: '相邻元素比较并交换，大元素会像气泡一样逐渐移到右边。',
  bfs: '队列保证先到达距离更近的位置，因此 BFS 能找到无权图的最短步数。',
  dfs: '本演示的目标是找到任意一个迷宫出口：DFS 会优先一路深入，遇到死路再回溯；第一次到达终点便完成。',
};
const binaryArray = [1, 3, 5, 7, 9, 11, 13, 15];
const bfsWalls = [2, 7, 8, 14, 20, 21, 22];
const dfsWalls = [7, 8, 11, 14, 20, 22, 23];
const bfsStart = 0;
const bfsEnd = 29;
const bfsCells = Array.from({ length: 30 }, (_, index) => index);

const algorithm = ref('recursion');
const recursionN = ref(4);
const binaryTarget = ref(15);
const bubbleInput = ref('5, 2, 4, 1, 3');
const stepIndex = ref(0);
const playing = ref(false);
let timer;

const steps = computed(() => {
  if (algorithm.value === 'recursion') return recursionSteps(recursionN.value);
  if (algorithm.value === 'binary') return binarySteps(binaryTarget.value);
  if (algorithm.value === 'bubble') return bubbleSteps(bubbleInput.value);
  if (algorithm.value === 'bfs') return bfsSteps();
  return dfsSteps();
});
const currentStep = computed(() => steps.value[Math.min(stepIndex.value, steps.value.length - 1)] || {});
const recursionExpression = computed(() => {
  const stack = currentStep.value.stack || [];
  if (!stack.length) return currentStep.value.phase === 'done' ? `${recursionN.value}! = ${currentStep.value.value}` : `fact(${recursionN.value})`;
  if (currentStep.value.phase === 'return') return `fact(${stack.at(-1)}) = ${currentStep.value.value}`;
  const factors = stack.slice(0, -1);
  const active = stack.at(-1);
  return active === 1 ? `${factors.join(' × ')} × 1` : `${factors.length ? `${factors.join(' × ')} × ` : ''}fact(${active})`;
});
const worklist = computed(() => algorithm.value === 'dfs' ? (currentStep.value.stack || []) : (currentStep.value.queue || []));
const mazeWalls = computed(() => algorithm.value === 'dfs' ? dfsWalls : bfsWalls);

function recursionSteps(n) {
  const safeN = Math.max(1, Math.min(8, Number(n) || 1));
  const result = [{ title: `准备计算 ${safeN}!`, message: '先一路向下，把 n 变小；到 n = 1 后，再把结果逐层带回来。', stack: [], completed: [], phase: 'start' }];
  const stack = [];
  const completed = [];
  function visit(value) {
    stack.push(value);
    result.push({ title: `调用 fact(${value})`, message: value === 1 ? '到达终止条件，准备返回 1。' : `把问题从 ${value}! 缩小成 ${value - 1}!。`, stack: [...stack], completed: [...completed], phase: 'call' });
    const answer = value === 1 ? 1 : value * visit(value - 1);
    const item = { n: value, answer };
    result.push({ title: `fact(${value}) 返回 ${answer}`, message: value === 1 ? '终止条件给出 1，结果开始向上返回。' : `拿到 ${value - 1}! = ${answer / value}，计算 ${value} × ${answer / value} = ${answer}。`, stack: [...stack], completed: [...completed, item], phase: 'return', value: answer });
    completed.push(item);
    stack.pop();
    return answer;
  }
  const answer = visit(safeN);
  result.push({ title: `得到最终答案 ${safeN}! = ${answer}`, message: '最后一层也返回了，完整的递归过程结束。', stack: [], completed: [...completed], phase: 'done', value: answer });
  return result;
}

function binarySteps(target) {
  const result = [];
  let left = 0;
  let right = binaryArray.length - 1;
  const safeTarget = Number(target);
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    result.push({ title: `查看中点 ${binaryArray[mid]}`, message: `比较目标 ${safeTarget} 和中点 ${binaryArray[mid]}。`, left, mid, right, target: safeTarget });
    if (binaryArray[mid] === safeTarget) {
      result.push({ title: '查找成功', message: `${safeTarget} 位于下标 ${mid + 1}。`, left, mid, right, target: safeTarget, found: true });
      return result;
    }
    if (safeTarget < binaryArray[mid]) {
      right = mid - 1;
      result.push({ title: '目标更小，缩小右边界', message: `${safeTarget} 小于 ${binaryArray[mid]}，排除中点及右半部分，right 移到下标 ${right + 1}。`, left, mid, right, target: safeTarget });
    } else {
      left = mid + 1;
      result.push({ title: '目标更大，缩小左边界', message: `${safeTarget} 大于 ${binaryArray[mid]}，排除中点及左半部分，left 移到下标 ${left + 1}。`, left, mid, right, target: safeTarget });
    }
  }
  result.push({ title: '查找结束', message: `${safeTarget} 不在这个有序数组中。`, left, mid: -1, right, target: safeTarget, found: false });
  return result;
}

function bubbleSteps(input) {
  const array = input.split(',').map(value => Number(value.trim())).filter(value => Number.isFinite(value)).slice(0, 8);
  const values = array.length > 1 ? array : [5, 2, 4, 1, 3];
  const result = [{ title: '开始冒泡排序', message: '每次只比较相邻两个数。', array: [...values], compare: [], sorted: [] }];
  for (let end = values.length - 1; end > 0; end -= 1) {
    for (let index = 0; index < end; index += 1) {
      const shouldSwap = values[index] > values[index + 1];
      if (shouldSwap) [values[index], values[index + 1]] = [values[index + 1], values[index]];
      result.push({ title: shouldSwap ? '交换相邻元素' : '不需要交换', message: `${values[index]} 和 ${values[index + 1]} ${shouldSwap ? '已按从小到大交换' : '顺序正确'}。`, array: [...values], compare: [index, index + 1], sorted: Array.from({ length: values.length - end }, (_, i) => values.length - 1 - i) });
    }
  }
  result.push({ title: '排序完成', message: '所有数字已经从小到大排列。', array: [...values], compare: [], sorted: values.map((_, index) => index) });
  return result;
}

function bfsSteps() {
  const result = [{ title: '从起点入队', message: 'BFS 先访问起点，再按距离一层层扩展。', visited: [bfsStart], frontier: [bfsStart], active: null, queue: [bfsStart], path: [] }];
  const queue = [bfsStart];
  const visited = new Set(queue);
  const parent = new Map();
  const directions = [[-1, 0], [0, 1], [1, 0], [0, -1]];

  while (queue.length) {
    const active = queue.shift();
    const row = Math.floor(active / 6);
    const col = active % 6;
    const frontier = [];
    for (const [rowOffset, colOffset] of directions) {
      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      const next = nextRow * 6 + nextCol;
      if (nextRow < 0 || nextRow >= 5 || nextCol < 0 || nextCol >= 6 || bfsWalls.includes(next) || visited.has(next)) continue;
      visited.add(next);
      parent.set(next, active);
      queue.push(next);
      frontier.push(next);
    }
    result.push({
      title: active === bfsEnd ? '从队首取出终点' : `处理 ${formatCell(active)}`,
      message: frontier.length ? `发现 ${frontier.map(formatCell).join('、')}，依次加入队尾。` : '四周没有新的可走位置，继续处理队首。',
      visited: [...visited], frontier, active, queue: [...queue], path: [],
    });
    if (active === bfsEnd) {
      const path = [];
      for (let cell = bfsEnd; cell !== undefined; cell = parent.get(cell)) path.unshift(cell);
      result.push({ title: `找到最短路径，共 ${path.length - 1} 步`, message: 'BFS 第一次到达终点时，得到的就是最短路径。', visited: [...visited], frontier: [], active: null, queue: [], path });
      break;
    }
  }
  return result;
}

function dfsSteps() {
  const result = [{ title: '从起点开始递归', message: '目标是找到任意出口。DFS 会优先一路深入，遇到死路再回溯。', visited: [], frontier: [bfsStart], active: null, stack: [], path: [], backtracks: 0 }];
  const visited = new Set();
  const stack = [];
  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  let backtracks = 0;

  function state(extra = {}) {
    return {
      visited: [...visited],
      stack: [...stack],
      path: [],
      backtracks,
      ...extra,
    };
  }

  function visit(active) {
    visited.add(active);
    stack.push(active);
    const from = stack.at(-2);
    result.push({
      title: `进入 ${formatCell(active)}`,
      message: from === undefined ? '压入递归栈，继续尝试尚未访问的相邻格。' : `从 ${formatCell(from)} 深入到这里，压入递归栈。`,
      ...state({ frontier: [], active }),
    });
    if (active === bfsEnd) {
      result.push({ title: '找到迷宫出口！', message: '已经到达终点，DFS 找出口演示完成。注意：这不是最短路径算法。', ...state({ frontier: [], active }) });
      return true;
    }
    const row = Math.floor(active / 6);
    const col = active % 6;
    for (const [rowOffset, colOffset] of directions) {
      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      const next = nextRow * 6 + nextCol;
      if (nextRow < 0 || nextRow >= 5 || nextCol < 0 || nextCol >= 6 || dfsWalls.includes(next) || visited.has(next)) continue;
      if (visit(next)) return true;
    }
    const leaving = stack.pop();
    if (stack.length) {
      backtracks += 1;
      result.push({ title: `死路回溯到 ${formatCell(stack.at(-1))}`, message: `${formatCell(leaving)} 的所有方向都已尝试，返回上一个岔路口。`, ...state({ frontier: [], active: stack.at(-1), backtracked: leaving }) });
    }
    return false;
  }

  const found = visit(bfsStart);
  result.push(found
    ? { title: '出口已找到', message: `绿色标出从起点到出口的路线，共走了 ${stack.length - 1} 步。`, ...state({ frontier: [], active: null }) }
    : { title: '没有找到通路', message: '递归栈已清空，所有可走位置都被尝试过。', ...state({ frontier: [], active: null }) });
  return result;
}

function selectAlgorithm(id) { algorithm.value = id; reset(); }
function reset() { stop(); stepIndex.value = 0; }
function next() { if (stepIndex.value < steps.value.length - 1) stepIndex.value += 1; else stop(); }
function previous() { if (stepIndex.value > 0) stepIndex.value -= 1; }
function togglePlay() { playing.value ? stop() : start(); }
function start() { playing.value = true; timer = setInterval(next, 900); }
function stop() { playing.value = false; clearInterval(timer); }
function binaryCellClass(index) {
  if (currentStep.value.found && index === currentStep.value.mid) return 'found';
  if (index === currentStep.value.mid) return 'mid';
  if (index < currentStep.value.left || index > currentStep.value.right) return 'discarded';
  return '';
}
function displayIndex(index) { return index >= 0 && index < binaryArray.length ? index + 1 : '无'; }
function mazeCellClass(index) {
  if (mazeWalls.value.includes(index)) return 'wall';
  if (index === currentStep.value.backtracked) return 'backtracked';
  if (index === currentStep.value.active) return 'active';
  if (algorithm.value === 'dfs' && currentStep.value.stack?.includes(index)) return 'path';
  if (currentStep.value.path?.includes(index)) return 'path';
  if (currentStep.value.frontier?.includes(index)) return 'frontier';
  if (currentStep.value.visited?.includes(index)) return 'visited';
  return '';
}
function formatCell(index) { return `(${Math.floor(index / 6) + 1}, ${index % 6 + 1})`; }

onBeforeUnmount(stop);
</script>

<style scoped>
.visualizer-panel { flex: 1; overflow-y: auto; padding: 24px; background: #f8fafc; }
.visualizer-header, .visualizer-controls, .step-banner, .visual-stage, .playback-bar, .learning-note { max-width: 1040px; margin: 0 auto; }
.visualizer-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 18px; }
.visualizer-header h2 { margin: 0; color: #1e293b; font-size: 24px; }
.visualizer-header p { margin: 6px 0 0; color: #64748b; }
.algorithm-tabs { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.algorithm-tabs button, .visualizer-controls button, .playback-bar button { border: 1px solid #cbd5e1; background: #fff; color: #334155; border-radius: 6px; cursor: pointer; font: inherit; }
.algorithm-tabs button { padding: 9px 12px; }
.algorithm-tabs button.active { background: #4f46e5; border-color: #4f46e5; color: #fff; }
.visualizer-controls { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.visualizer-controls label { display: flex; align-items: center; gap: 8px; color: #475569; font-weight: 600; }
.visualizer-controls input { width: 170px; padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font: inherit; }
.control-hint { color: #64748b; font-size: 14px; }
.reset-button { margin-left: auto; padding: 9px 12px; }
.step-banner { border-left: 4px solid #4f46e5; background: #fff; padding: 14px 18px; border-radius: 6px; box-shadow: 0 4px 14px rgba(15, 23, 42, .05); }
.step-count { display: inline-block; margin-right: 10px; color: #4f46e5; font-size: 13px; font-weight: 700; }
.step-banner strong { color: #1e293b; }.backtrack-count { display: inline-block; margin-right: 10px; color: #dc2626; font-size: 13px; font-weight: 700; }
.step-banner p { margin: 5px 0 0; color: #64748b; }
.visual-stage { min-height: 350px; margin-top: 16px; padding: 24px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
.recursion-stage { display: grid; gap: 18px; }.recursion-lane { overflow: hidden; padding: 18px; border: 1px solid #dbe4f0; border-radius: 8px; background: #fff; }.call-lane { background: #f5f7ff; }.return-lane { background: #f0fdf7; }.lane-heading { display: flex; justify-content: space-between; gap: 12px; color: #1e293b; font-size: 17px; }.lane-heading span { color: #64748b; font-size: 14px; }.call-chain, .return-chain { display: flex; min-height: 108px; align-items: center; justify-content: center; margin: 10px 0 12px; }.call-node, .return-node { min-width: 94px; padding: 12px 8px; border: 2px solid #c7d2fe; border-radius: 6px; background: #fff; text-align: center; transition: transform .25s, border-color .25s, background .25s; }.call-node strong, .call-node span, .return-node strong, .return-node span { display: block; }.call-node strong, .return-node strong { color: #1e293b; font-size: 17px; }.call-node span, .return-node span { margin-top: 4px; color: #64748b; font-size: 12px; }.call-node.active { border-color: #4f46e5; background: #e0e7ff; }.call-node.base { border-color: #f59e0b; background: #fffbeb; }.return-node { border-color: #86efac; }.return-node.active { border-color: #10b981; background: #d1fae5; }.call-arrow, .return-arrow { flex: 0 0 20px; color: #64748b; font-size: 24px; text-align: center; }.return-arrow { color: #10b981; }.empty-lane { display: grid; min-height: 90px; place-items: center; color: #94a3b8; }.formula-strip, .return-summary { padding: 10px 12px; border-radius: 6px; background: rgba(255, 255, 255, .8); color: #475569; }.formula-strip span { margin-right: 12px; color: #4f46e5; font-size: 13px; font-weight: 700; }.formula-strip strong { color: #312e81; font: 700 19px Consolas, monospace; }.return-summary { color: #047857; font-weight: 700; }
.binary-stage { display: flex; min-height: 290px; flex-direction: column; justify-content: center; gap: 34px; }
.number-row { display: grid; grid-template-columns: repeat(8, minmax(46px, 1fr)); gap: 8px; }
.number-cell { padding: 10px 6px; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; }
.number-cell small, .number-cell strong { display: block; }.number-cell small { color: #94a3b8; }.number-cell strong { color: #1e293b; font-size: 20px; }
.number-cell.mid { border-color: #f59e0b; background: #fffbeb; }.number-cell.found { border-color: #22c55e; background: #dcfce7; }.number-cell.discarded { opacity: .3; }
.binary-arrows { display: grid; grid-template-columns: repeat(8, minmax(46px, 1fr)); gap: 8px; margin-top: -18px; min-height: 54px; }.arrow-cell { display: flex; align-items: center; flex-direction: column; justify-content: flex-start; min-width: 0; }.arrow-cell span { white-space: nowrap; font-size: 18px; font-weight: 800; line-height: 1.25; }.left-arrow { color: #2563eb; }.mid-arrow { color: #d97706; }.right-arrow { color: #dc2626; }.pointer-row { display: flex; justify-content: center; gap: 32px; color: #334155; font-size: 20px; font-weight: 800; }
.bubble-stage { display: flex; min-height: 290px; align-items: end; justify-content: center; }.bar-row { display: flex; min-height: 260px; align-items: end; gap: 18px; }
.bar-wrap { display: flex; align-items: end; }.bar { display: flex; width: 60px; justify-content: center; align-items: flex-start; padding-top: 8px; background: #818cf8; border-radius: 6px 6px 0 0; color: #fff; transition: height .25s, background .25s; }.bar.comparing { background: #f59e0b; }.bar.sorted { background: #34d399; }
.bfs-stage { display: flex; min-height: 290px; align-items: center; flex-direction: column; justify-content: center; }.maze-grid { display: grid; grid-template-columns: repeat(6, 48px); gap: 5px; }.maze-cell { height: 48px; display: grid; place-items: center; border: 1px solid #cbd5e1; border-radius: 5px; background: #fff; color: #fff; font-size: 12px; transition: background .2s, border-color .2s; }.maze-cell.wall { background: #334155; border-color: #334155; }.maze-cell.visited { background: #bfdbfe; border-color: #60a5fa; }.maze-cell.frontier { background: #c4b5fd; border-color: #8b5cf6; }.maze-cell.active { background: #fbbf24; border-color: #f59e0b; }.maze-cell.backtracked { background: #fca5a5; border-color: #ef4444; }.maze-cell.path { background: #34d399; border-color: #10b981; }.maze-cell:first-child { background: #34d399; border-color: #10b981; }.maze-cell:nth-child(30) { background: #fb7185; border-color: #e11d48; }.maze-legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 12px; margin-top: 16px; color: #64748b; font-size: 12px; }.maze-legend span::before { content: ''; display: inline-block; width: 10px; height: 10px; margin-right: 4px; border-radius: 2px; background: #34d399; }.maze-legend .legend-wall::before { background: #334155; }.maze-legend .legend-visited::before { background: #bfdbfe; }.maze-legend .legend-frontier::before { background: #c4b5fd; }.maze-legend .legend-active::before { background: #fbbf24; }.maze-legend .legend-backtracked::before { background: #fca5a5; }.maze-legend .legend-path::before { background: #34d399; }.queue-label { display: flex; align-items: center; gap: 8px; margin: 18px 0 0; color: #64748b; font-size: 14px; }.queue-label strong { color: #334155; }.queue-label div { display: flex; flex-wrap: wrap; gap: 6px; }.queue-label i { padding: 3px 7px; border-radius: 999px; background: #eef2ff; color: #4f46e5; font-style: normal; }
.playback-bar { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 18px; }.playback-bar button { width: 40px; height: 36px; font-size: 18px; }.playback-bar button:disabled { opacity: .35; cursor: default; }.playback-bar .play-button { background: #4f46e5; border-color: #4f46e5; color: #fff; }.progress { width: min(350px, 40%); height: 6px; overflow: hidden; border-radius: 999px; background: #e2e8f0; }.progress span { display: block; height: 100%; background: #4f46e5; transition: width .2s; }
.learning-note { margin-top: 18px; padding: 14px 18px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; color: #92400e; }
@media (max-width: 760px) { .visualizer-panel { padding: 16px; }.visualizer-header, .visualizer-controls { align-items: stretch; flex-direction: column; }.algorithm-tabs { justify-content: flex-start; }.reset-button { margin-left: 0; }.lane-heading { align-items: flex-start; flex-direction: column; }.call-chain, .return-chain { justify-content: flex-start; overflow-x: auto; padding-bottom: 8px; }.call-node, .return-node { min-width: 94px; }.number-row, .binary-arrows { grid-template-columns: repeat(4, 1fr); }.arrow-cell span { font-size: 16px; }.pointer-row { gap: 10px; font-size: 16px; }.maze-grid { grid-template-columns: repeat(6, 38px); }.maze-cell { height: 38px; }.bar { width: 42px; }.bar-row { gap: 8px; } }
</style>
