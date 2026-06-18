# 单调栈与单调队列

## 单调栈

### 定义
栈内元素保持单调递增或递减的栈。用于快速找到每个元素的**下一个更大/更小元素**。

### 核心思想
- 维护一个单调递减栈（找下一个更大元素）
- 遍历数组，当新元素比栈顶大时，弹出栈顶并记录答案

### 模板：下一个更大元素

```cpp
#include <iostream>
#include <vector>
#include <stack>
using namespace std;

// nextGreater[i] = a[i] 右边第一个比它大的元素
vector<int> nextGreaterElement(vector<int>& a) {
    int n = a.size();
    vector<int> ans(n, -1);
    stack<int> st; // 存下标

    for (int i = 0; i < n; i++) {
        while (!st.empty() && a[i] > a[st.top()]) {
            ans[st.top()] = a[i];
            st.pop();
        }
        st.push(i);
    }
    return ans;
}
```

### 每日温度问题

```cpp
// 找每天要等几天才能遇到更高温度
vector<int> dailyTemperatures(vector<int>& temps) {
    int n = temps.size();
    vector<int> ans(n, 0);
    stack<int> st;

    for (int i = 0; i < n; i++) {
        while (!st.empty() && temps[i] > temps[st.top()]) {
            int j = st.top(); st.pop();
            ans[j] = i - j;
        }
        st.push(i);
    }
    return ans;
}
```

### 柱状图最大矩形

```cpp
int largestRectangleArea(vector<int>& heights) {
    int n = heights.size();
    stack<int> st;
    int ans = 0;

    for (int i = 0; i <= n; i++) {
        int h = (i == n) ? 0 : heights[i];
        while (!st.empty() && h < heights[st.top()]) {
            int height = heights[st.top()]; st.pop();
            int width = st.empty() ? i : i - st.top() - 1;
            ans = max(ans, height * width);
        }
        st.push(i);
    }
    return ans;
}
```

---

## 单调队列

### 定义
队列内元素保持单调的双端队列（deque）。用于快速求**滑动窗口最大/最小值**。

### 滑动窗口最大值

```cpp
#include <deque>
#include <vector>
using namespace std;

vector<int> maxSlidingWindow(vector<int>& nums, int k) {
    deque<int> dq; // 存下标，对应值单调递减
    vector<int> ans;

    for (int i = 0; i < nums.size(); i++) {
        // 移除超出窗口的元素
        while (!dq.empty() && dq.front() <= i - k)
            dq.pop_front();

        // 维护单调递减
        while (!dq.empty() && nums[i] >= nums[dq.back()])
            dq.pop_back();

        dq.push_back(i);

        // 窗口形成后记录答案
        if (i >= k - 1)
            ans.push_back(nums[dq.front()]);
    }
    return ans;
}
```

## 时间复杂度
- 单调栈：O(n) — 每个元素最多入栈出栈各一次
- 单调队列：O(n) — 同理

## 常见错误
- 单调栈存值 vs 存下标搞混
- 单调队列忘记移除超出窗口的元素
- 比较方向搞反（递增 vs 递减）
