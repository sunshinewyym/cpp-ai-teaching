const fs = require('fs');
const path = require('path');

const KNOWLEDGE_DIR = path.join(__dirname, '..', '..', 'knowledge');

/**
 * Load relevant knowledge base files based on topic
 */
function loadKnowledge(topic = '') {
  const t = topic.toLowerCase();
  const files = [];

  const mapping = [
    { pattern: /bfs|广度优先|层序/i, file: 'bfs.md' },
    { pattern: /dfs|深度优先|回溯/i, file: 'dfs.md' },
    { pattern: /dijkstra|最短路|权值/i, file: 'dijkstra.md' },
    { pattern: /并查集|union.?find/i, file: 'unionfind.md' },
    { pattern: /dp|动态规划|背包|记忆化/i, file: 'dp.md' },
    { pattern: /二分|折半|binary.?search|单调性/i, file: 'binary_search.md' },
    { pattern: /贪心|greedy|局部最优/i, file: 'greedy.md' },
    { pattern: /双指针|滑动窗口|two.?pointer|sliding/i, file: 'two_pointers.md' },
    { pattern: /拓扑|topological|dag|有向无环|入度/i, file: 'topological_sort.md' },
    { pattern: /最小生成树|mst|kruskal|prim/i, file: 'mst.md' },
    { pattern: /二叉树|前序|中序|后序|层序|lca|树形/i, file: 'binary_tree.md' },
    { pattern: /排序|sort|快排|归并|堆排/i, file: 'sorting.md' },
    { pattern: /前缀和|差分|区间和|prefix/i, file: 'prefix_sum.md' },
    { pattern: /单调栈|单调队列|next.?greater/i, file: 'monotonic_stack.md' },
    { pattern: /质数|素数|筛法|快速幂|gcd|lcm|数论|取模/i, file: 'number_theory.md' },
  ];

  for (const m of mapping) {
    if (m.pattern.test(t)) {
      const fp = path.join(KNOWLEDGE_DIR, m.file);
      if (fs.existsSync(fp)) {
        files.push(fs.readFileSync(fp, 'utf-8'));
      }
    }
  }

  return files.join('\n\n---\n\n');
}

/**
 * Build augmented system prompt with knowledge
 */
function augmentWithKnowledge(basePrompt, topic) {
  const knowledge = loadKnowledge(topic);
  if (!knowledge) return basePrompt;

  return `${basePrompt}

## 参考知识库
以下是与当前课程相关的教学参考资料，请基于这些内容回答，确保准确性和一致性：

${knowledge}`;
}

module.exports = { loadKnowledge, augmentWithKnowledge };
