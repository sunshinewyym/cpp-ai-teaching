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

    <template v-if="algorithm">
    <section v-if="embeddedVisualizer" class="embedded-visualizer">
      <iframe :key="algorithm" :src="embeddedVisualizer" :title="embeddedTitle" loading="eager"></iframe>
    </section>
    <template v-else>
    <section class="visualizer-controls">
      <label v-if="algorithm === 'recursion'">计算阶乘 n!
        <input v-model.number="factorialInput" type="number" min="1" max="6" @change="reset" />
      </label>
      <label v-else-if="algorithm === 'binary'">查找目标值
        <input v-model.number="binaryTarget" type="number" min="1" max="15" @change="reset" />
      </label>
      <label v-else-if="algorithm === 'bubble'">待排序数字
        <input v-model="bubbleInput" @change="reset" />
      </label>
      <span v-else class="control-hint">{{ controlHints[algorithm] }}</span>
      <button class="reset-button" @click="reset">↺ 重置演示</button>
    </section>

    <section class="step-banner" :class="algorithm">
      <span class="step-count">第 {{ stepIndex + 1 }}/{{ steps.length }} 步</span>
      <span v-if="algorithm === 'dfs' && currentStep.backtracks" class="backtrack-count">已回溯 {{ currentStep.backtracks }} 次</span>
      <strong>{{ currentStep.title }}</strong>
      <p>{{ currentStep.message }}</p>
    </section>

    <section class="visual-stage">
      <div v-if="algorithm === 'recursion'" class="factorial-stage">
        <div class="factorial-main">
          <section class="recursion-code" aria-label="阶乘递归代码">
            <strong>递归函数</strong>
            <div :class="{ active: currentStep.line === 1 }"><i>1</i><code>int fact(int n) {</code></div>
            <div :class="{ active: currentStep.line === 2 }"><i>2</i><code>&nbsp;&nbsp;if (n == 1) return 1;</code></div>
            <div :class="{ active: currentStep.line === 3 }"><i>3</i><code>&nbsp;&nbsp;return n * fact(n - 1);</code></div>
            <div><i>4</i><code>}</code></div>
          </section>

          <section class="call-stack-panel">
            <header><strong>调用栈</strong><span>栈顶在上方</span></header>
            <div class="stack-direction" :class="currentStep.phase">{{ currentStep.phase === 'return' || currentStep.phase === 'done' || currentStep.phase === 'base' ? '↑ 开始逐层返回' : '↓ 继续递归调用' }}</div>
            <div class="factorial-stack" :class="{ compact: currentStep.frames?.length > 5 }">
              <div v-for="frame in currentStep.frames?.slice().reverse()" :key="frame.n" class="stack-frame" :class="frame.status">
                <strong>fact({{ frame.n }})</strong>
                <span v-if="frame.status === 'waiting'">等待 fact({{ frame.n - 1 }}) 返回</span>
                <span v-else-if="frame.status === 'returning'">返回 {{ frame.result }}</span>
                <span v-else>正在执行</span>
              </div>
            </div>
          </section>
        </div>

        <section class="factorial-calculation" :class="currentStep.phase">
          <div><span>当前算式</span><strong>{{ currentStep.expression }}</strong></div>
          <div class="return-values"><span v-if="!currentStep.returnValues?.length">等待到达递归出口</span><b v-for="item in currentStep.returnValues" :key="item.n">{{ item.formula }}</b></div>
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

      <div v-else-if="algorithm === 'twoPointer'" class="array-stage two-pointer-stage">
        <div class="teaching-array">
          <div v-for="(value, index) in currentStep.array" :key="index" class="data-cell" :class="{ active: index === currentStep.left || index === currentStep.right, success: currentStep.found && (index === currentStep.left || index === currentStep.right) }">
            <small>{{ index + 1 }}</small><strong>{{ value }}</strong>
            <span v-if="index === currentStep.left" class="cell-pointer left-pointer">↑ left</span>
            <span v-if="index === currentStep.right" class="cell-pointer right-pointer">↑ right</span>
          </div>
        </div>
        <div class="calculation-strip"><strong>{{ currentStep.array[currentStep.left] }} + {{ currentStep.array[currentStep.right] }} = {{ currentStep.sum }}</strong><span>目标值 {{ currentStep.target }}</span></div>
      </div>

      <div v-else-if="algorithm === 'prefix'" class="array-stage multi-row-stage">
        <div class="array-line"><strong>原数组 a</strong><div class="teaching-array prefix-array"><span class="grid-placeholder" aria-hidden="true"></span><div v-for="(value, index) in currentStep.array" :key="index" class="data-cell" :class="{ range: currentStep.phase === 'query' && index >= currentStep.query[0] && index <= currentStep.query[1] }"><small>{{ index + 1 }}</small><strong>{{ value }}</strong></div></div></div>
        <div class="array-line"><strong>前缀和 prefix</strong><div class="teaching-array prefix-array"><div v-for="(value, index) in currentStep.prefix" :key="index" class="data-cell" :class="{ active: index === currentStep.active, used: currentStep.prefixUsed?.includes(index) }"><small>{{ index }}</small><strong>{{ value ?? '?' }}</strong></div></div></div>
        <div class="calculation-strip"><strong>{{ currentStep.phase === 'query' ? `prefix[4] - prefix[1] = ${currentStep.answer}` : 'prefix[i] = prefix[i - 1] + a[i]' }}</strong><span>{{ currentStep.phase === 'query' ? '区间 [2, 4]' : '正在预处理' }}</span></div>
      </div>

      <div v-else-if="algorithm === 'difference'" class="array-stage multi-row-stage">
        <div class="array-line"><strong>原数组 a</strong><div class="teaching-array"><div v-for="(value, index) in currentStep.array" :key="index" class="data-cell" :class="{ range: index >= currentStep.update[0] && index <= currentStep.update[1] }"><small>{{ index + 1 }}</small><strong>{{ value }}</strong></div></div></div>
        <div class="array-line"><strong>差分 diff</strong><div class="teaching-array"><div v-for="(value, index) in currentStep.difference" :key="index" class="data-cell" :class="{ active: index === currentStep.active && currentStep.phase !== 'restore' }"><small>{{ index + 1 }}</small><strong>{{ value ?? '?' }}</strong></div></div></div>
        <div class="array-line"><strong>还原结果</strong><div class="teaching-array"><div v-for="(value, index) in currentStep.result" :key="index" class="data-cell" :class="{ active: index === currentStep.active && currentStep.phase === 'restore', success: currentStep.phase === 'restore' && value !== null }"><small>{{ index + 1 }}</small><strong>{{ value ?? '?' }}</strong></div></div></div>
      </div>

      <div v-else-if="algorithm === 'robber'" class="array-stage multi-row-stage robber-stage">
        <div class="array-line"><span class="row-label-spacer" aria-hidden="true"></span><div class="house-row"><div v-for="(value, index) in currentStep.array" :key="index" class="house-cell" :class="{ active: index === currentStep.active, selected: currentStep.selected?.includes(index) }"><span>房屋 {{ index + 1 }}</span><strong>{{ value }}</strong></div></div></div>
        <div class="array-line"><strong>dp</strong><div class="teaching-array"><div v-for="(value, index) in currentStep.dp" :key="index" class="data-cell" :class="{ active: index === currentStep.active }"><small>{{ index + 1 }}</small><strong>{{ value ?? '?' }}</strong></div></div></div>
        <div v-if="currentStep.active !== null" class="decision-strip"><span>不抢：{{ currentStep.skipValue }}</span><strong>取最大值</strong><span>抢：{{ currentStep.takeValue }}</span></div>
      </div>

      <div v-else-if="algorithm === 'lis'" class="array-stage multi-row-stage">
        <div class="teaching-array lis-array"><div v-for="(value, index) in currentStep.array" :key="index" class="data-cell" :class="{ active: index === currentStep.active, predecessor: index === currentStep.predecessor, success: currentStep.path?.includes(index) }"><small>{{ index + 1 }}</small><strong>{{ value }}</strong><span>dp={{ currentStep.dp[index] }}</span></div></div>
        <div class="sequence-strip"><strong>当前上升序列</strong><span v-if="currentStep.path?.length">{{ currentStep.path.map(index => currentStep.array[index]).join(' → ') }}</span><span v-else>从左到右计算</span></div>
      </div>

      <div v-else-if="algorithm === 'knapsack'" class="knapsack-stage">
        <div class="item-row"><span v-for="(item, index) in currentStep.items" :key="index" :class="{ active: index + 1 === currentStep.row }">物品 {{ index + 1 }}：重量 {{ item.weight }}，价值 {{ item.value }}</span></div>
        <div class="dp-table-wrap"><table class="dp-table"><thead><tr><th>物品/容量</th><th v-for="capacity in currentStep.capacity + 1" :key="capacity">{{ capacity - 1 }}</th></tr></thead><tbody><tr v-for="(row, rowIndex) in currentStep.table" :key="rowIndex"><th>{{ rowIndex === 0 ? '0 件' : `前 ${rowIndex} 件` }}</th><td v-for="(value, colIndex) in row" :key="colIndex" :class="{ active: rowIndex === currentStep.row && colIndex === currentStep.col, source: rowIndex === currentStep.row - 1 && (colIndex === currentStep.col || colIndex === currentStep.fromCol) }">{{ value }}</td></tr></tbody></table></div>
        <div v-if="currentStep.decision" class="calculation-strip"><strong>{{ currentStep.decision === 'take' ? '选择当前物品更优' : '不选当前物品更优' }}</strong><span>黄色是当前状态，蓝色是来源状态</span></div>
      </div>

      <div v-else-if="algorithm === 'unionFind'" class="union-stage">
        <svg class="union-tree" viewBox="0 0 650 310" role="img" aria-label="并查集父节点连接关系">
          <defs><marker id="union-arrow" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto"><path d="M0,0 L0,5 L4.5,2.5 z" /></marker></defs>
          <g v-for="([node, parent]) in unionLinks" :key="node" class="union-link" :class="{ active: currentStep.changedParent === node }"><line v-bind="unionLinkPoints(node, parent)" marker-end="url(#union-arrow)" /></g>
          <g v-for="node in unionTreeNodes" :key="node.id" class="union-node" :class="unionNodeClass(node.id)" :style="{ transform: `translate(${unionNodePosition(node.id).x}px, ${unionNodePosition(node.id).y}px)` }"><circle cx="0" cy="0" r="30" /><text x="0" y="7">{{ node.id }}</text></g>
        </svg>
        <div class="group-row"><div v-for="(group, index) in currentStep.groups" :key="index" class="set-group"><strong>集合 {{ index + 1 }}</strong><span>{{ group.join('、') }}</span></div></div>
        <div v-if="currentStep.operation" class="calculation-strip"><strong>union({{ currentStep.operation[0] }}, {{ currentStep.operation[1] }})</strong><span>{{ currentStep.merged ? '两个集合已经合并' : '本来就在同一集合' }}</span></div>
      </div>

      <div v-else-if="algorithm === 'mst' || algorithm === 'shortest'" class="graph-stage">
        <svg class="weighted-graph" viewBox="0 0 650 250" role="img" :aria-label="algorithm === 'mst' ? 'Kruskal 最小生成树过程图' : 'Dijkstra 最短路过程图'">
          <g v-for="edge in graphEdges" :key="edge.id" class="graph-edge" :class="graphEdgeClass(edge)">
            <line :x1="graphNode(edge.a).x" :y1="graphNode(edge.a).y" :x2="graphNode(edge.b).x" :y2="graphNode(edge.b).y" />
            <text :x="(graphNode(edge.a).x + graphNode(edge.b).x) / 2" :y="(graphNode(edge.a).y + graphNode(edge.b).y) / 2 - 6">{{ edge.weight }}</text>
          </g>
          <g v-for="node in graphNodes" :key="node.id" class="graph-node" :class="graphNodeClass(node.id)">
            <circle :cx="node.x" :cy="node.y" r="23" />
            <text :x="node.x" :y="node.y + 6">{{ node.id }}</text>
          </g>
        </svg>
        <div v-if="algorithm === 'mst'" class="graph-status"><span>已选边：{{ currentStep.acceptedEdges?.join('、') || '无' }}</span><strong>当前总权值：{{ currentStep.total }}</strong></div>
        <div v-else class="distance-row"><span v-for="(distance, node) in currentStep.distances" :key="node" :class="{ visited: currentStep.visited?.includes(node), current: currentStep.current === node }"><strong>{{ node }}</strong> {{ distance }}</span></div>
      </div>

      <div v-else-if="algorithm === 'topological'" class="topological-stage">
        <svg class="topological-graph" viewBox="0 0 650 250" role="img" aria-label="拓扑排序有向图">
          <defs><marker id="topology-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" /></marker></defs>
          <g v-for="edge in topologicalEdges" :key="edge.id" class="topological-edge" :class="{ removed: currentStep.removedEdges?.includes(edge.id) && !currentStep.activeEdges?.includes(edge.id), active: currentStep.activeEdges?.includes(edge.id) }">
            <line v-bind="topologicalLinkPoints(edge)" marker-end="url(#topology-arrow)" />
          </g>
          <g v-for="node in topologicalNodes" :key="node.id" class="topological-node" :class="{ current: currentStep.current === node.id, queued: currentStep.queue?.includes(node.id), output: currentStep.order?.includes(node.id) }">
            <circle :cx="node.x" :cy="node.y" r="28" />
            <text :x="node.x" :y="node.y + 6">{{ node.id }}</text>
            <text class="indegree" :x="node.x" :y="node.y + 47">入度 {{ currentStep.indegrees?.[node.id] }}</text>
          </g>
        </svg>
        <div class="topology-status">
          <div><strong>待处理队列</strong><span v-if="!currentStep.queue?.length">空</span><b v-for="node in currentStep.queue" :key="node">{{ node }}</b></div>
          <div><strong>拓扑序列</strong><span v-if="!currentStep.order?.length">等待输出</span><b v-for="node in currentStep.order" :key="node">{{ node }}</b></div>
        </div>
      </div>

      <div v-else-if="algorithm === 'monoStack'" class="monotonic-stage">
        <div class="monotonic-array">
          <div v-for="(value, index) in currentStep.array" :key="index" class="data-cell" :class="{ active: currentStep.active === index, popped: currentStep.popped === index, stacked: currentStep.stack?.includes(index) }">
            <small>{{ index + 1 }}</small><strong>{{ value }}</strong><span>答案 {{ currentStep.answers?.[index] ?? '?' }}</span>
          </div>
        </div>
        <div class="structure-row"><strong>单调栈 <small>栈顶在右</small></strong><span v-if="!currentStep.stack?.length">空</span><b v-for="index in currentStep.stack" :key="index">{{ currentStep.array[index] }}</b></div>
      </div>

      <div v-else-if="algorithm === 'monoQueue'" class="monotonic-stage">
        <div class="monotonic-array">
          <div v-for="(value, index) in currentStep.array" :key="index" class="data-cell" :class="{ active: currentStep.active === index, range: index >= currentStep.window?.[0] && index <= currentStep.window?.[1], popped: currentStep.removed?.includes(index), stacked: currentStep.deque?.includes(index) }">
            <small>{{ index + 1 }}</small><strong>{{ value }}</strong>
          </div>
        </div>
        <div class="structure-row"><strong>单调队列 <small>队首在左</small></strong><span v-if="!currentStep.deque?.length">空</span><b v-for="index in currentStep.deque" :key="index">{{ currentStep.array[index] }}</b></div>
        <div class="output-row"><strong>窗口最大值</strong><span v-if="!currentStep.outputs?.length">窗口尚未形成</span><b v-for="(value, index) in currentStep.outputs" :key="index">{{ value }}</b></div>
      </div>

      <div v-else-if="algorithm === 'trie'" class="trie-stage">
        <svg class="trie-tree" viewBox="0 0 650 285" role="img" aria-label="Trie 字典树">
          <g v-for="edge in trieEdges" :key="edge.from + edge.to" v-show="currentStep.created?.includes(edge.from) && currentStep.created?.includes(edge.to)" class="trie-edge" :class="{ active: currentStep.activePath?.includes(edge.from) && currentStep.activePath?.includes(edge.to) }">
            <line :x1="trieNode(edge.from).x" :y1="trieNode(edge.from).y" :x2="trieNode(edge.to).x" :y2="trieNode(edge.to).y" />
          </g>
          <g v-for="node in trieNodes" :key="node.id" v-show="currentStep.created?.includes(node.id)" class="trie-node" :class="{ active: currentStep.activePath?.includes(node.id), finished: currentStep.finished?.includes(node.id) }">
            <circle :cx="node.x" :cy="node.y" r="24" />
            <text :x="node.x" :y="node.y + 6">{{ node.label }}</text>
            <text v-if="currentStep.finished?.includes(node.id)" class="word-end" :x="node.x + 20" :y="node.y - 20">●</text>
          </g>
        </svg>
        <div class="trie-status"><strong>{{ currentStep.operation }}</strong><span>已有单词：{{ currentStep.words?.join('、') || '暂无' }}</span></div>
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
      <div class="playback-controls">
        <button title="上一步" :disabled="stepIndex === 0" @click="previous">←</button>
        <button class="play-button" :title="playing ? '停止播放' : '自动播放'" @click="togglePlay">{{ playing ? '■' : '▶' }}</button>
        <button title="下一步" :disabled="stepIndex === steps.length - 1" @click="next">→</button>
      </div>
      <div class="progress"><span :style="{ width: `${((stepIndex + 1) / steps.length) * 100}%` }"></span></div>
    </footer>

    <section class="learning-note">
      <strong>本节抓住：</strong>{{ learningNotes[algorithm] }}
    </section>
    </template>
    </template>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import {
  advancedAlgorithms,
  advancedHints,
  advancedNotes,
  advancedSteps,
  graphEdges,
  graphNodes,
  topologicalEdges,
  topologicalNodes,
  trieEdges,
  trieNodes,
} from '../utils/advancedVisualizer.js';

