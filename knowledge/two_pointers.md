# 双指针与滑动窗口

## 定义
双指针是一种通过两个指针在数组/链表上移动来高效解决问题的技术。

## 两种模式

### 1. 对撞指针（左右夹逼）
适用于**有序数组**，左右两端向中间收缩。

```cpp
// 两数之和（有序数组）
vector<int> twoSum(vector<int>& nums, int target) {
    int lo = 0, hi = nums.size() - 1;
    while (lo < hi) {
        int sum = nums[lo] + nums[hi];
        if (sum == target) return {lo, hi};
        else if (sum < target) lo++;
        else hi--;
    }
    return {};
}
```

### 2. 快慢指针
适用于**链表**问题（环检测、中点查找）。

```cpp
// 检测链表环
bool hasCycle(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true;
    }
    return false;
}

// 找链表中点
ListNode* middleNode(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;
}
```

### 3. 同向指针（滑动窗口）
适用于**子数组/子串**问题。

```cpp
// 最小覆盖子串长度
int minSubArrayLen(int target, vector<int>& nums) {
    int lo = 0, sum = 0, ans = INT_MAX;
    for (int hi = 0; hi < nums.size(); hi++) {
        sum += nums[hi];
        while (sum >= target) {
            ans = min(ans, hi - lo + 1);
            sum -= nums[lo++];
        }
    }
    return ans == INT_MAX ? 0 : ans;
}
```

## 滑动窗口通用框架

```cpp
int slidingWindow(string s) {
    int lo = 0, ans = 0;
    unordered_map<char, int> window;

    for (int hi = 0; hi < s.size(); hi++) {
        // 1. 扩大窗口
        char c = s[hi];
        window[c]++;

        // 2. 收缩窗口（满足条件时）
        while (/* 窗口需要收缩 */) {
            char d = s[lo];
            window[d]--;
            lo++;
        }

        // 3. 更新答案
        ans = max(ans, hi - lo + 1);
    }
    return ans;
}
```

## 时间复杂度
- 双指针：O(n) — 每个元素最多被访问两次
- 滑动窗口：O(n) — 每个元素最多进出窗口各一次

## 常见错误
- 滑动窗口收缩条件写错 → 结果不对
- 对撞指针没有先排序
- 快慢指针初始位置搞错（都从 head 开始）
