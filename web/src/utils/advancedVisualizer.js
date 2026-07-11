export const advancedAlgorithms = [
  { id: 'treeTraversal', icon: '🌳', name: '二叉树' },
  { id: 'sortingCompare', icon: '📊', name: '排序对比' },
  { id: 'twoPointer', icon: '⇆', name: '双指针' },
  { id: 'prefix', icon: 'Σ', name: '前缀和' },
  { id: 'difference', icon: 'Δ', name: '差分' },
  { id: 'robber', icon: '🏠', name: '打家劫舍' },
  { id: 'lis', icon: '📈', name: 'LIS' },
  { id: 'knapsack', icon: '🎒', name: '背包 DP' },
  { id: 'unionFind', icon: '🔗', name: '并查集' },
  { id: 'mst', icon: '🌲', name: '最小生成树' },
  { id: 'shortest', icon: '🛣️', name: '最短路' },
  { id: 'topological', icon: '➡️', name: '拓扑排序' },
  { id: 'monoStack', icon: '▥', name: '单调栈' },
  { id: 'monoQueue', icon: '▤', name: '单调队列' },
  { id: 'trie', icon: '🔤', name: 'Trie 树' },
];

export const advancedNotes = {
  twoPointer: '数组有序时，根据两端之和与目标值的大小，只移动一个指针就能排除一批答案。',
  prefix: 'prefix[i] 保存前 i 个数的总和，区间 [l, r] 的和等于 prefix[r] - prefix[l - 1]。',
  difference: '差分数组记录相邻变化；区间加只改两个位置，最后做一次前缀和还原原数组。',
  robber: 'dp[i] 比较「不抢第 i 家」和「抢第 i 家」两种选择，相邻房屋不能同时选择。',
  lis: 'dp[i] 表示以第 i 个数结尾的最长上升子序列长度，答案是所有 dp[i] 的最大值。',
  knapsack: '每件物品只有选或不选两种决策，dp[i][c] 表示前 i 件物品在容量 c 下的最大价值。',
  unionFind: 'find 找到集合代表，union 把两个代表连接起来；路径压缩会让后续查询越来越快。',
  mst: 'Kruskal 按边权从小到大尝试，只接受不会形成环的边，直到连接所有顶点。',
  shortest: 'Dijkstra 每轮确定当前距离最小的未访问顶点，再用它更新相邻顶点的距离。',
  topological: '每次取出一个入度为 0 的顶点，删除它发出的边；如果最终能输出所有顶点，这张有向图就没有环。',
  monoStack: '栈内下标对应的值保持单调；新元素会一次解决所有比它小且仍在等待答案的元素。',
  monoQueue: '队首始终保存当前窗口最大值；队尾删除不可能再成为最大值的元素，队首删除已经离开窗口的元素。',
  trie: 'Trie 把相同前缀只保存一次；查找单词时逐字符沿树向下走，时间主要取决于单词长度。',
};

export const advancedHints = {
  twoPointer: '有序数组中寻找和为 12 的两个数。',
  prefix: '先构造前缀和，再计算区间 [2, 4] 的和。',
  difference: '用差分完成区间 [2, 4] 每个数加 3。',
  robber: '相邻房屋不能同时抢，求能获得的最大金额。',
  lis: '计算最长严格上升子序列，并还原一条答案。',
  knapsack: '容量为 6，每件物品最多选择一次。',
  unionFind: '观察多个小集合怎样逐步合并成一个大集合。',
  mst: '使用 Kruskal 算法连接所有顶点且让总边权最小。',
  shortest: '使用 Dijkstra 算法计算 A 到其他顶点的最短距离。',
  topological: '观察课程依赖图怎样按入度从 0 开始逐步排课。',
  monoStack: '寻找每个数右侧第一个更大的数。',
  monoQueue: '维护长度为 3 的窗口，并快速得到每个窗口的最大值。',
  trie: '依次插入 cat、car、dog，再查找 car。',
};