const algorithms = [
  { id: 'recursion', icon: '🪜', name: '递归' },
  { id: 'binary', icon: '🔎', name: '二分查找' },
  { id: 'bubble', icon: '↔️', name: '冒泡排序' },
  { id: 'bfs', icon: '🗺️', name: 'BFS 迷宫' },
  { id: 'dfs', icon: '🧭', name: 'DFS 迷宫' },
  ...advancedAlgorithms,
];
const learningNotes = {
  recursion: '递归分成两个方向：先不断调用更小的问题并压入调用栈，到达终止条件后，再把结果逐层返回给上一层。',
  binary: '每次比较中点后都能排除一半区间，所以有序是二分查找的前提。',
  bubble: '相邻元素比较并交换，大元素会像气泡一样逐渐移到右边。',
  bfs: '队列保证先到达距离更近的位置，因此 BFS 能找到无权图的最短步数。',
  dfs: '本演示的目标是找到任意一个迷宫出口：DFS 会优先一路深入，遇到死路再回溯；第一次到达终点便完成。',
  ...advancedNotes,
};
const controlHints = {
  recursion: '用阶乘观察递归调用怎样入栈，以及结果怎样逐层返回。',
  bfs: '固定迷宫，观察 BFS 如何一层层向外探索。',
  dfs: '本演示用 DFS 寻找任意出口：找到终点即结束，不比较最短路径。',
  ...advancedHints,
};
const unionTreeNodes = ['A', 'B', 'C', 'D', 'E', 'F'].map(id => ({ id }));
const binaryArray = [1, 3, 5, 7, 9, 11, 13, 15];
const bfsWalls = [2, 7, 8, 14, 20, 21, 22];
const dfsWalls = [7, 8, 11, 14, 20, 22, 23];
const bfsStart = 0;
const bfsEnd = 29;
const bfsCells = Array.from({ length: 30 }, (_, index) => index);

