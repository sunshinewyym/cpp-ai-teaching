# 前缀和与差分

## 前缀和

### 定义
前缀和数组 `s[i]` 表示原数组 `a[0..i-1]` 的和。

### 一维前缀和

```cpp
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n + 1), s(n + 1, 0);
    for (int i = 1; i <= n; i++) cin >> a[i];

    // 构建前缀和
    for (int i = 1; i <= n; i++)
        s[i] = s[i - 1] + a[i];

    // 查询区间 [l, r] 的和
    int l, r;
    cin >> l >> r;
    cout << s[r] - s[l - 1] << endl;
}
```

### 二维前缀和

```cpp
// s[i][j] = 左上角 (1,1) 到 (i,j) 的矩形和
// 构建：s[i][j] = s[i-1][j] + s[i][j-1] - s[i-1][j-1] + a[i][j]
// 查询 (x1,y1) 到 (x2,y2) 的矩形和：
// ans = s[x2][y2] - s[x1-1][y2] - s[x2][y1-1] + s[x1-1][y1-1]

int prefix2D[1010][1010];

void build2D(vector<vector<int>>& a, int n, int m) {
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++)
            prefix2D[i][j] = prefix2D[i-1][j] + prefix2D[i][j-1]
                            - prefix2D[i-1][j-1] + a[i][j];
}

int query2D(int x1, int y1, int x2, int y2) {
    return prefix2D[x2][y2] - prefix2D[x1-1][y2]
         - prefix2D[x2][y1-1] + prefix2D[x1-1][y1-1];
}
```

## 差分

### 定义
差分是前缀和的逆运算。对区间 [l, r] 加 val，差分数组只需 O(1) 操作。

### 一维差分

```cpp
int diff[100010]; // 差分数组

// 对区间 [l, r] 加 val
void add(int l, int r, int val) {
    diff[l] += val;
    diff[r + 1] -= val;
}

// 还原（求前缀和）
void restore(int n) {
    for (int i = 1; i <= n; i++)
        diff[i] += diff[i - 1];
}
```

### 二维差分

```cpp
// 对 (x1,y1) 到 (x2,y2) 矩形区域加 val
void add2D(int x1, int y1, int x2, int y2, int val) {
    diff[x1][y1] += val;
    diff[x2 + 1][y1] -= val;
    diff[x1][y2 + 1] -= val;
    diff[x2 + 1][y2 + 1] += val;
}
```

## 时间复杂度
- 构建前缀和：O(n)
- 区间查询：O(1)
- 差分区间修改：O(1)

## 典型应用
1. 快速求区间和
2. 区间加、区间求和（差分 + 前缀和）
3. 二维矩阵区域求和
4. 扫描线算法基础

## 常见错误
- 前缀和下标从 1 开始，忘记初始化 s[0] = 0
- 差分还原时遍历顺序错误
- 二维前缀和容斥公式记错