export const twoPointerArray = [1, 2, 4, 6, 8, 9];
export const prefixArray = [3, 1, 4, 2, 5];
export const differenceArray = [2, 2, 4, 4, 4, 1];
export const robberArray = [2, 7, 9, 3, 1];
export const lisArray = [3, 1, 5, 2, 6, 4, 9];
export const knapsackItems = [
  { weight: 2, value: 3 },
  { weight: 3, value: 4 },
  { weight: 4, value: 5 },
];
export const knapsackCapacity = 6;
export const graphNodes = [
  { id: 'A', x: 70, y: 80 },
  { id: 'B', x: 235, y: 45 },
  { id: 'C', x: 190, y: 170 },
  { id: 'D', x: 385, y: 120 },
  { id: 'E', x: 520, y: 195 },
  { id: 'F', x: 570, y: 65 },
];
export const graphEdges = [
  { id: 'AB', a: 'A', b: 'B', weight: 4 },
  { id: 'AC', a: 'A', b: 'C', weight: 2 },
  { id: 'BC', a: 'B', b: 'C', weight: 1 },
  { id: 'BD', a: 'B', b: 'D', weight: 5 },
  { id: 'CD', a: 'C', b: 'D', weight: 8 },
  { id: 'CE', a: 'C', b: 'E', weight: 10 },
  { id: 'DE', a: 'D', b: 'E', weight: 2 },
  { id: 'DF', a: 'D', b: 'F', weight: 6 },
  { id: 'EF', a: 'E', b: 'F', weight: 3 },
];
export const topologicalNodes = [
  { id: 'A', x: 60, y: 70 },
  { id: 'B', x: 60, y: 190 },
  { id: 'C', x: 235, y: 70 },
  { id: 'D', x: 235, y: 190 },
  { id: 'E', x: 410, y: 130 },
  { id: 'F', x: 575, y: 130 },
];
export const topologicalEdges = [
  { id: 'AC', from: 'A', to: 'C' },
  { id: 'BC', from: 'B', to: 'C' },
  { id: 'BD', from: 'B', to: 'D' },
  { id: 'CE', from: 'C', to: 'E' },
  { id: 'DE', from: 'D', to: 'E' },
  { id: 'EF', from: 'E', to: 'F' },
];
export const trieNodes = [
  { id: 'root', label: '根', x: 325, y: 35 },
  { id: 'c', label: 'c', x: 200, y: 105 },
  { id: 'd', label: 'd', x: 450, y: 105 },
  { id: 'ca', label: 'a', x: 200, y: 175 },
  { id: 'do', label: 'o', x: 450, y: 175 },
  { id: 'cat', label: 't', x: 135, y: 245 },
  { id: 'car', label: 'r', x: 265, y: 245 },
  { id: 'dog', label: 'g', x: 450, y: 245 },
];
export const trieEdges = [
  { from: 'root', to: 'c' }, { from: 'root', to: 'd' },
  { from: 'c', to: 'ca' }, { from: 'd', to: 'do' },
  { from: 'ca', to: 'cat' }, { from: 'ca', to: 'car' },
  { from: 'do', to: 'dog' },
];

export function advancedSteps(id) {
  if (id === 'twoPointer') return twoPointerSteps();
  if (id === 'prefix') return prefixSteps();
  if (id === 'difference') return differenceSteps();
  if (id === 'robber') return robberSteps();
  if (id === 'lis') return lisSteps();
  if (id === 'knapsack') return knapsackSteps();
  if (id === 'unionFind') return unionFindSteps();
  if (id === 'mst') return mstSteps();
  if (id === 'shortest') return shortestSteps();
  if (id === 'topological') return topologicalSteps();
  if (id === 'monoStack') return monotonicStackSteps();
  if (id === 'monoQueue') return monotonicQueueSteps();
  if (id === 'trie') return trieSteps();
  return shortestSteps();
}