const algorithm = ref(null);
const embeddedVisualizers = {
  treeTraversal: '/visualizers/binary-tree-traversal.html',
  sortingCompare: '/visualizers/sorting-comparison.html',
};
const factorialInput = ref(4);
const binaryTarget = ref(15);
const bubbleInput = ref('5, 2, 4, 1, 3');
const stepIndex = ref(0);
const playing = ref(false);
let timer;

const embeddedVisualizer = computed(() => embeddedVisualizers[algorithm.value] || null);
const embeddedTitle = computed(() => algorithms.find(item => item.id === algorithm.value)?.name || '算法演示');

const steps = computed(() => {
  if (!algorithm.value) return [];
  if (embeddedVisualizer.value) return [];
  if (algorithm.value === 'recursion') return recursionSteps(factorialInput.value);
  if (algorithm.value === 'binary') return binarySteps(binaryTarget.value);
  if (algorithm.value === 'bubble') return bubbleSteps(bubbleInput.value);
  if (algorithm.value === 'bfs') return bfsSteps();
  if (algorithm.value === 'dfs') return dfsSteps();
  return advancedSteps(algorithm.value);
});
const currentStep = computed(() => steps.value[Math.min(stepIndex.value, steps.value.length - 1)] || {});
const unionLinks = computed(() => Object.entries(currentStep.value.parents || {}).filter(([node, parent]) => node !== parent));
const unionLayout = computed(() => {
  const parents = currentStep.value.parents || {};
  const groups = currentStep.value.groups || unionTreeNodes.map(node => [node.id]);
  const layout = {};
  const usableWidth = 590;
  let cursor = 30;

  groups.forEach(group => {
    const width = usableWidth * group.length / unionTreeNodes.length;
    const nodesByDepth = new Map();

    group.forEach(id => {
      let depth = 0;
      let node = id;
      while (parents[node] && parents[node] !== node && depth < unionTreeNodes.length) {
        depth += 1;
        node = parents[node];
      }
      const row = nodesByDepth.get(depth) || [];
      row.push(id);
      nodesByDepth.set(depth, row);
    });

    nodesByDepth.forEach((row, depth) => {
      row.sort();
      row.forEach((id, index) => {
        const defaultX = cursor + width * (index + 1) / (row.length + 1);
        const compactX = row.length === 1 && depth > 1
          ? Math.min(cursor + width * 0.62, cursor + width - 118)
          : defaultX;
        layout[id] = {
          x: compactX,
          y: group.length === 1 ? 142 : 48 + depth * 92,
        };
      });
    });
    cursor += width;
  });

  return layout;
});
const worklist = computed(() => algorithm.value === 'dfs' ? (currentStep.value.stack || []) : (currentStep.value.queue || []));
const mazeWalls = computed(() => algorithm.value === 'dfs' ? dfsWalls : bfsWalls);

