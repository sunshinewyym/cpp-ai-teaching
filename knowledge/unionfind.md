# 并查集（Union-Find）

## 定义
并查集是一种用于处理**不相交集合合并与查询**的数据结构，支持两个核心操作：
- **Find**：查找元素所属集合的代表元素（根节点）
- **Union**：合并两个集合

## 核心优化
1. **路径压缩**：查找时将节点直接连到根，降低后续查询复杂度
2. **按秩合并**：合并时将小树挂到大树下，保持树的平衡

## 算法模板

```cpp
#include <iostream>
using namespace std;

const int MAXN = 100010;
int fa[MAXN], rk[MAXN];

void init(int n) {
    for (int i = 1; i <= n; i++) {
        fa[i] = i;
        rk[i] = 1;
    }
}

int find(int x) {
    if (fa[x] == x) return x;
    return fa[x] = find(fa[x]); // 路径压缩
}

void merge(int x, int y) {
    int fx = find(x), fy = find(y);
    if (fx == fy) return;
    // 按秩合并
    if (rk[fx] < rk[fy]) swap(fx, fy);
    fa[fy] = fx;
    if (rk[fx] == rk[fy]) rk[fx]++;
}

bool same(int x, int y) {
    return find(x) == find(y);
}
```

## 时间复杂度
- 单次操作：近似 O(α(n))，α为反阿克曼函数，实际可视为 O(1)

## 典型应用
1. 判断图的连通性
2. Kruskal最小生成树
3. 社交网络（朋友圈）
4. 等价类合并

## 常见错误
- 忘记初始化 → 每个节点是自己的根
- find函数没有路径压缩 → 退化为链表
- merge时没有先find → 直接合并非根节点