function topologicalSteps() {
  const indegrees = Object.fromEntries(topologicalNodes.map(node => [node.id, 0]));
  for (const edge of topologicalEdges) indegrees[edge.to] += 1;
  const queue = topologicalNodes.map(node => node.id).filter(id => indegrees[id] === 0);
  const order = [];
  const removedEdges = [];
  const result = [{ title: '把入度为 0 的顶点入队', message: 'A、B 没有前置课程，可以最先学习。', indegrees: { ...indegrees }, queue: [...queue], order: [], removedEdges: [], activeEdges: [], current: null }];

  while (queue.length) {
    const current = queue.shift();
    order.push(current);
    const activeEdges = topologicalEdges.filter(edge => edge.from === current && !removedEdges.includes(edge.id));
    const newlyZero = [];
    for (const edge of activeEdges) {
      removedEdges.push(edge.id);
      indegrees[edge.to] -= 1;
      if (indegrees[edge.to] === 0) {
        queue.push(edge.to);
        newlyZero.push(edge.to);
      }
    }
    result.push({
      title: `输出 ${current}，删除它发出的边`,
      message: newlyZero.length ? `${newlyZero.join('、')} 的入度变为 0，加入队尾。` : '暂时没有新的顶点入队。',
      indegrees: { ...indegrees }, queue: [...queue], order: [...order], removedEdges: [...removedEdges], activeEdges: activeEdges.map(edge => edge.id), current,
    });
  }
  result.push({ title: `拓扑序列：${order.join(' → ')}`, message: '所有顶点都已输出，说明依赖图中没有环。', indegrees: { ...indegrees }, queue: [], order: [...order], removedEdges: [...removedEdges], activeEdges: [], current: null, done: true });
  return result;
}

function monotonicStackSteps() {
  const array = [2, 1, 5, 3, 4];
  const stack = [];
  const answers = Array(array.length).fill(null);
  const result = [{ title: '准备一个单调递减栈', message: '栈里保存还没有找到「右侧第一个更大值」的下标。', array, stack: [], answers: [...answers], active: null, popped: null }];
  for (let i = 0; i < array.length; i += 1) {
    while (stack.length && array[stack.at(-1)] < array[i]) {
      const popped = stack.pop();
      answers[popped] = array[i];
      result.push({ title: `${array[i]} 比栈顶 ${array[popped]} 大`, message: `${array[popped]} 的右侧第一个更大值就是 ${array[i]}，弹出下标 ${popped + 1}。`, array, stack: [...stack], answers: [...answers], active: i, popped });
    }
    stack.push(i);
    result.push({ title: `把 ${array[i]} 压入栈`, message: `栈内从底到顶保持单调递减：${stack.map(index => array[index]).join('、')}。`, array, stack: [...stack], answers: [...answers], active: i, popped: null });
  }
  result.push({ title: '扫描完成', message: '栈中剩余元素右侧没有更大的值，答案记为 -1。', array, stack: [...stack], answers: answers.map(value => value ?? -1), active: null, popped: null, done: true });
  return result;
}

function monotonicQueueSteps() {
  const array = [1, 3, -1, -3, 5, 3, 6, 7];
  const size = 3;
  const deque = [];
  const outputs = [];
  const result = [{ title: '窗口从左侧开始', message: '双端队列中保存下标，并让对应数值从队首到队尾递减。', array, size, deque: [], outputs: [], active: null, window: [0, -1], removed: [] }];
  for (let i = 0; i < array.length; i += 1) {
    const removed = [];
    while (deque.length && deque[0] <= i - size) removed.push(deque.shift());
    while (deque.length && array[deque.at(-1)] <= array[i]) removed.push(deque.pop());
    deque.push(i);
    if (i >= size - 1) outputs.push(array[deque[0]]);
    result.push({
      title: `窗口右端来到 ${array[i]}`,
      message: i >= size - 1 ? `当前窗口最大值是队首 ${array[deque[0]]}。` : '窗口还没有达到长度 3，继续向右扩展。',
      array, size, deque: [...deque], outputs: [...outputs], active: i, window: [Math.max(0, i - size + 1), i], removed,
    });
  }
  result.push({ title: `所有窗口最大值：${outputs.join('、')}`, message: '每一步都直接读取队首，不需要重新扫描整个窗口。', array, size, deque: [...deque], outputs: [...outputs], active: null, window: [array.length - size, array.length - 1], removed: [], done: true });
  return result;
}