function recursionSteps(input) {
  const n = Math.min(6, Math.max(1, Math.floor(Number(input) || 4)));
  const frames = [{ n, status: 'active' }];
  const returnValues = [];
  const result = [{ title: `调用 fact(${n})`, message: `程序开始计算 ${n}!，第一个函数进入调用栈。`, line: 1, phase: 'call', frames: cloneFrames(frames), returnValues: [], expression: `fact(${n})` }];

  for (let current = n; current > 1; current -= 1) {
    frames[frames.length - 1].status = 'waiting';
    frames.push({ n: current - 1, status: 'active' });
    result.push({
      title: `fact(${current}) 调用 fact(${current - 1})`,
      message: `${current} 还不能直接得到答案，先把 fact(${current}) 暂停，继续计算更小的阶乘。`,
      line: 3, phase: 'call', frames: cloneFrames(frames), returnValues: [...returnValues], expression: factorialExpansion(n, current - 1),
    });
  }

  frames[frames.length - 1] = { n: 1, status: 'returning', result: 1 };
  returnValues.push({ n: 1, formula: 'fact(1) = 1', result: 1 });
  result.push({ title: '到达递归出口：fact(1) = 1', message: '终止条件直接返回 1，不再继续调用，递归开始反向返回。', line: 2, phase: 'base', frames: cloneFrames(frames), returnValues: [...returnValues], expression: 'fact(1) = 1' });

  let value = 1;
  for (let current = 2; current <= n; current += 1) {
    frames.pop();
    value *= current;
    frames[frames.length - 1] = { n: current, status: 'returning', result: value };
    const formula = `fact(${current}) = ${current} × ${value / current} = ${value}`;
    returnValues.push({ n: current, formula, result: value });
    result.push({
      title: `fact(${current}) 返回 ${value}`,
      message: `这一层收到 fact(${current - 1}) = ${value / current}，乘上 ${current} 后，把 ${value} 返回给上一层。`,
      line: 3, phase: current === n ? 'done' : 'return', frames: cloneFrames(frames), returnValues: [...returnValues], expression: formula,
    });
  }
  return result;
}

