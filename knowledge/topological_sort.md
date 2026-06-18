# 拓扑排序（Topological Sort）

## 定义
对**有向无环图（DAG）**的节点进行线性排序，使得对于每条边 (u, v)，u 在 v 前面。

## 核心思想
- 先处理入度为 0 的节点（没有前置依赖）
- 处理后将其邻居的入度减 1
- 重复直到所有节点处理完毕

## BFS 实现（Kahn 算法）

```cpp
#include <iostream>
#include <vector>
#include <queue>
using namespace std;

const int MAXN = 100010;
vector<int> g[MAXN];
int inDeg[MAXN];

vector<int> topoSort(int n) {
    queue<int> q;
    // 1. 入度为 0 的节点入队
    for (int i = 1; i <= n; i++) {
        if (inDeg[i] == 0) q.push(i);
    }

    vector<int> order;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : g[u]) {
            if (--inDeg[v] == 0) {
                q.push(v);
            }
        }
    }

    // 如果排序结果不包含所有节点 → 有环
    if (order.size() != n) return {};
    return order;
}
```

## DFS 实现

```cpp
vector<int> g[MAXN];
bool visited[MAXN];
vector<int> order;

void dfs(int u) {
    visited[u] = true;
    for (int v : g[u]) {
        if (!visited[v]) dfs(v);
    }
    order.push_back(u); // 后序遍历
}

vector<int> topoSortDFS(int n) {
    for (int i = 1; i <= n; i++) {
        if (!visited[i]) dfs(i);
    }
    reverse(order.begin(), order.end());
    return order;
}
```

## 检测有向图是否有环

```cpp
// BFS 方式：如果 topoSort 返回的数组长度 < n，说明有环
bool hasCycle(int n) {
    return topoSort(n).empty();
}
```

## 典型应用
1. **课程安排**：先修课约束
2. **任务调度**：依赖关系排序
3. **编译顺序**：模块依赖
4. **有向图判环**

## 时间复杂度
- O(V + E)

## 常见错误
- 用在无向图上 → 无意义
- 没有检测环（排序结果长度 < 节点数）
- 入度计算遗漏边
- DFS 方式忘记 reverse