function trieSteps() {
  const created = ['root'];
  const finished = [];
  const result = [{ title: 'Trie 从一个空根节点开始', message: '每条向下的边代表一个字符。', created: [...created], activePath: ['root'], finished: [], words: [], operation: '准备插入' }];
  const paths = {
    cat: ['root', 'c', 'ca', 'cat'],
    car: ['root', 'c', 'ca', 'car'],
    dog: ['root', 'd', 'do', 'dog'],
  };
  for (const word of ['cat', 'car', 'dog']) {
    const path = paths[word];
    for (let i = 1; i < path.length; i += 1) {
      const id = path[i];
      const isNew = !created.includes(id);
      if (isNew) created.push(id);
      result.push({ title: `${isNew ? '创建' : '复用'}字符 ${word[i - 1]}`, message: `插入 ${word}：已经走过前缀 ${word.slice(0, i)}。`, created: [...created], activePath: path.slice(0, i + 1), finished: [...finished], words: [...finished], operation: `插入 ${word}` });
    }
    finished.push(path.at(-1));
    result.push({ title: `单词 ${word} 插入完成`, message: '标记最后一个字符节点，表示这里可以结束一个完整单词。', created: [...created], activePath: [...path], finished: [...finished], words: ['cat', 'car', 'dog'].slice(0, finished.length), operation: `完成 ${word}` });
  }
  result.push({ title: '查找 car：从根逐字符向下', message: '路径 root → c → a → r 全部存在，并且 r 是单词结尾。', created: [...created], activePath: paths.car, finished: [...finished], words: ['cat', 'car', 'dog'], operation: '查找 car', found: true });
  return result;
}

function twoPointerSteps() {
  const target = 12;
  const result = [{ title: '指针放在数组两端', message: 'left 指向最小值，right 指向最大值。', array: twoPointerArray, left: 0, right: twoPointerArray.length - 1, target, sum: 10 }];
  let left = 0;
  let right = twoPointerArray.length - 1;
  while (left < right) {
    const sum = twoPointerArray[left] + twoPointerArray[right];
    result.push({ title: `计算 ${twoPointerArray[left]} + ${twoPointerArray[right]} = ${sum}`, message: sum === target ? '两数之和等于目标值，查找完成。' : sum < target ? '和太小，left 向右移动。' : '和太大，right 向左移动。', array: twoPointerArray, left, right, target, sum, found: sum === target });
    if (sum === target) break;
    if (sum < target) left += 1;
    else right -= 1;
    result.push({ title: sum < target ? '移动 left' : '移动 right', message: `新的搜索区间是下标 ${left + 1} 到 ${right + 1}。`, array: twoPointerArray, left, right, target, sum: twoPointerArray[left] + twoPointerArray[right] });
  }
  return result;
}

function prefixSteps() {
  const prefix = Array(prefixArray.length + 1).fill(null);
  prefix[0] = 0;
  const result = [{ title: '准备 prefix[0] = 0', message: '在原数组前补一个 0，方便统一计算区间和。', array: prefixArray, prefix: [...prefix], active: 0, phase: 'build', query: [1, 3] }];
  for (let i = 1; i <= prefixArray.length; i += 1) {
    prefix[i] = prefix[i - 1] + prefixArray[i - 1];
    result.push({ title: `计算 prefix[${i}] = ${prefix[i]}`, message: `${prefix[i - 1]} + ${prefixArray[i - 1]} = ${prefix[i]}。`, array: prefixArray, prefix: [...prefix], active: i, phase: 'build', query: [1, 3] });
  }
  result.push({ title: '计算区间 [2, 4] 的和', message: `prefix[4] - prefix[1] = ${prefix[4]} - ${prefix[1]} = ${prefix[4] - prefix[1]}。`, array: prefixArray, prefix: [...prefix], active: null, phase: 'query', query: [1, 3], answer: prefix[4] - prefix[1], prefixUsed: [1, 4] });
  return result;
}

