# Dijkstra最短路算法

## 定义
Dijkstra算法用于求解**单源最短路径**问题，适用于所有边权非负的图。

## 核心思想
- 贪心：每次选择距离源点最近的未访问节点
- 松弛：用该节点更新其邻居的距离

## 算法模板（优先队列优化）

```cpp
#include <iostream>
#include <vector>
#include <queue>
using namespace std;

const int INF = 0x3f3f3f3f;
const int MAXN = 100010;

struct Edge { int to, w; };
vector<Edge> g[MAXN];
int dist[MAXN];

void dijkstra(int start, int n) {
    memset(dist, 0x3f, sizeof(dist));
    dist[start] = 0;

    // 小根堆：{距离, 节点}
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
    pq.push({0, start});

    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (d > dist[u]) continue; // 已经有更短路径

        for (auto& e : g[u]) {
            int v = e.to, w = e.w;
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }
}
```

## 时间复杂度
- 朴素：O(V²)
- 优先队列优化：O((V+E) log V)

## 适用条件
- 所有边权 ≥ 0
- 不适用于负权边（负权用Bellman-Ford或SPFA）

## 常见错误
- 负权边导致算法错误
- 忘记判断 `d > dist[u]` 导致重复松弛
- 邻接表存储格式错误
