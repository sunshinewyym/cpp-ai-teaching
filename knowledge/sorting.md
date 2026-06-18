# 排序算法

## 常见排序对比

| 算法 | 平均 | 最坏 | 空间 | 稳定 |
|------|------|------|------|------|
| 冒泡排序 | O(n²) | O(n²) | O(1) | ✓ |
| 选择排序 | O(n²) | O(n²) | O(1) | ✗ |
| 插入排序 | O(n²) | O(n²) | O(1) | ✓ |
| 归并排序 | O(nlogn) | O(nlogn) | O(n) | ✓ |
| 快速排序 | O(nlogn) | O(n²) | O(logn) | ✗ |
| 堆排序 | O(nlogn) | O(nlogn) | O(1) | ✗ |

## 快速排序

```cpp
#include <iostream>
#include <vector>
using namespace std;

void quickSort(vector<int>& a, int lo, int hi) {
    if (lo >= hi) return;
    int pivot = a[lo + (hi - lo) / 2];
    int i = lo, j = hi;
    while (i <= j) {
        while (a[i] < pivot) i++;
        while (a[j] > pivot) j--;
        if (i <= j) swap(a[i++], a[j--]);
    }
    quickSort(a, lo, j);
    quickSort(a, i, hi);
}
```

## 归并排序

```cpp
void mergeSort(vector<int>& a, int lo, int hi) {
    if (lo >= hi) return;
    int mid = lo + (hi - lo) / 2;
    mergeSort(a, lo, mid);
    mergeSort(a, mid + 1, hi);

    // 合并
    vector<int> tmp;
    int i = lo, j = mid + 1;
    while (i <= mid && j <= hi) {
        if (a[i] <= a[j]) tmp.push_back(a[i++]);
        else tmp.push_back(a[j++]);
    }
    while (i <= mid) tmp.push_back(a[i++]);
    while (j <= hi) tmp.push_back(a[j++]);
    for (int k = 0; k < tmp.size(); k++) a[lo + k] = tmp[k];
}
```

## 堆排序

```cpp
void heapify(vector<int>& a, int n, int i) {
    int largest = i;
    int l = 2 * i + 1, r = 2 * i + 2;
    if (l < n && a[l] > a[largest]) largest = l;
    if (r < n && a[r] > a[largest]) largest = r;
    if (largest != i) {
        swap(a[i], a[largest]);
        heapify(a, n, largest);
    }
}

void heapSort(vector<int>& a) {
    int n = a.size();
    // 建堆
    for (int i = n / 2 - 1; i >= 0; i--)
        heapify(a, n, i);
    // 排序
    for (int i = n - 1; i > 0; i--) {
        swap(a[0], a[i]);
        heapify(a, i, 0);
    }
}
```

## 常见错误
- 快排 pivot 选择不当 → 最坏 O(n²)
- 归并排序合并时下标越界
- 堆排序 heapify 递归终止条件
- 排序比较函数不满足严格弱序 → 未定义行为

## 选择建议
- **竞赛首选**：`sort()` (STL，introsort)
- **需要稳定排序**：`stable_sort()`
- **求第K大**：`nth_element()` O(n)
- **自定义比较**：传入 lambda
