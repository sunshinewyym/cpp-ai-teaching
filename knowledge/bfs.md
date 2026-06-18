# BFS（广度优先搜索）

## 定义
BFS是一种图遍历算法，从起点开始，逐层向外扩展，先访问所有距离为1的节点，再访问距离为2的节点，依此类推。

## 核心数据结构
- **队列（Queue）**：先进先出，保证逐层扩展
- **visited数组**：记录已访问节点，防止重复

## 算法模板

```cpp
#include <iostream>
#include <queue>
#include <vector>
using namespace std;

const int MAXN = 100010;
vector<int> g[MAXN];
bool visited[MAXN];

void bfs(int start) {
    queue<int> q;
    q.push(start);
    visited[start] = true;

    while (!q.empty()) {
        int u = q.front();
        q.pop();
        cout << u << " "; // 处理节点

        for (int v : g[u]) {
            if (!visited[v]) {
                visited[v] = true;
                q.push(v);
            }
        }
    }
}
```

## 时间复杂度
- 邻接表：O(V + E)
- 邻接矩阵：O(V²)

## 典型应用
1. 最短路径（无权图）
2. 层序遍历
3. 连通分量计数
4. 最小步数问题（迷宫、八数码）

## 常见错误
- 忘记标记visited → 无限循环
- 队列操作顺序错误（push/front/pop）
- 图存储方式不匹配