function differenceSteps() {
  const diff = Array(differenceArray.length).fill(null);
  const result = [{ title: '准备构造差分数组', message: 'diff[i] 记录 a[i] 与前一个数的差。', array: differenceArray, difference: [...diff], result: [...differenceArray], active: null, phase: 'build', update: [1, 3] }];
  for (let i = 0; i < differenceArray.length; i += 1) {
    diff[i] = i === 0 ? differenceArray[i] : differenceArray[i] - differenceArray[i - 1];
    result.push({ title: `得到 diff[${i + 1}] = ${diff[i]}`, message: i === 0 ? '第一个差分值等于原数组第一个数。' : `${differenceArray[i]} - ${differenceArray[i - 1]} = ${diff[i]}。`, array: differenceArray, difference: [...diff], result: [...differenceArray], active: i, phase: 'build', update: [1, 3] });
  }
  diff[1] += 3;
  result.push({ title: '区间左端加入 +3', message: '修改 diff[2] += 3，表示从下标 2 开始整体增加 3。', array: differenceArray, difference: [...diff], result: [...differenceArray], active: 1, phase: 'update', update: [1, 3] });
  diff[4] -= 3;
  result.push({ title: '区间右端之后加入 -3', message: '修改 diff[5] -= 3，让增加效果在下标 5 前结束。', array: differenceArray, difference: [...diff], result: [...differenceArray], active: 4, phase: 'update', update: [1, 3] });
  const restored = [];
  for (let i = 0; i < diff.length; i += 1) {
    restored[i] = (restored[i - 1] || 0) + diff[i];
    result.push({ title: `还原 a[${i + 1}] = ${restored[i]}`, message: '对差分数组做前缀和，逐个恢复更新后的原数组。', array: differenceArray, difference: [...diff], result: [...restored, ...Array(diff.length - restored.length).fill(null)], active: i, phase: 'restore', update: [1, 3] });
  }
  return result;
}

function robberSteps() {
  const dp = Array(robberArray.length).fill(null);
  const choices = [];
  const result = [{ title: '从第一家开始', message: '每到一家，都比较「抢」和「不抢」两种方案。', array: robberArray, dp: [...dp], active: null, selected: [] }];
  for (let i = 0; i < robberArray.length; i += 1) {
    const skip = i > 0 ? dp[i - 1] : 0;
    const take = robberArray[i] + (i > 1 ? dp[i - 2] : 0);
    dp[i] = Math.max(skip, take);
    const selected = take > skip ? [...(choices[i - 2] || []), i] : [...(choices[i - 1] || [])];
    choices[i] = selected;
    result.push({ title: `处理第 ${i + 1} 家：dp = ${dp[i]}`, message: `不抢得到 ${skip}，抢这家得到 ${take}，选择较大的 ${dp[i]}。`, array: robberArray, dp: [...dp], active: i, selected, skipValue: skip, takeValue: take });
  }
  result.push({ title: `最多获得 ${dp.at(-1)}`, message: `选择第 ${choices.at(-1).map(i => i + 1).join('、')} 家，不会出现相邻房屋。`, array: robberArray, dp: [...dp], active: null, selected: choices.at(-1), done: true });
  return result;
}

