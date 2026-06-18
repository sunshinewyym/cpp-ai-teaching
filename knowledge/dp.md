# 动态规划（Dynamic Programming）

## 定义
动态规划是一种通过将复杂问题分解为重叠子问题来求解最优化问题的方法。

## 核心要素
1. **最优子结构**：问题的最优解包含子问题的最优解
2. **重叠子问题**：子问题会被重复计算
3. **状态定义**：用dp[i]表示什么
4. **转移方程**：dp[i]如何从dp[i-1]等推导

## 经典模型

### 01背包
```cpp
#include <iostream>
using namespace std;

const int MAXN = 1010;
int w[MAXN], v[MAXN]; // 重量、价值
int dp[MAXN]; // dp[j] = 容量为j时的最大价值

int knapsack01(int n, int W) {
    for (int i = 1; i <= n; i++) {
        for (int j = W; j >= w[i]; j--) { // 逆序遍历！
            dp[j] = max(dp[j], dp[j - w[i]] + v[i]);
        }
    }
    return dp[W];
}
```

### 完全背包
```cpp
int knapsack_complete(int n, int W) {
    for (int i = 1; i <= n; i++) {
        for (int j = w[i]; j <= W; j++) { // 正序遍历
            dp[j] = max(dp[j], dp[j - w[i]] + v[i]);
        }
    }
    return dp[W];
}
```

### 最长公共子序列（LCS）
```cpp
int lcs(string a, string b) {
    int n = a.size(), m = b.size();
    int dp[n+1][m+1] = {};
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (a[i-1] == b[j-1])
                dp[i][j] = dp[i-1][j-1] + 1;
            else
                dp[i][j] = max(dp[i-1][j], dp[i][j-1]);
        }
    }
    return dp[n][m];
}
```

## 解题步骤
1. 定义状态：dp[i] 表示什么？
2. 写转移方程：dp[i] = f(dp[i-1], ...)
3. 确定初始值：dp[0] = ?
4. 确定遍历顺序
5. 确定答案位置

## 常见错误
- 状态定义不清晰 → 转移方程写错
- 遍历顺序错误（01背包正序 → 变成完全背包）
- 数组越界
- 初始值设置错误
