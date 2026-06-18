# DFS（深度优先搜索）

## 定义
DFS是一种图遍历算法，从起点开始，沿着一条路径一直走到底，然后回溯，尝试其他路径。

## 核心数据结构
- **栈（Stack）**：或直接用递归调用栈
- **visited数组**：记录已访问节点

## 算法模板（递归版）

```cpp
#include <iostream>
#include <vector>
using namespace std;

const int MAXN = 100010;
vector<int> g[MAXN];
bool visited[MAXN];

void dfs(int u) {
    visited[u] = true;
    cout << u << " "; // 处理节点

    for (int v : g[u]) {
        if (!visited[v]) {
            dfs(v);
        }
    }
}
```

## 算法模板（非递归版）

```cpp
#include <iostream>
#include <stack>
#include <vector>
using namespace std;

void dfs_iterative(int start, vector<int> g[], bool visited[]) {
    stack<int> st;
    st.push(start);

    while (!st.empty()) {
        int u = st.top();
        st.pop();
        if (visited[u]) continue;
        visited[u] = true;
        cout << u << " ";

        for (int v : g[u]) {
            if (!visited[v]) {
                st.push(v);
            }
        }
    }
}
```

## 时间复杂度
- 邻接表：O(V + E)
- 邻接矩阵：O(V²)

## 典型应用
1. 连通分量
2. 拓扑排序
3. 回溯搜索（全排列、组合）
4. 环检测
5. 路径搜索

## 常见错误
- 递归深度过大 → 栈溢出
- 忘记回溯 → 搜索不完整
- visited标记时机错误