function lisSteps() {
  const dp = Array(lisArray.length).fill(1);
  const parent = Array(lisArray.length).fill(-1);
  const result = [{ title: '每个数都能单独成序列', message: '先令所有 dp[i] = 1。', array: lisArray, dp: [...dp], active: null, predecessor: null, path: [] }];
  for (let i = 0; i < lisArray.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      if (lisArray[j] < lisArray[i] && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1;
        parent[i] = j;
      }
    }
    result.push({ title: `以 ${lisArray[i]} 结尾，最长长度为 ${dp[i]}`, message: parent[i] < 0 ? '前面没有更小的数，它暂时单独成为一个序列。' : `接在 ${lisArray[parent[i]]} 后面，长度由 dp[${parent[i] + 1}] + 1 得到。`, array: lisArray, dp: [...dp], active: i, predecessor: parent[i], path: tracePath(parent, i) });
  }
  let end = 0;
  for (let i = 1; i < dp.length; i += 1) if (dp[i] > dp[end]) end = i;
  result.push({ title: `LIS 长度为 ${dp[end]}`, message: `一条最长上升子序列是 ${tracePath(parent, end).map(i => lisArray[i]).join(' → ')}。`, array: lisArray, dp: [...dp], active: null, predecessor: null, path: tracePath(parent, end), done: true });
  return result;
}

function tracePath(parent, end) {
  const path = [];
  for (let at = end; at >= 0; at = parent[at]) path.unshift(at);
  return path;
}

function knapsackSteps() {
  const table = Array.from({ length: knapsackItems.length + 1 }, () => Array(knapsackCapacity + 1).fill(0));
  const result = [{ title: '初始化 DP 表', message: '没有物品时，无论容量多大，最大价值都是 0。', items: knapsackItems, capacity: knapsackCapacity, table: cloneTable(table), row: 0, col: null }];
  for (let i = 1; i <= knapsackItems.length; i += 1) {
    const item = knapsackItems[i - 1];
    for (let c = 0; c <= knapsackCapacity; c += 1) {
      table[i][c] = table[i - 1][c];
      if (c < item.weight) continue;
      const skip = table[i - 1][c];
      const take = table[i - 1][c - item.weight] + item.value;
      table[i][c] = Math.max(skip, take);
      result.push({ title: `物品 ${i}，容量 ${c}：最大价值 ${table[i][c]}`, message: `不选是 ${skip}，选择后是 ${take}，取较大值。`, items: knapsackItems, capacity: knapsackCapacity, table: cloneTable(table), row: i, col: c, fromCol: c - item.weight, decision: take > skip ? 'take' : 'skip' });
    }
  }
  result.push({ title: `背包最大价值为 ${table.at(-1).at(-1)}`, message: '右下角就是所有物品、总容量为 6 时的最优答案。', items: knapsackItems, capacity: knapsackCapacity, table: cloneTable(table), row: knapsackItems.length, col: knapsackCapacity, done: true });
  return result;
}

function cloneTable(table) {
  return table.map(row => [...row]);
}

function unionFindSteps() {
  const names = ['A', 'B', 'C', 'D', 'E', 'F'];
  const parent = Object.fromEntries(names.map(name => [name, name]));
  const operations = [['A', 'B'], ['C', 'D'], ['B', 'C'], ['E', 'F'], ['D', 'F']];
  const result = [{ title: '每个顶点各自成组', message: '开始时每个顶点的父节点都是自己。', parents: { ...parent }, groups: collectGroups(parent, names), operation: null, changedParent: null, newParent: null }];
  for (const [a, b] of operations) {
    const rootA = find(parent, a);
    const rootB = find(parent, b);
    const merged = rootA !== rootB;
    if (merged) parent[rootB] = rootA;
    result.push({ title: `合并 ${a} 和 ${b}`, message: merged ? `将代表 ${rootB} 连接到代表 ${rootA}，箭头显示这条新父子关系。` : '它们已经属于同一个集合，不需要修改。', parents: { ...parent }, groups: collectGroups(parent, names), operation: [a, b], merged, changedParent: merged ? rootB : null, newParent: merged ? rootA : null });
  }
  return result;
}

function find(parent, node) {
  if (parent[node] !== node) parent[node] = find(parent, parent[node]);
  return parent[node];
}

