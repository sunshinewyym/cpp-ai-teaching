# 二分查找（Binary Search）

## 定义
在**有序**数据中，每次将搜索范围缩小一半，直到找到目标或范围为空。

## 核心思想
- 每次排除一半的不可能答案
- 关键在于确定**边界条件**和**循环不变量**

## 模板一：查找目标值

```cpp
#include <iostream>
#include <vector>
using namespace std;

// 返回目标值的下标，不存在返回 -1
int binarySearch(vector<int>& nums, int target) {
    int lo = 0, hi = nums.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2; // 防溢出
        if (nums[mid] == target) return mid;
        else if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
```

## 模板二：查找左边界（第一个 ≥ target）

```cpp
int lowerBound(vector<int>& nums, int target) {
    int lo = 0, hi = nums.size(); // 注意 hi 初始值
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}
```

## 模板三：查找右边界（最后一个 ≤ target）

```cpp
int upperBound(vector<int>& nums, int target) {
    int lo = 0, hi = nums.size();
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] <= target) lo = mid + 1;
        else hi = mid;
    }
    return lo - 1;
}
```

## 二分答案（Binary Search on Answer）

当问题满足**单调性**时，可以对答案进行二分：

```cpp
// 例：最小化最大值问题
bool check(int mid, /* 其他参数 */) {
    // 判断 mid 作为答案是否可行
}

int solve() {
    int lo = minAns, hi = maxAns;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (check(mid)) hi = mid;      // 可行，尝试更小
        else lo = mid + 1;             // 不可行，增大
    }
    return lo;
}
```

## 时间复杂度
- O(log n)

## 典型应用
1. 有序数组查找
2. 二分答案（最小化最大值、最大化最小值）
3. 第 K 小/大问题
4. 旋转数组查找

## 常见错误
- `mid = (lo + hi) / 2` 整数溢出 → 用 `lo + (hi - lo) / 2`
- 边界 `lo < hi` vs `lo <= hi` 搞混
- 二分答案时 check 函数写错导致不满足单调性
- 死循环：`lo = mid` 且 `hi = lo + 1` 时 mid 不变