function cloneFrames(frames) { return frames.map(frame => ({ ...frame })); }
function factorialExpansion(root, tail) {
  const parts = [];
  for (let value = root; value > tail; value -= 1) parts.push(value);
  parts.push(`fact(${tail})`);
  return `fact(${root}) = ${parts.join(' × ')}`;
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
function unionNodePosition(id) { return unionLayout.value[id] || { x: 325, y: 142 }; }
function unionLinkPoints(node, parent) {
  const from = unionNodePosition(node);
  const to = unionNodePosition(parent);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy) || 1;
  const unitX = dx / distance;
  const unitY = dy / distance;

  return {
    x1: from.x + unitX * 34,
    y1: from.y + unitY * 34,
    x2: to.x - unitX * 38,
    y2: to.y - unitY * 38,
  };
}
function unionNodeClass(id) {
  return {
    root: currentStep.value.parents?.[id] === id,
    active: currentStep.value.operation?.includes(id),
    changed: currentStep.value.changedParent === id,
  };
}
function graphNode(id) { return graphNodes.find(node => node.id === id); }
function topologicalNode(id) { return topologicalNodes.find(node => node.id === id); }
function topologicalLinkPoints(edge) {
  const from = topologicalNode(edge.from);
  const to = topologicalNode(edge.to);
  const distance = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const unitX = (to.x - from.x) / distance;
  const unitY = (to.y - from.y) / distance;
  return { x1: from.x + unitX * 31, y1: from.y + unitY * 31, x2: to.x - unitX * 35, y2: to.y - unitY * 35 };
}
function trieNode(id) { return trieNodes.find(node => node.id === id); }
function graphEdgeClass(edge) {
  return {
    chosen: currentStep.value.acceptedEdges?.includes(edge.id),
    tree: currentStep.value.treeEdges?.includes(edge.id),
    active: currentStep.value.activeEdge === edge.id || currentStep.value.activeEdges?.includes(edge.id),
    rejected: currentStep.value.rejectedEdge === edge.id,
    path: currentStep.value.pathEdges?.includes(edge.id),
  };
}
function graphNodeClass(id) {
  return {
    visited: currentStep.value.visited?.includes(id),
    current: currentStep.value.current === id,
  };
}
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
.visualizer-panel { flex: 1; min-height: 0; overflow: hidden; padding: 14px 20px; background: #f8fafc; display: flex; flex-direction: column; }
.visualizer-header, .visualizer-controls, .step-banner, .visual-stage, .playback-bar, .learning-note { max-width: 1040px; margin: 0 auto; }
.visualizer-header { display: flex; width: 100%; max-width: none; align-items: center; gap: 10px; margin: 0 0 9px; }
.visualizer-header > div:first-child { flex: 0 0 auto; }
.visualizer-header h2 { margin: 0; color: #1e293b; font-size: 20px; }
.visualizer-header p { display: none; }
.algorithm-tabs { display: grid; min-width: 0; flex: 1; grid-template-columns: repeat(10, minmax(0, 1fr)); grid-template-rows: repeat(2, 32px); gap: 5px; overflow: visible; padding: 0; }
.algorithm-tabs button, .visualizer-controls button, .playback-bar button { border: 1px solid #cbd5e1; background: #fff; color: #334155; border-radius: 6px; cursor: pointer; font: inherit; }
.algorithm-tabs button { min-width: 0; width: 100%; padding: 5px 2px; overflow: hidden; white-space: nowrap; font-size: 12px; }
.algorithm-tabs button.active { background: #4f46e5; border-color: #4f46e5; color: #fff; }
.visualizer-controls { display: flex; width: 100%; flex: 0 0 auto; align-items: center; gap: 12px; margin-bottom: 9px; }
.visualizer-controls label { display: flex; align-items: center; gap: 8px; color: #475569; font-weight: 600; }
.visualizer-controls input { width: 170px; padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font: inherit; }
.control-hint { color: #64748b; font-size: 14px; }
.reset-button { margin-left: auto; padding: 9px 12px; }
.embedded-visualizer { width: min(1280px, 100%); min-height: 0; flex: 1; margin: 0 auto; overflow: hidden; border: 1px solid #dbe4f0; border-radius: 8px; background: #fff; }
.embedded-visualizer iframe { display: block; width: 100%; height: 100%; min-height: 0; border: 0; background: #fff; }
.step-banner { width: 100%; flex: 0 0 auto; border-left: 4px solid #4f46e5; background: #fff; padding: 9px 14px; border-radius: 6px; box-shadow: 0 4px 14px rgba(15, 23, 42, .05); }
.step-count { display: inline-block; margin-right: 10px; color: #4f46e5; font-size: 13px; font-weight: 700; }
.step-banner strong { color: #1e293b; }.backtrack-count { display: inline-block; margin-right: 10px; color: #dc2626; font-size: 13px; font-weight: 700; }
.step-banner p { margin: 3px 0 0; color: #64748b; font-size: 14px; }
.visual-stage { width: 100%; min-height: 0; flex: 1; margin-top: 9px; padding: 16px 20px; overflow: hidden; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
.visual-stage > div { min-height: 0; height: 100%; }
.backtrack-stage { display: grid; min-height: 350px; gap: 14px; }.backtrack-workbench { display: grid; grid-template-columns: .8fr 1.05fr 1.15fr; gap: 14px; }.backtrack-workbench section { min-width: 0; padding: 12px; border: 1px solid #dbe4f0; border-radius: 6px; background: #f8fafc; }.backtrack-workbench section > strong { display: block; margin-bottom: 10px; color: #334155; text-align: center; }.candidate-row, .choice-slots, .result-combinations { display: flex; min-height: 46px; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px; }.candidate-row { display: grid; grid-template-columns: repeat(3, 40px); }.candidate-row span, .choice-slots span { display: grid; width: 40px; height: 42px; place-items: center; border: 2px solid #cbd5e1; border-radius: 6px; background: #fff; color: #334155; font-size: 20px; font-weight: 800; }.candidate-row span.selected, .choice-slots span.filled { border-color: #4f46e5; background: #eef2ff; color: #3730a3; }.candidate-row span.active { border-color: #f59e0b; background: #fef3c7; transform: translateY(-3px); }.candidate-row span.undoing { border-color: #ef4444; background: #fee2e2; color: #b91c1c; }.result-combinations > span { color: #94a3b8; }.result-combinations b { padding: 6px 9px; border-radius: 5px; background: #dcfce7; color: #047857; }.backtrack-tree { width: 100%; max-height: 310px; }.tree-edge line { stroke: #cbd5e1; stroke-width: 3; transition: stroke .2s, stroke-width .2s; }.tree-edge.path line { stroke: #4f46e5; stroke-width: 6; }.tree-edge.answer line { stroke: #10b981; }.tree-edge.backtracked line { stroke: #ef4444; stroke-dasharray: 8 5; }.tree-edge.pruned line { stroke: #cbd5e1; stroke-dasharray: 6 5; }.tree-node rect { fill: #fff; stroke: #cbd5e1; stroke-width: 3; transition: fill .2s, stroke .2s; }.tree-node text { fill: #334155; text-anchor: middle; font-size: 16px; font-weight: 800; }.tree-node.visited rect { fill: #eef2ff; stroke: #818cf8; }.tree-node.path rect { stroke: #4f46e5; stroke-width: 5; }.tree-node.answer rect { fill: #dcfce7; stroke: #10b981; }.tree-node.current rect { fill: #fef3c7; stroke: #f59e0b; stroke-width: 5; }.tree-node.backtracked rect { fill: #fee2e2; stroke: #ef4444; }.tree-node.pruned rect { fill: #f1f5f9; stroke: #94a3b8; stroke-dasharray: 6 4; }.tree-node .node-note { fill: #64748b; font-size: 12px; font-weight: 600; }.tree-legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px 18px; color: #64748b; font-size: 13px; }.tree-legend span::before { content: ''; display: inline-block; width: 12px; height: 12px; margin-right: 5px; border-radius: 3px; vertical-align: -1px; background: #eef2ff; border: 2px solid #4f46e5; }.tree-legend .legend-answer::before { background: #dcfce7; border-color: #10b981; }.tree-legend .legend-backtrack::before { background: #fee2e2; border-color: #ef4444; }.tree-legend .legend-pruned::before { background: #f1f5f9; border-color: #94a3b8; }
.factorial-stage { display: grid; grid-template-rows: minmax(0, 1fr) auto; gap: 12px; }.factorial-main { display: grid; min-height: 0; grid-template-columns: 1fr 1fr; gap: 16px; }.recursion-code, .call-stack-panel { min-height: 0; padding: 14px; border: 1px solid #dbe4f0; border-radius: 6px; background: #f8fafc; }.recursion-code > strong { display: block; margin-bottom: 12px; color: #334155; }.recursion-code > div { display: grid; grid-template-columns: 26px 1fr; align-items: center; min-height: 46px; padding: 0 10px; border-radius: 5px; transition: background .2s, color .2s; }.recursion-code > div.active { background: #4f46e5; }.recursion-code i { color: #94a3b8; font-style: normal; }.recursion-code code { color: #334155; font-size: 16px; white-space: nowrap; }.recursion-code div.active i, .recursion-code div.active code { color: #fff; }.call-stack-panel { display: flex; flex-direction: column; }.call-stack-panel header { display: flex; align-items: center; justify-content: space-between; color: #334155; }.call-stack-panel header span { color: #94a3b8; font-size: 12px; }.stack-direction { margin: 5px 0; color: #4f46e5; text-align: center; font-size: 13px; font-weight: 700; }.stack-direction.return, .stack-direction.base, .stack-direction.done { color: #059669; }.factorial-stack { display: flex; min-height: 0; flex: 1; align-items: center; flex-direction: column; justify-content: center; gap: 2px; }.stack-frame { display: flex; width: min(330px, 88%); min-height: 27px; box-sizing: border-box; align-items: center; justify-content: space-between; padding: 2px 10px; border-left: 5px solid #818cf8; border-radius: 5px; background: #eef2ff; color: #475569; transition: transform .2s, background .2s; }.stack-frame strong { color: #312e81; }.stack-frame span { font-size: 12px; }.stack-frame.active { border-color: #f59e0b; background: #fef3c7; transform: translateX(5px); }.stack-frame.returning { border-color: #10b981; background: #dcfce7; }.stack-frame.returning strong { color: #047857; }.factorial-calculation { display: grid; min-height: 58px; grid-template-columns: minmax(260px, .8fr) 1.5fr; align-items: center; gap: 14px; padding: 9px 14px; border-left: 5px solid #4f46e5; border-radius: 6px; background: #eef2ff; }.factorial-calculation.return, .factorial-calculation.base, .factorial-calculation.done { border-color: #10b981; background: #ecfdf5; }.factorial-calculation > div:first-child span, .factorial-calculation > div:first-child strong { display: block; }.factorial-calculation span { color: #64748b; font-size: 12px; }.factorial-calculation > div:first-child strong { margin-top: 2px; color: #1e293b; font-size: 17px; }.return-values { display: flex; min-width: 0; gap: 6px; overflow-x: auto; }.return-values b { flex: 0 0 auto; padding: 5px 8px; border-radius: 5px; background: #fff; color: #047857; font-size: 13px; }
.factorial-stack.compact { gap: 1px; }.factorial-stack.compact .stack-frame { min-height: 22px; padding-block: 0; }
.binary-stage { display: flex; min-height: 290px; flex-direction: column; justify-content: center; gap: 34px; }
.number-row { display: grid; grid-template-columns: repeat(8, minmax(46px, 1fr)); gap: 8px; }
.number-cell { padding: 10px 6px; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; }
.number-cell small, .number-cell strong { display: block; }.number-cell small { color: #94a3b8; }.number-cell strong { color: #1e293b; font-size: 20px; }
.number-cell.mid { border-color: #f59e0b; background: #fffbeb; }.number-cell.found { border-color: #22c55e; background: #dcfce7; }.number-cell.discarded { opacity: .3; }
.binary-arrows { display: grid; grid-template-columns: repeat(8, minmax(46px, 1fr)); gap: 8px; margin-top: -18px; min-height: 54px; }.arrow-cell { display: flex; align-items: center; flex-direction: column; justify-content: flex-start; min-width: 0; }.arrow-cell span { white-space: nowrap; font-size: 18px; font-weight: 800; line-height: 1.25; }.left-arrow { color: #2563eb; }.mid-arrow { color: #d97706; }.right-arrow { color: #dc2626; }.pointer-row { display: flex; justify-content: center; gap: 32px; color: #334155; font-size: 20px; font-weight: 800; }
.bubble-stage { display: flex; min-height: 290px; align-items: end; justify-content: center; }.bar-row { display: flex; min-height: 260px; align-items: end; gap: 18px; }
.bar-wrap { display: flex; align-items: end; }.bar { display: flex; width: 60px; justify-content: center; align-items: flex-start; padding-top: 8px; background: #818cf8; border-radius: 6px 6px 0 0; color: #fff; transition: height .25s, background .25s; }.bar.comparing { background: #f59e0b; }.bar.sorted { background: #34d399; }
.array-stage { display: flex; min-height: 290px; flex-direction: column; justify-content: center; gap: 18px; }.teaching-array { display: grid; grid-template-columns: repeat(auto-fit, minmax(58px, 1fr)); gap: 8px; width: 100%; }.data-cell { position: relative; min-height: 70px; padding: 9px 6px; text-align: center; border: 2px solid #cbd5e1; border-radius: 6px; background: #fff; transition: border-color .2s, background .2s, transform .2s; }.data-cell small, .data-cell strong, .data-cell span { display: block; }.data-cell small { color: #94a3b8; }.data-cell strong { color: #1e293b; font-size: 21px; }.data-cell span { margin-top: 3px; color: #64748b; font-size: 12px; }.data-cell.active { border-color: #f59e0b; background: #fffbeb; transform: translateY(-3px); }.data-cell.success, .data-cell.used { border-color: #10b981; background: #dcfce7; }.data-cell.range { border-color: #60a5fa; background: #eff6ff; }.data-cell.predecessor { border-color: #8b5cf6; background: #f5f3ff; }.two-pointer-stage .teaching-array { margin-bottom: 28px; }.cell-pointer { position: absolute; right: 0; bottom: -30px; left: 0; white-space: nowrap; font-size: 17px !important; font-weight: 800; }.left-pointer { color: #2563eb !important; }.right-pointer { color: #dc2626 !important; }.calculation-strip, .decision-strip, .sequence-strip, .graph-status { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 16px; border-radius: 6px; background: #f1f5f9; color: #475569; }.calculation-strip strong, .sequence-strip strong, .graph-status strong { color: #1e293b; font-size: 18px; }.multi-row-stage { gap: 14px; }.array-line { display: grid; align-items: center; grid-template-columns: 118px 1fr; gap: 12px; }.array-line > strong { color: #334155; }.prefix-array { grid-template-columns: repeat(6, minmax(58px, 1fr)); }.grid-placeholder { visibility: hidden; }.house-row, .robber-stage .teaching-array { display: grid; grid-template-columns: repeat(5, minmax(58px, 1fr)); gap: 8px; }.house-cell, .robber-stage .data-cell { height: 76px; min-height: 76px; box-sizing: border-box; }.house-cell { display: flex; align-items: center; flex-direction: column; justify-content: center; padding: 9px 6px; text-align: center; border: 2px solid #cbd5e1; border-radius: 6px; background: #fff; }.house-cell span, .house-cell strong { display: block; }.house-cell span { color: #64748b; font-size: 13px; }.house-cell strong { margin-top: 3px; color: #1e293b; font-size: 21px; }.house-cell.active { border-color: #f59e0b; background: #fffbeb; }.house-cell.selected { border-color: #10b981; background: #dcfce7; }.decision-strip { justify-content: center; }.decision-strip span { min-width: 100px; padding: 7px 10px; border-radius: 5px; background: #fff; text-align: center; }.decision-strip strong { color: #4f46e5; }.sequence-strip span { color: #047857; font-size: 18px; font-weight: 700; }
.knapsack-stage { display: grid; gap: 14px; }.item-row { display: flex; flex-wrap: wrap; gap: 8px; }.item-row span { padding: 7px 10px; border-radius: 5px; background: #f1f5f9; color: #475569; }.item-row span.active { background: #fef3c7; color: #92400e; font-weight: 700; }.dp-table-wrap { overflow-x: auto; }.dp-table { width: 100%; min-width: 640px; border-collapse: collapse; color: #334155; text-align: center; }.dp-table th, .dp-table td { height: 42px; padding: 5px; border: 1px solid #cbd5e1; }.dp-table th { background: #f8fafc; }.dp-table td.active { background: #fef3c7; color: #92400e; font-weight: 800; }.dp-table td.source { background: #dbeafe; color: #1d4ed8; font-weight: 700; }
.union-stage { display: grid; min-height: 290px; align-content: center; gap: 18px; }.union-tree { width: 100%; max-height: 340px; overflow: visible; }.union-link line { stroke: #64748b; stroke-width: 2.5; }.union-link.active line { stroke: #f59e0b; stroke-width: 2.5; stroke-dasharray: 400; animation: union-link-in .55s ease-out both; }.union-tree marker path { fill: #64748b; }.union-node { transition: transform .55s cubic-bezier(.2, .8, .2, 1); }.union-node circle { fill: #fff; stroke: #94a3b8; stroke-width: 3; transition: fill .2s, stroke .2s; }.union-node text { fill: #1e293b; text-anchor: middle; font-size: 22px; font-weight: 800; }.union-node.root circle { fill: #ecfdf5; stroke: #10b981; stroke-width: 4; }.union-node.active circle { fill: #fffbeb; stroke: #f59e0b; stroke-width: 5; }.union-node.changed circle { fill: #fef3c7; stroke: #f59e0b; stroke-width: 6; }.group-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }.set-group { min-width: 130px; padding: 12px; border-left: 5px solid #4f46e5; border-radius: 5px; background: #eef2ff; }.set-group strong, .set-group span { display: block; }.set-group span { margin-top: 4px; color: #475569; }
@keyframes union-link-in { from { stroke-dashoffset: 400; } to { stroke-dashoffset: 0; } }
.graph-stage { display: grid; min-height: 290px; align-content: center; gap: 12px; }.weighted-graph { width: 100%; max-height: 330px; }.graph-edge line { stroke: #cbd5e1; stroke-width: 3; transition: stroke .2s, stroke-width .2s; }.graph-edge text { fill: #475569; stroke: #fff; stroke-width: 5; paint-order: stroke; text-anchor: middle; font-size: 15px; font-weight: 700; }.graph-edge.chosen line, .graph-edge.tree line { stroke: #60a5fa; stroke-width: 5; }.graph-edge.active line { stroke: #f59e0b; stroke-width: 6; }.graph-edge.rejected line { stroke: #ef4444; stroke-dasharray: 8 5; }.graph-edge.path line { stroke: #10b981; stroke-width: 7; }.graph-node circle { fill: #fff; stroke: #64748b; stroke-width: 3; }.graph-node text { fill: #1e293b; text-anchor: middle; font-size: 18px; font-weight: 800; }.graph-node.visited circle { fill: #dbeafe; stroke: #2563eb; }.graph-node.current circle { fill: #fef3c7; stroke: #f59e0b; stroke-width: 5; }.graph-status { justify-content: center; }.distance-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }.distance-row span { min-width: 70px; padding: 8px 10px; border: 2px solid #cbd5e1; border-radius: 5px; background: #fff; color: #475569; text-align: center; }.distance-row span.visited { border-color: #60a5fa; background: #eff6ff; }.distance-row span.current { border-color: #f59e0b; background: #fffbeb; }.distance-row strong { margin-right: 6px; color: #1e293b; }
.topological-stage { display: grid; min-height: 320px; align-content: center; gap: 16px; }.topological-graph { width: 100%; max-height: 310px; }.topological-edge line { stroke: #94a3b8; stroke-width: 3; transition: opacity .2s, stroke .2s; }.topological-edge.active line { stroke: #f59e0b; stroke-width: 5; }.topological-edge.removed line { opacity: .16; }.topological-graph marker path { fill: #64748b; }.topological-node circle { fill: #fff; stroke: #64748b; stroke-width: 3; }.topological-node text { fill: #1e293b; text-anchor: middle; font-size: 19px; font-weight: 800; }.topological-node .indegree { fill: #64748b; font-size: 13px; font-weight: 600; }.topological-node.queued circle { fill: #ede9fe; stroke: #7c3aed; }.topological-node.output circle { fill: #dcfce7; stroke: #10b981; }.topological-node.current circle { fill: #fef3c7; stroke: #f59e0b; stroke-width: 5; }.topology-status { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }.topology-status > div, .structure-row, .output-row { display: flex; min-height: 48px; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 6px; background: #f1f5f9; }.topology-status strong, .structure-row > strong, .output-row > strong { margin-right: 6px; color: #334155; }.topology-status span, .structure-row span, .output-row span { color: #94a3b8; }.topology-status b, .structure-row b, .output-row b { display: grid; min-width: 32px; height: 32px; place-items: center; border-radius: 5px; background: #fff; color: #4f46e5; }
.monotonic-stage { display: grid; min-height: 310px; align-content: center; gap: 18px; }.monotonic-array { display: grid; grid-template-columns: repeat(auto-fit, minmax(62px, 1fr)); gap: 8px; }.monotonic-array .data-cell.stacked { border-color: #8b5cf6; background: #f5f3ff; }.monotonic-array .data-cell.popped { border-color: #ef4444; background: #fee2e2; transform: translateY(3px); }.structure-row small { color: #64748b; font-weight: 500; }.structure-row b { background: #ede9fe; color: #6d28d9; }.output-row b { background: #dcfce7; color: #047857; }
.trie-stage { display: grid; min-height: 320px; align-content: center; gap: 12px; }.trie-tree { width: 100%; max-height: 330px; }.trie-edge line { stroke: #cbd5e1; stroke-width: 4; transition: stroke .2s, stroke-width .2s; }.trie-edge.active line { stroke: #8b5cf6; stroke-width: 7; }.trie-node circle { fill: #fff; stroke: #94a3b8; stroke-width: 3; }.trie-node text { fill: #1e293b; text-anchor: middle; font-size: 18px; font-weight: 800; }.trie-node.active circle { fill: #ede9fe; stroke: #7c3aed; stroke-width: 5; }.trie-node.finished circle { fill: #dcfce7; stroke: #10b981; }.trie-node .word-end { fill: #ef4444; font-size: 13px; }.trie-status { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px 16px; border-radius: 6px; background: #f1f5f9; color: #64748b; }.trie-status strong { color: #4f46e5; }
.bfs-stage { display: flex; min-height: 290px; align-items: center; flex-direction: column; justify-content: center; }.maze-grid { display: grid; grid-template-columns: repeat(6, 48px); gap: 5px; }.maze-cell { height: 48px; display: grid; place-items: center; border: 1px solid #cbd5e1; border-radius: 5px; background: #fff; color: #fff; font-size: 12px; transition: background .2s, border-color .2s; }.maze-cell.wall { background: #334155; border-color: #334155; }.maze-cell.visited { background: #bfdbfe; border-color: #60a5fa; }.maze-cell.frontier { background: #c4b5fd; border-color: #8b5cf6; }.maze-cell.active { background: #fbbf24; border-color: #f59e0b; }.maze-cell.backtracked { background: #fca5a5; border-color: #ef4444; }.maze-cell.path { background: #34d399; border-color: #10b981; }.maze-cell:first-child { background: #34d399; border-color: #10b981; }.maze-cell:nth-child(30) { background: #fb7185; border-color: #e11d48; }.maze-legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 12px; margin-top: 16px; color: #64748b; font-size: 12px; }.maze-legend span::before { content: ''; display: inline-block; width: 10px; height: 10px; margin-right: 4px; border-radius: 2px; background: #34d399; }.maze-legend .legend-wall::before { background: #334155; }.maze-legend .legend-visited::before { background: #bfdbfe; }.maze-legend .legend-frontier::before { background: #c4b5fd; }.maze-legend .legend-active::before { background: #fbbf24; }.maze-legend .legend-backtracked::before { background: #fca5a5; }.maze-legend .legend-path::before { background: #34d399; }.queue-label { display: flex; align-items: center; gap: 8px; margin: 18px 0 0; color: #64748b; font-size: 14px; }.queue-label strong { color: #334155; }.queue-label div { display: flex; flex-wrap: wrap; gap: 6px; }.queue-label i { padding: 3px 7px; border-radius: 999px; background: #eef2ff; color: #4f46e5; font-style: normal; }
.playback-bar { display: grid; width: 100%; flex: 0 0 auto; grid-template-columns: 1fr auto 1fr; align-items: center; margin-top: 8px; }.playback-controls { display: flex; grid-column: 2; gap: 10px; }.playback-bar button { width: 38px; height: 32px; font-size: 17px; }.playback-bar button:disabled { opacity: .35; cursor: default; }.playback-bar .play-button { background: #4f46e5; border-color: #4f46e5; color: #fff; }.progress { width: min(350px, calc(100% - 16px)); height: 6px; margin-left: 16px; overflow: hidden; border-radius: 999px; background: #e2e8f0; }.progress span { display: block; height: 100%; background: #4f46e5; transition: width .2s; }
.learning-note { width: 100%; flex: 0 0 auto; margin-top: 8px; padding: 9px 14px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; color: #92400e; font-size: 14px; }
@media (max-width: 760px) { .visualizer-panel { padding: 10px 12px; overflow-y: auto; }.visualizer-header { align-items: stretch; flex-direction: column; gap: 7px; }.visualizer-controls { align-items: stretch; flex-direction: column; }.algorithm-tabs { display: flex; width: 100%; flex: none; flex-wrap: wrap; }.algorithm-tabs button { width: auto; padding: 7px 9px; font-size: 13px; }.reset-button { margin-left: 0; }.embedded-visualizer { min-height: 560px; }.backtrack-workbench { grid-template-columns: 1fr; }.factorial-main { grid-template-columns: 1fr; }.backtrack-tree { min-height: 230px; }.number-row, .binary-arrows { grid-template-columns: repeat(4, 1fr); }.arrow-cell span { font-size: 16px; }.pointer-row { gap: 10px; font-size: 16px; }.array-line { grid-template-columns: 1fr; }.teaching-array { grid-template-columns: repeat(auto-fit, minmax(48px, 1fr)); }.row-label-spacer { display: none; }.prefix-array { grid-template-columns: repeat(6, minmax(0, 1fr)); }.house-row, .robber-stage .teaching-array { grid-template-columns: repeat(5, minmax(0, 1fr)); }.data-cell { min-height: 62px; }.data-cell strong { font-size: 18px; }.calculation-strip, .decision-strip, .sequence-strip, .graph-status, .trie-status { align-items: stretch; flex-direction: column; }.topology-status { grid-template-columns: 1fr; }.maze-grid { grid-template-columns: repeat(6, 38px); }.maze-cell { height: 38px; }.bar { width: 42px; }.bar-row { gap: 8px; } }
@media (prefers-reduced-motion: reduce) { .union-node { transition: none; }.union-link.active line { animation: none; } }
</style>
