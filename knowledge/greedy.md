# 贪心算法（Greedy）

## 定义
在每一步选择中都采取**当前最优**的选择，希望最终得到全局最优解。

## 核心思想
- **局部最优 → 全局最优**
- 不回退，不后悔
- 关键：证明贪心策略的正确性

## 贪心 vs DP

| 特征 | 贪心 | 动态规划 |
|------|------|----------|
| 决策 | 每步只看当前最优 | 考虑所有子问题 |
| 回退 | 不回退 | 需要回溯/递推 |
| 正确性 | 需要证明 | 天然正确 |
| 效率 | 通常更快 | 可能更慢 |

## 经典问题

### 1. 活动选择问题

```cpp
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

struct Activity { int start, end; };

// 按结束时间排序，每次选最早结束的
int maxActivities(vector<Activity>& acts) {
    sort(acts.begin(), acts.end(), [](const Activity& a, const Activity& b) {
        return a.end < b.end;
    });

    int count = 0, lastEnd = -1;
    for (auto& a : acts) {
        if (a.start >= lastEnd) {
            count++;
            lastEnd = a.end;
        }
    }
    return count;
}
```

### 2. 区间调度（不重叠区间数）

```cpp
int eraseOverlapIntervals(vector<pair<int,int>>& intervals) {
    sort(intervals.begin(), intervals.end(), [](auto& a, auto& b) {
        return a.second < b.second;
    });
    int count = 0, prev = INT_MIN;
    for (auto& [s, e] : intervals) {
        if (s >= prev) prev = e;
        else count++; // 删除当前区间
    }
    return count;
}
```

### 3. 分糖果 / 分配问题

```cpp
// 每个孩子有需求因子，每个糖果有大小
// 求最多能满足几个孩子
int findContentChildren(vector<int>& g, vector<int>& s) {
    sort(g.begin(), g.end());
    sort(s.begin(), s.end());
    int i = 0, j = 0;
    while (i < g.size() && j < s.size()) {
        if (s[j] >= g[i]) i++; // 满足一个孩子
        j++;
    }
    return i;
}
```

## 贪心正确性证明
1. **交换论证**：假设最优解与贪心解不同，通过交换证明不会变差
2. **归纳法**：证明每一步贪心选择不会排除全局最优解

## 常见错误
- 没有证明贪心正确性就使用 → 可能得到错误答案
- 排序依据选错（按开始时间 vs 按结束时间）
- 贪心和 DP 混淆