function collectGroups(parent, names) {
  const groups = {};
  for (const name of names) {
    let root = name;
    while (parent[root] !== root) root = parent[root];
    (groups[root] ||= []).push(name);
  }
  return Object.values(groups);
}

function mstSteps() {
  const parent = Object.fromEntries(graphNodes.map(node => [node.id, node.id]));
  const edges = [...graphEdges].sort((a, b) => a.weight - b.weight);
  const accepted = [];
  const considered = [];
  let total = 0;
  const result = [{ title: '按边权从小到大排序', message: `顺序为 ${edges.map(edge => `${edge.id}(${edge.weight})`).join('、')}。`, acceptedEdges: [], consideredEdges: [], activeEdge: null, total: 0 }];
  for (const edge of edges) {
    if (accepted.length === graphNodes.length - 1) break;
    const rootA = find(parent, edge.a);
    const rootB = find(parent, edge.b);
    considered.push(edge.id);
    const acceptedNow = rootA !== rootB;
    if (acceptedNow) {
      parent[rootB] = rootA;
      accepted.push(edge.id);
      total += edge.weight;
    }
    result.push({ title: acceptedNow ? `选择边 ${edge.id}` : `跳过边 ${edge.id}`, message: acceptedNow ? `连接两个不同集合，总权值变为 ${total}。` : '两个端点已经连通，加入这条边会形成环。', acceptedEdges: [...accepted], consideredEdges: [...considered], activeEdge: edge.id, rejectedEdge: acceptedNow ? null : edge.id, total });
  }
  result.push({ title: `最小生成树总权值为 ${total}`, message: '已经选择 n - 1 条边并连接所有顶点。', acceptedEdges: [...accepted], consideredEdges: [...considered], activeEdge: null, total, done: true });
  return result;
}

function shortestSteps() {
  const ids = graphNodes.map(node => node.id);
  const distance = Object.fromEntries(ids.map(id => [id, Infinity]));
  const parent = {};
  const visited = [];
  distance.A = 0;
  const result = [{ title: '从 A 出发', message: 'A 的距离是 0，其他顶点暂时未知。', distances: showDistances(distance), visited: [], current: 'A', activeEdges: [], treeEdges: [], pathEdges: [] }];
  while (visited.length < ids.length) {
    const current = ids.filter(id => !visited.includes(id)).sort((a, b) => distance[a] - distance[b])[0];
    if (!current || distance[current] === Infinity) break;
    const relaxed = [];
    for (const edge of graphEdges.filter(edge => edge.a === current || edge.b === current)) {
      const next = edge.a === current ? edge.b : edge.a;
      if (visited.includes(next)) continue;
      const candidate = distance[current] + edge.weight;
      if (candidate < distance[next]) {
        distance[next] = candidate;
        parent[next] = current;
        relaxed.push(edge.id);
      }
    }
    visited.push(current);
    result.push({ title: `确定顶点 ${current}，距离 ${distance[current]}`, message: relaxed.length ? `通过 ${current} 更新了边 ${relaxed.join('、')} 的另一端。` : '没有产生更短的距离。', distances: showDistances(distance), visited: [...visited], current, activeEdges: relaxed, treeEdges: parentEdges(parent), pathEdges: [] });
  }
  const path = [];
  for (let at = 'F'; at; at = parent[at]) path.unshift(at);
  const pathEdges = path.slice(1).map((node, index) => edgeId(path[index], node));
  result.push({ title: `A 到 F 的最短距离为 ${distance.F}`, message: `最短路径为 ${path.join(' → ')}。`, distances: showDistances(distance), visited: [...visited], current: null, activeEdges: [], treeEdges: parentEdges(parent), pathEdges, done: true });
  return result;
}

function showDistances(distance) {
  return Object.fromEntries(Object.entries(distance).map(([key, value]) => [key, Number.isFinite(value) ? value : '∞']));
}

function parentEdges(parent) {
  return Object.entries(parent).map(([node, previous]) => edgeId(node, previous));
}

function edgeId(a, b) {
  return [a, b].sort().join('');
}
