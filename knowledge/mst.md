# 最小生成树（MST）

## 定义
在带权无向连通图中，选择 n-1 条边连接所有 n 个节点，使得总权值最小。

## Kruskal 算法

### 核心思想
- 按边权从小到大排序
- 贪心选择不形成环的边
- 使用**并查集**判断是否形成环

```cpp
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

struct Edge { int u, v, w; };

const int MAXN = 100010;
int fa[MAXN];

int find(int x) {
    return fa[x] == x ? x : fa[x] = find(fa[x]);
}

int kruskal(int n, vector<Edge>& edges) {
    // 初始化并查集
    for (int i = 1; i <= n; i++) fa[i] = i;

    // 按边权排序
    sort(edges.begin(), edges.end(), [](const Edge& a, const Edge& b) {
        return a.w < b.w;
    });

    int totalWeight = 0, edgeCount = 0;
    for (auto& e : edges) {
        int fu = find(e.u), fv = find(e.v);
        if (fu != fv) {
            fa[fu] = fv;
            totalWeight += e.w;
            edgeCount++;
            if (edgeCount == n - 1) break;
        }
    }

    // edgeCount < n-1 说明图不连通
    return edgeCount == n - 1 ? totalWeight : -1;
}
```

## Prim 算法

### 核心思想
- 从任意节点开始
- 每次选择连接已选集合和未选集合的最小权边
- 类似 Dijkstra

```cpp
#include <vector>
#include <queue>
using namespace std;

struct Edge { int to, w; };

int prim(int start, int n, vector<vector<Edge>>& g) {
    vector<bool> inMST(n + 1, false);
    // 小根堆：{权值, 节点}
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
    pq.push({0, start});

    int totalWeight = 0, count = 0;
    while (!pq.empty() && count < n) {
        auto [w, u] = pq.top(); pq.pop();
        if (inMST[u]) continue;
        inMST[u] = true;
        totalWeight += w;
        count++;

        for (auto& e : g[u]) {
            if (!inMST[e.to]) {
                pq.push({e.w, e.to});
            }
        }
    }

    return count == n ? totalWeight : -1;
}
```

## 算法选择

| 算法 | 时间复杂度 | 适用场景 |
|------|-----------|----------|
| Kruskal | O(E log E) | 稀疏图（边少） |
| Prim | O(E log V) | 稠密图（边多） |

## 常见错误
- Kruskal 忘记用并查集 → 无法判断环
- Prim 忘记标记 inMST → 重复计算
- 图不连通时没有判断 → 返回错误结果
- 边权排序不稳定 → 结果不唯一但正确
