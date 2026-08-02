#!/usr/bin/env python3
"""Build the GESP objective-question library from the source PDFs.

Only the single-choice and true/false sections are imported. Programming
sections are intentionally ignored. This is kept as a repeatable importer so
the remaining GESP papers can be refreshed without hand editing the data file.
"""

from __future__ import annotations

import io
import json
import os
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

import pypdf
import pdfplumber
import pypdfium2 as pdfium
from PIL import Image, ImageEnhance


ROOT = Path(r"C:\Users\sunsh\WorkBuddy\20260412143556")
OUT = Path(__file__).resolve().parents[1] / "src" / "data" / "gespPapers.js"
OCR_CACHE_PATH = Path(__file__).with_name("gesp_ocr_cache.json")
TESSERACT = Path(os.environ.get("GESP_TESSERACT", r"C:\Program Files\PDF24\tesseract\tesseract.exe"))
TESSDATA = Path(os.environ.get("GESP_TESSDATA", r"C:\Users\sunsh\.cache\gesp-ocr\tessdata"))
OCR_START = "[[GESP_CPP_CODE]]"
OCR_END = "[[/GESP_CPP_CODE]]"
OCR_CACHE = json.loads(OCR_CACHE_PATH.read_text(encoding="utf-8")) if OCR_CACHE_PATH.exists() else {}
RENDER_CACHE: dict[tuple[str, int], Image.Image] = {}

OCR_OVERRIDES = {
    ("GESP_2023年3月_C++2级试题.pdf", 5, "Image43"): """#include <iostream>
using namespace std;
int main() {
    int a = 10, b = 50;
    __________________; // 在此处填入代码
    b -= a;
    a += b;
    cout << a << " " << b << endl;
    return 0;
}""",
    ("GESP_2023年3月_C++2级试题.pdf", 5, "Image44"): """#include <iostream>
using namespace std;
int main() {
    int cnt = 0;
    for (char ch = '1'; ch <= '9'; ch++)
        if (________________) // 在此处填入代码
            cnt++;
    cout << cnt << endl;
    return 0;
}""",
    ("GESP_2023年3月_C++2级试题.pdf", 6, "Image52"): """#include <iostream>
using namespace std;
int main() {
    int n = 17;
    bool isprime = true;
    for (int i = 2; i <= n; i++)
        if (n % i == 0)
            isprime = false;
    cout << isprime << endl;
    return 0;
}""",
    ("GESP_2023年9月_C++2级试题.pdf", 2, "X18"): """int N = 0;
cin >> N;
for (________________) // 此处填写代码
    if (!(N % i))
        cout << i << ' ';""",
    ("GESP_2023年9月_C++2级试题.pdf", 3, "X22"): """int N = 0;
cout << "请输入行列数量:";
cin >> N;
for (int i = 1; i < N + 1; i++) {
    for (int j = 1; j < N + 1; j++)
        if (________________) // 此处填写代码
            cout << 1 << " ";
        else
            cout << 0 << " ";
    cout << endl;
}""",
    ("GESP_2023年9月_C++2级试题.pdf", 3, "X23"): """int N = 0, i = 0;
cout << "请输入一个大于等于2的正整数:";
cin >> N;
for (i = 2; i < N; i++)
    if (N % i == 0) {
        cout << "非质数";
        __________________; // 此处填写代码
    }
if (i == N)
    cout << "是质数";""",
    ("GESP_2023年9月_C++2级试题.pdf", 4, "X27"): """int cnt = 0;
for (int i = 1; i < 9; i++)
    for (int j = 1; j < i; j += 2)
        cnt += 1;
cout << cnt;""",
    ("GESP_2023年9月_C++2级试题.pdf", 4, "X28"): """int cnt = 0;
for (int i = 1; i < 13; i += 3)
    for (int j = 1; j < i; j += 2)
        if (i * j % 2 == 0)
            break;
        else
            cnt += 1;
cout << cnt;""",
    ("GESP_2023年9月_C++2级试题.pdf", 5, "X31"): """int x = 1;
while (x < 100) {
    if (!(x % 3))
        cout << x << ",";
    else if (x / 10)
        break;
    x += 2;
}
cout << x;""",
    ("GESP_2023年9月_C++2级试题.pdf", 5, "X33"): """int N = 0;
cout << "请输入行列数量:";
cin >> N;
for (int i = 1; i < N + 1; i++) {
    for (int j = 0; j < i; j++)
        cout << __________________; // 此处填写代码
    cout << endl;
}""",
    ("GESP_2023年9月_C++2级试题.pdf", 6, "X37"): """int lineCount = 0;
cout << "请输入行数量:";
cin >> lineCount;
for (int i = 0; i < lineCount; i++) {
    for (int j = 0; j < __________________; j++) // 此处填写代码
        cout << ' ';
    for (int j = 1; j < i + 1; j++)
        cout << j << " ";
    for (int j = i + 1; j > 0; j--)
        cout << j << " ";
    cout << endl;
}""",
    ("GESP_2023年9月_C++2级试题.pdf", 6, "X38"): """double totalScore = 0; // 总分
int studCount = 0; // 总人数
while (________________) { // 此处填写代码
    cin >> score;
    if (score < 0)
        break;
    totalScore += score;
    studCount += 1;
}
cout << "平均分=" << totalScore / studCount;""",
    ("GESP_2023年9月_C++2级试题.pdf", 7, "X41"): """int cnt = 0;
for (int i = 1; i < 10; i++) {
    cnt += 1;
    i += 1;
}
cout << cnt;""",
    ("GESP_2023年9月_C++2级试题.pdf", 7, "X42"): """int rst = 0;
for (int i = -100; i < 100; i += 2)
    rst += i;
cout << rst;""",
    ("GESP_2023年9月_C++2级试题.pdf", 7, "X43"): """int rst = 0;
for (int i = 0; i < 10; i += 2)
    rst += i;
cout << rst;""",
    ("GESP_2023年9月_C++4级试题.pdf", 4, "X22"): """#include <iostream>
using namespace std;

int main() {
    int fib[10];
    fib[0] = 0;
    fib[1] = 1;
    for (int i = 2; i < 10; i++)
        fib[i] = fib[i - 1] + fib[i - 2];
    cout << fib[10] << endl;
    return 0;
}""",
    ("GESP_2023年9月_C++4级试题.pdf", 4, "X23"): """void BubbleSort(int array[], int n) {
    for (int i = n; i >= 2; i--)
        for (________________) // 在此处填入代码
            if (array[j] > array[j + 1]) {
                int t = array[j];
                array[j] = array[j + 1];
                array[j + 1] = t;
            }
}""",
    ("GESP_2023年9月_C++2级试题.pdf", 4, "X26"): """int N = 9;
for (int i = 2; i < N; i++)
    if (N % i)
        cout << "1#";
cout << "0" << endl;""",
    ("GESP_2023年12月_C++2级试题.pdf", 4, "X28"): """cnt = 0;
for (i = 0; i < 5; i++)
    for (j = 0; j < i; j++)
        cnt += 1;
cout << cnt;""",
    ("GESP_2023年12月_C++4级试题.pdf", 6, "X41"): """ifstream filein;
int buff;
filein.open("1.txt");
filein >> buff;
cout << buff << endl;""",
    ("GESP_2023年6月_C++3级试题.pdf", 4, "IM37"): """#include <iostream>
using namespace std;
int main() {
    int a = 12, b = 24;
    __________________; // 在此处填入代码
    a = a ^ b;
    b = a ^ b;
    cout << a << " " << b << endl;
    return 0;
}""",
    ("GESP_2023年6月_C++3级试题.pdf", 5, "IM40"): """#include <iostream>
using namespace std;
int main() {
    int array[5] = {3, 7, 5, 2, 4};
    int min = 0;
    for (int i = 0; i < 5; i++)
        if (________________) // 在此处填写代码
            min = array[i];
    cout << min << endl;
    return 0;
}""",
    ("GESP_2023年6月_C++3级试题.pdf", 5, "IM41"): """#include <iostream>
using namespace std;
int main() {
    int array[5] = {1, 2, 4, 8, 16};
    int res = 0;
    for (int i = 0; i < 5; i++)
        ________________; // 在此处填写代码
    cout << res << endl;
    return 0;
}""",
    ("GESP_2023年9月_C++3级试题.pdf", 4, "X24"): """#include <iostream>
using namespace std;
int main() {
    int array[10];
    for (int i = 0; i < 10; i++)
        array[i] = i;
    for (int p = 2; p < 10; p++)
        if (array[p] == p)
            for (int n = p; n < 10; n += p)
                array[n] = array[n] / p * (p - 1);
    int res = 0;
    for (int n = 1; n < 10; n++)
        res += array[n];
    cout << res << endl;
    return 0;
}""",
    ("GESP_2023年6月_C++4级试题.pdf", 4, "IM37"): """#include <iostream>
using namespace std;
void xchg(________________) { // 在此处填入代码
    int t = *x;
    *x = *y;
    *y = t;
}
int main() {
    int a = 10, b = 20;
    xchg(&a, &b);
    cout << a << " " << b << endl;
    return 0;
}""",
    ("GESP_2023年12月_C++4级试题.pdf", 3, "X28"): """int point(int *p)
{
    return *p * *p;
}
int main()
{
    int a = 20;
    int *p = &a;
    *p = point(p);
    cout << *p << endl;
}""",
    ("GESP_2023年9月_C++5级试题.pdf", 3, "X21"): """#include <iostream>
using namespace std;
// 递归实现汉诺塔，将N个圆盘从A通过B移动C
// 圆盘从底到顶，半径必须从大到小
void Hanoi(string A, string B, string C, int N) {
    if (N == 1) {
        cout << A << " -> " << C << endl;
    } else {
        Hanoi(A, C, B, N - 1);
        cout << A << " -> " << C << endl;
        __________; // 此处填写代码
    }
}
int main() {
    Hanoi("甲", "乙", "丙", 3);
    return 0;
}""",
    ("GESP_2023年9月_C++5级试题.pdf", 4, "X24"): """#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

bool isOdd(int N) {
    return N % 2 == 1;
}
bool compare(int a, int b) {
    if (a % 2 == 0 && b % 2 == 1)
        return true;
    return false;
}
int main() {
    vector<int> lstA; // lstA是一个整型列表
    for (int i = 1; i < 100; i++)
        lstA.push_back(i);
    // 将lstA成员按比较函数执行结果排序
    sort(lstA.begin(), lstA.end(), __________); // 此处填写代码1

    vector<int> lstB;
    for (int i = 0; i < lstA.size(); i++) // lstB成员全为奇数
        if (__________) // 此处填写代码2
            lstB.push_back(lstA[i]);

    cout << "lstA: ";
    for (int i = 0; i < lstA.size(); i++)
        cout << lstA[i] << " ";
    cout << endl;

    cout << "lstB: ";
    for (int i = 0; i < lstB.size(); i++)
        cout << lstB[i] << " ";
    cout << endl;
    return 0;
}""",
    ("GESP_2023年9月_C++5级试题.pdf", 6, "X32"): """#include <iostream>
#include <cmath>
using namespace std;

bool isPrimeA(int N) {
    if (N < 2)
        return false;
    for (int i = 2; i < N; i++)
        if (N % i == 0)
            return false;
    return true;
}
bool isPrimeB(int N) {
    if (N < 2)
        return false;
    int endNum = int(sqrt(N));
    for (int i = 2; i <= endNum; i++)
        if (N % i == 0)
            return false;
    return true;
}
int main() {
    cout << boolalpha;
    cout << isPrimeA(13) << " " << isPrimeB(13) << endl;
    return 0;
}""",
    ("GESP_2023年9月_C++5级试题.pdf", 8, "X37"): """#include <iostream>
using namespace std;

void mergeSort(int *listData, int start, int end);
void merge(int *listData, int start, int middle, int end);

void mergeSort(int *listData, int start, int end) {
    if (start >= end)
        return;
    int middle = (start + end) / 2;
    mergeSort(listData, start, middle);
    mergeSort(listData, middle + 1, end);
    merge(listData, start, middle, end);
}

void merge(int *listData, int start, int middle, int end) {
    int leftSize = middle - start + 1;
    int rightSize = end - middle;
    int *left = new int[leftSize];
    int *right = new int[rightSize];
    for (int i = 0; i < leftSize; i++)
        left[i] = listData[start + i];
    for (int j = 0; j < rightSize; j++)
        right[j] = listData[middle + 1 + j];
    int i = 0, j = 0, k = start;
    while (i < leftSize && j < rightSize) {
        if (left[i] <= right[j]) {
            listData[k] = left[i];
            i++;
        } else {
            listData[k] = right[j];
            j++;
        }
        k++;
    }
    while (i < leftSize) {
        listData[k] = left[i];
        i++;
        k++;
    }
    while (j < rightSize) {
        listData[k] = right[j];
        j++;
        k++;
    }
    delete[] left;
    delete[] right;
}
int main() {
    int lstA[] = {1, 3, 2, 7, 11, 5, 3};
    int size = sizeof(lstA) / sizeof(lstA[0]);
    mergeSort(lstA, 0, size - 1); // 对lstA执行归并排序
    for (int i = 0; i < size; i++)
        cout << lstA[i] << " ";
    cout << endl;
}""",
    ("GESP_2023年9月_C++5级试题.pdf", 9, "X37"): "",
    ("GESP_2023年12月_C++5级试题.pdf", 1, "X11"): """int fiboA(int N)
{
    if (N == 1 || N == 2)
        return 1;
    return fiboA(N - 1) + fiboA(N - 2);
}
int fiboB(int N)
{
    if (N == 1 || N == 2)
        return 1;
    int last2 = 1, last1 = 1;
    int nowVal = 0;
    for (int i = 2; i < N; i++)
    {
        nowVal = last1 + last2;
        last2 = last1;
        last1 = nowVal;
    }
    return nowVal;
}""",
    ("GESP_2023年12月_C++5级试题.pdf", 1, "X14"): """void mergeSort(int SList[], int TList[], int s, int t, int len)
{
    if (s == t) {
        TList[s] = SList[s];
        return;
    }
    int *T2 = new int[len]; // 保存中间结果
    int m = (s + t) / 2;
    ______________________________;
    merge(T2, SList, s, m, t);
    delete T2;
    return;
}""",
    ("GESP_2023年12月_C++5级试题.pdf", 2, "X19"): """int stepCount = 0;
int fracA(int N)
{
    stepCount += 1;
    cout << stepCount << "->";
    int rtn = 1;
    for (int i = 1; i <= N; i++)
        rtn *= i;
    return rtn;
}
int fracB(int N)
{
    stepCount += 1;
    cout << stepCount << "->";
    if (N == 1)
        return 1;
    return N * fracB(N - 1);
}
int main()
{
    cout << fracA(5);
    cout << "<===>";
    cout << fracB(5);
    return 0;
}""",
    ("GESP_2023年12月_C++5级试题.pdf", 2, "X20"): """bool isEven(int N)
{
    return N % 2 == 0;
}
void swap(int &a, int &b)
{
    int t;
    t = a, a = b, b = t;
    return;
}
void sortA(int lstA[], int n)
{
    int i, j, t;
    for (i = n - 1; i > 0; i--)
        for (j = 0; j < i; j++)
            if (________________)
                swap(lstA[j], lstA[j + 1]);
    return;
}""",
    ("GESP_2023年12月_C++5级试题.pdf", 3, "X23"): """typedef struct Node {
    string str;
    int ref;
    struct Node *next, *prev;
} Node;
Node *Insert(Node *pHead, string s)
{
    Node *p = pHead->next;
    Node *q;
    while (p) {
        if (p->str == s) {
            p->ref++;
            p->next->prev = p->prev;
            p->prev->next = p->next;
            break;
        }
        p = p->next;
    }
    if (!p) {
        p = new Node;
        p->str = s;
        p->ref = 0;
        p->next = p->prev = NULL;
    }
    ______________________________;
    pHead->next = p, p->prev = pHead;
    return pHead;
}""",
    ("GESP_2023年12月_C++5级试题.pdf", 3, "X24"): """int rc;
int foo(int x, int y)
{
    int r;
    if (y == 0)
        r = x;
    else {
        r = foo(y, x % y);
        rc++;
    }
    return r;
}""",
    ("GESP_2023年12月_C++5级试题.pdf", 4, "X28"): """bool isPrimeA(int N)
{
    if (N < 2)
        return false;
    for (int i = 2; i <= N / 2; i++)
        if (N % i == 0)
            return false;
    return true;
}
bool isPrimeB(int N)
{
    if (N < 2)
        return false;
    for (int i = 2; i <= sqrt(N); i++)
        if (N % i == 0)
            return false;
    return true;
}""",
    ("GESP_2023年12月_C++5级试题.pdf", 5, "X31"): """int _binarySearch(vector<int> lst, int Low, int High, int Target)
{
    if (Low > High)
        return -1;
    int Mid = (Low + High) / 2;
    if (Target == lst[Mid])
        return Mid;
    else if (Target < lst[Mid])
        return _binarySearch(lst, Low, Mid - 1, Target);
    else
        return _binarySearch(lst, Mid + 1, High, Target);
}
int bSearch(vector<int> lst, int Val)
{
    return _binarySearch(lst, 0, lst.size(), Val);
}""",
    ("GESP_2023年12月_C++5级试题.pdf", 5, "X32"): """vector<int> operator+(vector<int> a, vector<int> b)
{
    vector<int> c;
    int t = 0;
    for (int i = 0; i < a.size() || i < b.size(); i++)
    {
        if (i < a.size()) t = t + a[i];
        if (i < b.size()) t = t + b[i];
        ______________________________;
    }
    if (t) c.push_back(t);
    return c;
}""",
    ("GESP_2023年12月_C++5级试题.pdf", 6, "X35"): """class Node
{
public:
    int Value;
    Node *Prev;
    Node *Next;
    Node(int Val, Node *Prv = NULL, Node *Nxt = NULL);
};
Node::Node(int Val, Node *Prv, Node *Nxt)
{
    this->Value = Val;
    this->Prev = Prv;
    this->Next = Nxt;
}
int main()
{
    Node firstNode = Node(10);
    firstNode.Next = new Node(100, &firstNode);
    firstNode.Next->Next = new Node(111, firstNode.Next);
}""",
    ("GESP_2023年12月_C++5级试题.pdf", 7, "X38"): """int Fibo(int N)
{
    if (N == 1 || N == 2)
        return 1;
    else
    {
        int m = fiboA(N - 1);
        int n = fiboB(N - 2);
        return m + n;
    }
}""",
    ("GESP_2023年12月_C++5级试题.pdf", 7, "X39"): """char s[10];
int main()
{
    int N;
    cin >> N;
    string rst = "";
    while (N != 0)
    {
        s[0] = N % 8 + '0';
        rst += string(s);
        N /= 8;
    }
    cout << rst << endl;
    return 0;
}""",
    ("GESP_2023年12月_C++5级试题.pdf", 4, "X27"): """vector<int> operator + (vector<int> lA, vector<int> lB)
{
    vector<int> lst;
    for (int i = 1; i < lA.size(); i++)
        lst.push_back(lA[i]);
    for (int i = 1; i < lB.size(); i++)
        lst.push_back(lB[i]);
    return lst;
}

vector<int> qSort(vector<int> lst)
{
    if (lst.size() < 2)
        return lst;
    int pivot = lst[0];
    vector<int> less, greater;
    for (int i = 1; i < lst.size(); i++)
        if (lst[i] <= pivot) less.push_back(lst[i]);
        else greater.push_back(lst[i]);
    for (int i = 1; i < lst.size(); i++)
        if (lst[i] <= pivot) less.push_back(lst[i]);
        else greater.push_back(lst[i]);
    return __________________;
}""",
    ("GESP_2023年12月_C++6级试题.pdf", 4, "X26"): """int fiboA(int n)
{
    if (n == 0)
        return 1;
    if (n == 1)
        return 1;
    else
    {
        return fiboA(n - 1) + fiboA(n - 2);
    }
}
int fiboB(int n)
{
    if ((n == 0) || (n == 1)) {
        fiboB[n] = n;
        return n;
    }
    else {
        if (fiboB[n] == 0) {
            fiboB[n] = fiboB(n - 1) + fiboB(n - 2);
        }
        return fiboB[n];
    }
}""",
    ("GESP_2024年6月_C++7级试题.pdf", 4, "X35"): "",
    ("GESP_2023年12月_C++8级试题.pdf", 2, "X17"): """int gcd(int m, int n) {
    while (m > 0) {
        int t = m;
        m = n % m;
        n = t;
    }
    return n;
}""",
}


CHOICE_ITEM_OVERRIDES = {
    ("gesp-cpp8-2023-12", 4): {"options": {"A": "n × (n + 1)", "B": "n × n", "C": "n × (n − 1)", "D": "n × (n − 1) / 2"}},
    ("gesp-cpp8-2023-12", 6): {"options": {"A": "n − 1", "B": "n", "C": "n + 1", "D": "最小生成树可能不存在"}},
    ("gesp-cpp8-2023-12", 8): {"options": {"A": "O(1)", "B": "O(log n)", "C": "O(n)", "D": "O(n²)"}},
    ("gesp-cpp8-2023-12", 9): {"options": {"A": "O(log n)", "B": "O(n)", "C": "O(n × m)", "D": "O(m × log n)"}},
    ("gesp-cpp8-2023-12", 10): {"options": {"A": "O(n)", "B": "O(aⁿ)", "C": "O(log m)", "D": "O(log n × a)"}},
    ("gesp-cpp8-2023-12", 11): {"options": {"A": "O(2ⁿ)", "B": "O(2ᵐ × (n − m))", "C": "O(C(n, m))", "D": "O(m × (n − m))"}},
    ("gesp-cpp8-2023-12", 12): {
        "question": """下面的程序使用出边的邻接表表示有向图。下列选项中，哪个是它表示的图？（ ）。

```cpp
#include <iostream>

struct Edge {
    int e;
    Edge* next;
};

struct Node {
    Edge* first;
};

int main() {
    Edge e[5] = {
        {1, nullptr},
        {2, &e[2]},
        {3, nullptr},
        {3, nullptr},
        {0, nullptr}
    };
    Node n[4] = {&e[0], &e[1], &e[3], &e[4]};
    // 其他处理
    return 0;
}
```""",
        "options": {key: f"![选项 {key}](/gesp-assets/gesp-cpp8-2023-12/choice-12/{key}.png)" for key in "ABCD"},
    },
    ("gesp-cpp8-2024-03", 5): {"options": {"A": "v × (v − 1)", "B": "v × v", "C": "2 × e", "D": "e"}},
    ("gesp-cpp8-2024-03", 10): {"options": {"A": "O(2ⁿ)", "B": "O(φⁿ)，φ = (√5 + 1) / 2", "C": "O(n)", "D": "O(1)"}},
    ("gesp-cpp8-2024-03", 11): {"options": {"A": "O(2ⁿ)", "B": "O(2ᵐ × (n − m))", "C": "O(C(n, m))", "D": "O(m × (n − m))"}},
    ("gesp-cpp8-2024-03", 12): {"options": {"A": "O(n)", "B": "O(n log n)", "C": "O(n log log n)", "D": "O(n²)"}},
    ("gesp-cpp8-2024-06", 4): {"options": {"A": "O(V)", "B": "O(E)", "C": "O(V + E)", "D": "O(log(V + E))"}},
    ("gesp-cpp8-2024-06", 5): {"options": {"A": "2/3", "B": "1/4", "C": "1/2", "D": "1/3"}},
    ("gesp-cpp8-2024-06", 13): {"options": {"A": "O(N)", "B": "O(N log N)", "C": "O(N log log N)", "D": "O(N²)"}},
    ("gesp-cpp8-2024-06", 14): {"options": {"A": "O(√n)", "B": "O(log n)", "C": "O(n)", "D": "O(1)"}},
    ("gesp-cpp8-2024-09", 2): {"options": {"A": "n × n / 2", "B": "n × n", "C": "(n − 1) × (n − 1)", "D": "(n + 1) × (n + 1)"}},
    ("gesp-cpp8-2024-09", 5): {"options": {"A": "O(n)", "B": "O(n log n)", "C": "O(log n)", "D": "O(2ⁿ)"}},
    ("gesp-cpp8-2024-09", 6): {"options": {"A": "n / 2ⁿ⁻¹", "B": "1 / n²", "C": "1 / n", "D": "n / 2ⁿ"}},
    ("gesp-cpp8-2024-09", 14): {"options": {"A": "O(n log n)", "B": "O(n²)", "C": "O(2ⁿ)", "D": "O(log n)"}},
    ("gesp-cpp8-2024-09", 15): {"options": {"A": "O(1)", "B": "O(φⁿ)，φ = (√5 − 1) / 2", "C": "O(n)", "D": "O(n log n)"}},
    ("gesp-cpp8-2024-12", 4): {"options": {"A": "v × (v − 1)", "B": "v × v", "C": "2 × e", "D": "e"}},
    ("gesp-cpp8-2024-12", 13): {"options": {"A": "O(e)", "B": "O(v²)", "C": "O(v log v + e)", "D": "O((v + e) log v)"}},
    ("gesp-cpp8-2024-12", 15): {"options": {"A": "O(n)", "B": "O(n²)", "C": "O(2ⁿ)", "D": "O(n log n)"}},
    ("gesp-cpp8-2025-03", 7): {"options": {"A": "⌈log₂N⌉", "B": "⌊log₂N⌋", "C": "⌊log₂N⌋ + 1", "D": "无法确定"}},
    ("gesp-cpp8-2025-03", 10): {"options": {"A": "O(N log N)", "B": "O(N¹ᐟ²)", "C": "O(N¹ᐟ² log N)", "D": "O(N¹ᐟ²(log N)²)"}},
    ("gesp-cpp8-2025-03", 13): {"options": {"A": "O(N)", "B": "O(N²)", "C": "O(N³)", "D": "O(N² log N)"}},
    ("gesp-cpp8-2025-03", 15): {"options": {"A": "O(n)", "B": "O(n log n)", "C": "O(n²)", "D": "O(n³)"}},
    ("gesp-cpp8-2025-06", 5): {"options": {"A": "3/8", "B": "1/4", "C": "1/2", "D": "1/4"}},
    ("gesp-cpp8-2025-06", 7): {"options": {"A": "O(log n)", "B": "O(n log n)", "C": "O(n)", "D": "O(2ⁿ)"}},
    ("gesp-cpp8-2025-06", 9): {"options": {"A": "O(n log n)", "B": "O(n)", "C": "O(log n)", "D": "O(n²)"}},
    ("gesp-cpp8-2025-06", 11): {"options": {"A": "O(n)", "B": "O(n²)", "C": "O(n log n)", "D": "O(n² log n)"}},
    ("gesp-cpp8-2025-06", 14): {"options": {"A": "O(log n)", "B": "O(n)", "C": "O(n log n)", "D": "O(n²)"}},
    ("gesp-cpp8-2025-09", 5): {"options": {"A": "1/4", "B": "1/2", "C": "3/4", "D": "7/8"}},
    ("gesp-cpp8-2025-09", 7): {"options": {"A": "O(V)", "B": "O(V + E)", "C": "O(V²)", "D": "O(E)"}},
    ("gesp-cpp8-2025-09", 10): {"options": {"A": "O(n log n)", "B": "O(n log log n)", "C": "O(n)", "D": "O(log n)"}},
    ("gesp-cpp8-2025-09", 11): {"options": {"A": "O(v²)", "B": "O(v log v + e)", "C": "O((v + e) log v)", "D": "O(v + e)"}},
    ("gesp-cpp8-2025-09", 12): {"options": {"A": "O(n²)", "B": "O(n² log n)", "C": "O(n)", "D": "O(n log n)"}},
    ("gesp-cpp8-2025-12", 9): {"options": {"A": "O(n)", "B": "O(n log n)", "C": "O(n√n)", "D": "O(n²)"}},
    ("gesp-cpp8-2026-03", 3): {"options": {"A": "O(log b)", "B": "O(log e)", "C": "O(log mod)", "D": "O(e)"}},
    ("gesp-cpp8-2026-03", 6): {"options": {"A": "O(V²)", "B": "O(V × E)", "C": "O((V + E) log V)", "D": "O(V² log V)"}},
    ("gesp-cpp8-2026-03", 7): {"options": {"A": "n", "B": "n − 1", "C": "n + 1", "D": "无法确定，取决于图的具体边数"}},
    ("gesp-cpp7-2023-12", 13): {"options": {"A": "O(n)", "B": "O(e)", "C": "O(n + e)", "D": "O(n + 2e)"}},
    ("gesp-cpp7-2024-03", 11): {"options": {"A": "O(n)", "B": "O(log n)", "C": "O(n log n)", "D": "O(n²)"}},
    ("gesp-cpp7-2024-03", 12): {"options": {"A": "O(n)", "B": "O(log n)", "C": "O(1)", "D": "可能无法返回"}},
    ("gesp-cpp7-2024-03", 13): {"options": {"A": "O(N)", "B": "O(N²)", "C": "O(N³)", "D": "O(N⁴)"}},
    ("gesp-cpp7-2024-06", 11): {
        "question": """如下图所示的邻接表结构，表示的是下列哪个选项中的图？

![邻接表结构](/gesp-assets/gesp-cpp7-2024-06/choice-11/question.png)""",
        "options": {key: f"![选项 {key}](/gesp-assets/gesp-cpp7-2024-06/choice-11/{key}.png)" for key in "ABCD"},
    },
    ("gesp-cpp7-2024-06", 12): {
        "question": """如下图所示的邻接矩阵（inf 表示无穷大），表示的是下列哪个选项中的图？

![邻接矩阵](/gesp-assets/gesp-cpp7-2024-06/choice-12/question.png)""",
        "options": {key: f"![选项 {key}](/gesp-assets/gesp-cpp7-2024-06/choice-12/{key}.png)" for key in "ABCD"},
    },
    ("gesp-cpp7-2024-06", 14): {"options": {"A": "O(n)", "B": "O(n²)", "C": "O(n³)", "D": "O(n⁴)"}},
    ("gesp-cpp7-2024-09", 13): {"options": {"A": "O(1)", "B": "O(N)", "C": "O(N log N)", "D": "O(N²)"}},
    ("gesp-cpp7-2024-09", 14): {"options": {"A": "O(n)", "B": "O(φⁿ)，φ = (√5 − 1) / 2", "C": "O(2ⁿ)", "D": "无法正常结束"}},
    ("gesp-cpp7-2024-12", 13): {"options": {"A": "O(N)", "B": "O(N log N)", "C": "O(N³ᐟ²)", "D": "O(N²)"}},
    ("gesp-cpp7-2024-12", 14): {"options": {"A": "O(n)", "B": "O(n log n)", "C": "O(n²)", "D": "无法正常结束"}},
    ("gesp-cpp7-2025-03", 11): {"options": {"A": "O(n²)", "B": "O(n)", "C": "O(log n)", "D": "O(n log n)"}},
    ("gesp-cpp7-2025-06", 5): {
        "question": "假定只有一个根节点的树的深度为 1，则一棵有 N 个节点的完全二叉树，其深度为（ ）。",
        "options": {"A": "⌊log₂N⌋ + 1", "B": "⌊log₂N⌋", "C": "⌈log₂N⌉", "D": "不能确定"},
    },
    ("gesp-cpp7-2025-06", 12): {"options": {"A": "O(2ⁿ)", "B": "O(φⁿ)，φ = (√5 − 1) / 2", "C": "O(n²)", "D": "O(n)"}},
    ("gesp-cpp7-2025-06", 13): {"options": {"A": "O(n log n)", "B": "O(n)", "C": "O(log n)", "D": "O(1)"}},
    ("gesp-cpp7-2025-06", 14): {"options": {"A": "O(n)", "B": "O(n log n)", "C": "O(n log log n)", "D": "O(n²)"}},
    ("gesp-cpp7-2025-09", 8): {
        "question": "对一个包含 V 个顶点、E 条边的图，执行广度优先搜索，其最优时间复杂度是（ ）。",
        "options": {"A": "O(V + E)", "B": "O(V)", "C": "O(E)", "D": "O(V²)"},
    },
    ("gesp-cpp7-2025-09", 12): {"options": {"A": "O(φⁿ)，φ = (√5 + 1) / 2", "B": "O(2ⁿ)", "C": "O(n²)", "D": "O(n)"}},
    ("gesp-cpp7-2025-09", 13): {"options": {"A": "O(n)", "B": "O(n log log n)", "C": "O(n log n)", "D": "O(n²)"}},
    ("gesp-cpp7-2025-09", 14): {"options": {"A": "O(n²)", "B": "O(n² log n)", "C": "O(n log n)", "D": "O(n)"}},
    ("gesp-cpp7-2025-12", 3): {
        "question": "现有一个地址区间为 0～10 的哈希表。当出现冲突时，会向后寻找第一个空地址存储（地址 10 冲突后从 0 重新开始）。现在依次存储 1、3、5、7、9，哈希函数为 h(x) = (x² + x) mod 11。其中 9 存储在哈希表的哪个地址中（ ）。",
        "options": {"A": "1", "B": "2", "C": "3", "D": "4"},
    },
    ("gesp-cpp7-2025-12", 8): {"options": {"A": "O(1)", "B": "O(log n)", "C": "O(n)", "D": "O(n log n)"}},
    ("gesp-cpp7-2025-12", 13): {
        "question": "假设一个算法时间复杂度的递推式为 T(n) = 8T(n/4) + n√n（n 为正整数），且 T(0) = 1，那么该算法的时间复杂度是（ ）。",
        "options": {"A": "O(n√n)", "B": "O(n√n log n)", "C": "O(n²)", "D": "O(n² log n)"},
    },
    ("gesp-cpp7-2026-03", 1): {
        "question": "假设一个算法时间复杂度的递推式为 T(n) = 2T(n − 1) + 1（n 为正整数），且 T(0) = 1，那么该算法的时间复杂度是（ ）。",
        "options": {"A": "O(n)", "B": "O(n log n)", "C": "O(n²)", "D": "O(2ⁿ)"},
    },
    ("gesp-cpp7-2026-03", 4): {
        "question": "对于一棵包含 n 个顶点（n ≥ 2）的树，其所有顶点的度数之和必定等于（ ）。",
        "options": {"A": "n − 1", "B": "2n − 2", "C": "2n", "D": "n²"},
    },
    ("gesp-cpp7-2026-03", 8): {
        "options": {"A": "O(n log n + n log D)", "B": "O(n log n log D)", "C": "O(n log n)", "D": "O(n log D)"},
    },
    ("gesp-cpp6-2023-09", 12): {
        "options": {"A": "O(1)", "B": "O(N)", "C": "O(log N)", "D": "O(N²)"},
    },
    ("gesp-cpp6-2023-09", 14): {
        "options": {"A": "O(1)", "B": "O(N)", "C": "O(log N)", "D": "O(N²)"},
    },
    ("gesp-cpp6-2023-12", 4): {
        "question": """有关下面 C++ 代码的说法，错误的是（ ）。

```cpp
struct BiNode {
    char data;
    BiNode *lchid, *rchid;
};
class BiTree {
private:
    BiNode* Creat();
    void Release(BiNode* bt);
    BiNode* root;
public:
    BiTree() {
        root = Creat();
    }
    ~BiTree() {
        Release(root);
    }
};
```""",
        "options": {
            "A": "上述 C++ 代码适用于构造各种二叉树",
            "B": "代码 struct BiNode 用于构造二叉树的节点",
            "C": "代码 BiTree(){root=Creat();} 用于构造二叉树",
            "D": "析构函数不可以省略",
        },
    },
    ("gesp-cpp6-2024-09", 13): {
        "options": {
            "A": "5 3 7 2 4 6 8", "B": "2 3 4 5 6 7 8",
            "C": "2 4 3 6 8 7 5", "D": "2 4 3 5 6 7 8",
        },
    },
    ("gesp-cpp6-2024-12", 5): {
        "options": {"A": "O(1)", "B": "O(N)", "C": "O(log N)", "D": "O(N³)"},
    },
    ("gesp-cpp7-2023-12", 1): {"question": "小杨这学期准备参加 GESP 的 7 级考试，其中有关于三角函数的内容。他能够通过下面的代码找到结束循环的角度值。（ ）\n\n```cpp\n#include <cmath>\n#include <iostream>\nusing namespace std;\nint main()\n{\n    double x;\n    do {\n        cin >> x;\n        x = x / 180 * 3.14;\n    } while (int(sin(x) * sin(x) + cos(x) * cos(x)) == 1);\n    cout << sin(x) << \" \" << cos(x) << endl;\n    return 0;\n}\n```"},    ("gesp-cpp2-2023-03", 7): {"question": "while 语句的循环体至少会执行一次。"},    ("gesp-cpp6-2024-12", 10): {
        "options": {"A": "5 3 7", "B": "5 7", "C": "2 3 4 5 6 7", "D": "8 7"},
    },
    ("gesp-cpp6-2024-12", 13): {
        "options": {
            "A": "1 2 8 9 4 5 3 6 7", "B": "1 2 3 4 5 6 7 8 9",
            "C": "1 2 3 8 9 6 4 5 7", "D": "8 4 5 9 2 1 3 6 7",
        },
    },
    ("gesp-cpp6-2025-06", 7): {
        "options": {"A": "(i − 1) / 2", "B": "i + 1", "C": "i × 2", "D": "2 × i + 1"},
    },
    ("gesp-cpp6-2025-09", 12): {
        "options": {"A": "O(n)", "B": "O(log n)", "C": "O(n²)", "D": "O(2ⁿ)"},
    },
    ("gesp-cpp5-2023-12", 10): {
        "options": {"A": "O(N)", "B": "O(log N)", "C": "O(N log N)", "D": "O(N²)"},
    },
    ("gesp-cpp5-2024-03", 6): {
        "options": {"A": "O(1)", "B": "O(n)", "C": "O(2ⁿ)", "D": "O(log n)"},
    },
    ("gesp-cpp5-2024-03", 11): {
        "options": {"A": "O(n)", "B": "O(n log log n)", "C": "O(n log n)", "D": "O(n²)"},
    },
    ("gesp-cpp5-2024-06", 3): {
        "options": {"A": "O(1)", "B": "O(n)", "C": "O(log n)", "D": "O(n²)"},
    },
    ("gesp-cpp5-2024-06", 8): {
        "options": {"A": "O(n²)", "B": "O(n log n)", "C": "O(n log log n)", "D": "O(n)"},
    },
    ("gesp-cpp5-2024-06", 13): {
        "options": {"A": "n²", "B": "n log n", "C": "2n − 1", "D": "n"},
    },
    ("gesp-cpp5-2024-09", 7): {
        "options": {"A": "O(n²)", "B": "O(n log n)", "C": "O(√n log n)", "D": "O(n)"},
    },
    ("gesp-cpp5-2024-09", 8): {
        "options": {"A": "O(n)", "B": "O(n²)", "C": "O(log n)", "D": "O(n log n)"},
    },
    ("gesp-cpp5-2024-09", 10): {
        "options": {"A": "O(1)", "B": "O(n)", "C": "O(log n)", "D": "O(n log n)"},
    },
    ("gesp-cpp5-2025-12", 10): {
        "options": {"A": "O(n)", "B": "O(log n)", "C": "O(n²)", "D": "O(n log n)"},
    },
    ("gesp-cpp5-2026-03", 11): {
        "options": {"A": "O(n²)", "B": "O(n log n)", "C": "O(log n)", "D": "O(n)"},
    },
    ("gesp-cpp5-2026-03", 13): {
        "options": {"A": "O(n)", "B": "O(n log n)", "C": "O(n²)", "D": "O(log n)"},
    },
    ("gesp-cpp4-2023-09", 3): {
        "options": {"A": "O(n)", "B": "O(n log n)", "C": "O(n²)", "D": "以上都不正确"},
    },
    ("gesp-cpp4-2024-03", 9): {
        "options": {"A": "O(1)", "B": "O(N/2)", "C": "O(N)", "D": "O(N²)"},
    },
    ("gesp-cpp4-2024-09", 12): {
        "options": {"A": "O(n²)", "B": "O(2ⁿ)", "C": "O(1)", "D": "O(n)"},
    },
    ("gesp-cpp4-2024-12", 12): {
        "options": {"A": "O(n²)", "B": "O(2ⁿ)", "C": "O(1)", "D": "O(n)"},
    },
    ("gesp-cpp4-2025-03", 11): {
        "options": {"A": "O(n²)", "B": "O(n × 2ⁿ)", "C": "O(1)", "D": "O(n³)"},
    },
    ("gesp-cpp4-2025-06", 11): {
        "options": {"A": "O(n)", "B": "O(n²)", "C": "O(n³)", "D": "O(2ⁿ)"},
    },
    ("gesp-cpp4-2025-06", 12): {
        "options": {"A": "O(n)", "B": "O(n²)", "C": "O(n³)", "D": "O(2ⁿ)"},
    },
    ("gesp-cpp4-2025-09", 14): {
        "options": {"A": "O(n)", "B": "O(n²)", "C": "O(n³)", "D": "O(2ⁿ)"},
    },
    ("gesp-cpp4-2025-12", 13): {
        "options": {"A": "O(n)", "B": "O(n²)", "C": "O(n³)", "D": "O(2ⁿ)"},
    },
    ("gesp-cpp4-2026-03", 12): {
        "options": {"A": "O(n)", "B": "O(n log n)", "C": "O(n²)", "D": "O(2ⁿ)"},
    },
    ("gesp-cpp3-2026-06", 2): {
        "options": {
            "A": "![选项 A](/gesp-assets/gesp-cpp3-2026-06/choice-2/A.png)",
            "B": "![选项 B](/gesp-assets/gesp-cpp3-2026-06/choice-2/B.png)",
            "C": "![选项 C](/gesp-assets/gesp-cpp3-2026-06/choice-2/C.png)",
            "D": "![选项 D](/gesp-assets/gesp-cpp3-2026-06/choice-2/D.png)",
        },
    },
    ("gesp-cpp2-2023-12", 3): {
        "question": """以下C++代码实现从小到大的顺序输出能整除N的数（N的因子），例如N=18时输出1 2 3 6 9 18，横线处应填入（ ）。

```cpp
cin >> N;
for (________________)
    if (N % i == 0)
        cout << i << " ";
```""",
    },
    ("gesp-cpp2-2023-12", 4): {
        "question": """下面C++代码用于判断输入的整数是否为对称数，如1221、12321是对称数，但123、972不是对称数。下面对该题对应代码的说法，正确的是（ ）。

```cpp
cin >> N;
newNum = 0;
while (N) {
    newNum = newNum * 10 + N % 10;
    N = N / 10;
}
if (newNum == N)
    cout << N << "为对称数";
```""",
    },
    ("gesp-cpp2-2023-12", 5): {
        "question": """下面C++代码用于判断N（大于等于2的正整数）是否为质数（素数）。下面对如下代码的说法，正确的是（ ）。

```cpp
cin >> N;
for (i = 2; i < N / 2; i++)
    if (N % i == 0) {
        cout << N << " 不是质数";
        break;
    }
if (i >= N / 2)
    cout << N << " 是质数";
```""",
    },
    ("gesp-cpp2-2023-12", 6): {
        "question": """下面C++代码执行后的输出是（ ）。

```cpp
N = 4;
for (int i = 0; i < N; i++) {
    for (int j = 1; j < i; j++)
        if (i * j % 2 == 0)
            cout << i << "#";
    continue;
}
cout << "0";
```""",
    },
    ("gesp-cpp2-2023-12", 7): {
        "question": """下面C++代码执行后的输出是（ ）。

```cpp
cnt = 0;
for (i = 1; i < 10; i++)
    for (j = 1; j < i; j += 2)
        if (i * j % 2 == 0) {
            cnt++;
            break;
        }
if (i >= 10) cout << cnt << "#";
cout << cnt;
```""",
    },
    ("gesp-cpp2-2023-12", 8): {
        "question": """下面C++代码执行后的输出是（ ）。

```cpp
N = 100;
while (N > 0)
    if (N % 2)
        break;
    else if (N % 3 == 0)
        N -= 5;
    else
        N -= 20;
cout << N;
```""",
    },
    ("gesp-cpp2-2023-12", 9): {
        "question": """下面C++代码执行后的输出是（ ）。

```cpp
x = 1;
while (x < 100) {
    if (x % 3 != 0)
        cout << x << ",";
    else if (x / 10)
        break;
    else
        x += 5;
    x += 2;
}
cout << x;
```""",
    },
    ("gesp-cpp4-2023-12", 2): {
        "question": """下面C++代码执行后，输出的是（ ）。

```cpp
int arr[10] = {1};
string strArr = "chen a dai";
cout << strArr[arr[1]] << endl;
```""",
    },
    ("gesp-cpp4-2023-12", 3): {
        "question": """下面C++代码最后执行后输出是（ ）。

```cpp
int fun1(int *n)
{
    return *n * *n;
}
int main()
{
    int arr[10] = {2};
    arr[1] = fun1(arr);
    cout << arr[1] << endl;
}
```""",
    },
    ("gesp-cpp4-2023-12", 4): {
        "question": """下面C++代码执行后的结果是（ ）。

```cpp
int arr[3][3] = {{1,2,3},{4,5,6},{7,8,9}};
for (int i = 0; i < 3; i++)
    for (int j = 2; j >= 0; j--)
        cout << arr[i][j] << " ";
cout << endl;
```""",
        "options": {
            "A": "1 2 3\n4 5 6\n7 8 9",
            "B": "1 2 3 4 5 6 7 8 9",
            "C": "3 2 1\n6 5 4\n9 8 7",
            "D": "9 8 7 6 5 4 3 2 1",
        },
    },
    ("gesp-cpp4-2023-12", 5): {
        "question": """下面C++代码执行后输出是（ ）。

```cpp
int arr[3] = {1,2,3};
int *p = NULL;
p = arr;
p++;
cout << *p << endl;
```""",
    },
    ("gesp-cpp4-2023-12", 6): {
        "question": """如果变量x的地址是0x6ffe14，下面C++代码执行以后输出的是（ ）。

```cpp
int *p = NULL;
int x = 2;
p = &x;
p++;
cout << p << endl;
```""",
    },
    ("gesp-cpp4-2024-06", 8): {
        "question": """下列程序横线处，应该输入的是（ ）。

```cpp
#include <iostream>
using namespace std;
int n, a[10001];
void swap(int &a, int &b)
{
    int t = a;
    a = b;
    b = t;
}
int main()
{
    cin >> n;
    for (int i = 1; i <= n; i++)
        cin >> a[i];
    for (int i = n; i > 1; i--)
        for (int j = 1; j < i; j++)
            if (a[j] > a[j + 1])
                __________________
    for (int i = 1; i <= n; i++)
        cout << a[i] << " ";
    cout << endl;
    return 0;
}
```""",
    },
    ("gesp-cpp2-2023-12", 12): {
        "question": """下面的C++代码用于实现如下左图所示的效果，应在以下右图C++代码中填入（ ）。

```text
0
01
012
0123
01234
012345
0123456
01234567
012345678
0123456789
```

```cpp
int N, i, j, nowNum;
cin >> N;
for (i = 0; i < N; i++) {
    nowNum = 0;
    for (j = 0; j < i + 1; j++) {
        cout << nowNum << "";
        nowNum += 1;
        if (nowNum == 10)
            nowNum = 0;
    }
}
```""",
    },
    ("gesp-cpp2-2024-06", 13): {
        "question": """下面C++代码用于实现如下图所示的效果，其有关说法正确的是（ ）。

```text
1
2 4
3 6 9
4 8 12 16
5 10 15 20 25
```

```cpp
for (int i = 1; i < 6; i++) { // L1
    for (int j = 1; j < i + 1; j++) // L2
        cout << i * j << " ";
    cout << endl;
}
```""",
    },
    ("gesp-cpp2-2024-09", 11): {
        "question": """下图是C++程序执行后的输出。为实现其功能，横线处应填入代码是（ ）。

```text
7
1
2 3
3 4 5
4 5 6 7
5 6 7 8 9
6 7 8 9 10 11
7 8 9 10 11 12 13
```

```cpp
//////////////////////////////
int lineNum;
cin >> lineNum;
for (int i = 1; i < lineNum + 1; i++) {
    for (int __________________)
        cout << j << " ";
    cout << endl;
}
```""",
    },
}

# Image-based questions whose PDF text layer omitted formulas or mangled code.
CHOICE_ITEM_OVERRIDES.update({
    ("gesp-cpp4-2024-06", 2): {"question": "下面函数不能正常执行的是（ ）。", "options": {
        "A": "#include <iostream>\nusing namespace std;\nint func()\n{\n    //...\n}\nint main()\n{\n}",
        "B": "#include <iostream>\nusing namespace std;\nint main()\n{\n    func();\n}\nint func()\n{\n    //...\n}",
        "C": "#include <iostream>\nusing namespace std;\nint func()\n{\n    //...\n}\nint main()\n{\n    func();\n}",
        "D": "#include <iostream>\nusing namespace std;\nint func();\nint main()\n{\n    func();\n}\nint func()\n{\n    //...\n}",
    }},
    ("gesp-cpp5-2025-12", 3): {"options": {
        "A": "双链表删除指定节点是 O(1)，单链表是 O(1)",
        "B": "双链表删除指定节点是 O(m)，单链表是 O(n)",
        "C": "双链表删除指定节点是 O(1)，单链表是 O(m)",
        "D": "双链表删除指定节点是 O(n)，单链表是 O(m)",
    }},
    ("gesp-cpp5-2025-12", 4): {"tags": ["数学与数论"], "question": "假设我们有两个数 a = 38 和 b = 14，它们对模 m 同余，即 a ≡ b (mod m)。以下哪个值不可能是 m？"},
    ("gesp-cpp6-2023-12", 3): {"tags": ["面向对象"], "question": "有关下面 C++ 代码的说法，正确的是（ ）。\n\n```cpp\nusing namespace std;\nclass newClass\n{\npublic:\n    static int objCounter;\n};\nint newClass::objCounter = 2;\nint main()\n{\n    newClass classA;\n    newClass classB;\n    cout << newClass::objCounter << endl;\n    cout << classB.objCounter << endl;\n}\n```", "options": {"A": "第14行代码错误，第15行正确", "B": "第15行代码错误，第14行代码正确", "C": "第14、15两行代码都正确", "D": "第6行代码可修改为 objCounter += 1"}},
    ("gesp-cpp6-2023-12", 5): {"question": "基于第4题的定义，有关下面 C++ 代码的说法正确的是（ ）。\n\n```cpp\nvoid Order(BiNode* bt)\n{\n    if (bt == nullptr)\n        return;\n    else\n    {\n        cout << bt->data;\n        Order(bt->lchild);\n        Order(bt->rchild);\n    }\n}\n```"},
    ("gesp-cpp6-2023-12", 6): {"question": "有关下面 C++ 代码的说法正确的是（ ）。\n\n```cpp\ntypedef struct LinkList {\n    int data;\n    LinkList* next;\n    LinkList* prev;\n} LinkList, LinkNode;\n\nbool ListInit(LinkList* &L) {\n    L = new LinkNode;\n    if (!L) return false;\n    L->next = NULL;\n    L->prev = NULL;\n    L->data = -1;\n    return true;\n}\n```"},
    ("gesp-cpp4-2024-06", 1): {"question": "下列代码中，输出结果是（ ）。\n\n```cpp\n#include <iostream>\nusing namespace std;\nint func(int x, int y)\n{\n    int a = x, b = y;\n    int t;\n    t = a;\n    a = b;\n    b = t;\n    cout << a << \" \" << b << \" \";\n}\nint main()\n{\n    int c, d;\n    c = 12;\n    d = 24;\n    func(12, 24);\n    cout << c << \" \" << d << endl;\n}\n```"},
    ("gesp-cpp4-2024-06", 3): {"question": "下面程序输出的是（ ）。\n\n```cpp\n#include <iostream>\nusing namespace std;\nint main()\n{\n    int i = 2;\n    cout << i << endl;\n    for (int x = 0; x < 1; x++) {\n        int i = 10;\n        cout << i << endl;\n    }\n    i = i + 1;\n    cout << i << endl;\n    {\n        i = i * i;\n        cout << i << endl;\n    }\n}\n```"},
    ("gesp-cpp7-2023-12", 10): {"question": "对关键字序列 {44, 36, 23, 35, 52, 73, 90, 58} 建立哈希表，哈希函数为 h(k)=k%7，执行下面的 Insert 函数，则等概率情况下的平均成功查找长度（即查找成功时的关键字比较次数的均值）为（ ）。\n\n```cpp\n#include <iostream>\nusing namespace std;\nstruct Node {\n    int data;\n    Node* next;\n};\nNode* hTab[7] = {};\nint key[] = {44, 36, 23, 35, 52, 73, 90, 58, 0};\nvoid Insert()\n{\n    for (int i = 0; key[i]; i++) {\n        int j = key[i] % 7;\n        Node* x = new Node;\n        x->data = key[i];\n        x->next = hTab[j];\n        hTab[j] = x;\n    }\n}\n```"},
    ("gesp-cpp8-2023-12", 13): {"question": "下面程序的输出为（ ）。\n\n```cpp\n#include <iostream>\nusing namespace std;\nint main() {\n    int cnt = 0;\n    for (int a = 1; a <= 10; a++)\n        for (int b = 1; b <= 10; b++)\n            for (int h = 1; h <= 10; h++)\n                if ((a + b) * h == 20)\n                    cnt++;\n    cout << cnt << endl;\n    return 0;\n}\n```"},    ("gesp-cpp2-2023-03", 2): {"question": "下列流程图（开始后判断是否按下空格键，是则让小猫移动100步并将小猫颜色的特效增加25，最后结束）属于计算机的哪种程序结构？（ ）。"},
    ("gesp-cpp2-2023-03", 5): {"question": "以下哪个不是 C++ 语言的关键字？"},
    ("gesp-cpp2-2023-03", 9): {"question": "如果 a 为 char 类型的变量，且 a 的值为 '2'，则下列哪条语句执行后，a 的值不会变为 '3'？"},
    ("gesp-cpp2-2023-03", 15): {"question": "执行以下 C++ 语言程序后，输出结果是（ ）。\n\n```cpp\n#include <iostream>\nusing namespace std;\nint main() {\n    int n = 17;\n    bool isprime = true;\n    for (int i = 2; i <= n; i++)\n        if (n % i == 0)\n            isprime = false;\n    cout << isprime << endl;\n    return 0;\n}\n```"},    ("gesp-cpp5-2023-09", 5): {"question": "下面 C++ 代码以递归方式实现字符串反序，横线处应填上代码是（ ）。\n\n```cpp\n// 字符串反序\n#include <iostream>\n#include <string>\nusing namespace std;\nstring sReverse(string sIn) {\n    if (sIn.length() <= 1) {\n        return sIn;\n    } else {\n        return ______________________________;\n    }\n}\nint main() {\n    string sIn;\n    cin >> sIn;\n    cout << sReverse(sIn) << endl;\n    return 0;\n}\n```"},    ("gesp-cpp8-2023-12", 14): {"question": "下面程序的输出为（ ）。\n\n```cpp\n#include <iostream>\nusing namespace std;\n\nint main() {\n    const int N = 30;\n    int cnt = 0;\n    for (int a = 1; a <= N; a++)\n        for (int b = a; a + b <= N; b++)\n            for (int c = b; a + b + c <= N; c++)\n                if (a * a + b * b == c * c)\n                    cnt++;\n    cout << cnt << endl;\n    return 0;\n}\n```"},    ("gesp-cpp7-2023-12", 2): {"question": "对于下面动态规划方法实现的函数，以下选项中最适合表达其状态转移函数的为（ ）。\n\n```cpp\nint s[MAX_N], f[MAX_N][MAX_N];\nint stone_merge(int n, int a[]) {\n    for (int i = 1; i <= n; i++)\n        s[i] = s[i - 1] + a[i];\n    for (int i = 1; i <= n; i++)\n        for (int j = 1; j <= n; j++)\n            f[i][j] = (i == j ? 0 : MAX_F);\n    for (int len = 1; len < n; len++)\n        for (int i = 1; i <= n - len; i++) {\n            int j = i + len;\n            for (int k = i; k < j; k++)\n                f[i][j] = min(f[i][j], f[i][k] + f[k + 1][j] + s[j] - s[i - 1]);\n        }\n    return f[1][n];\n}\n```", "options": {
        "A": "f(i,j) = min{f(i,k), f(k+1,j)} + s[j] − s[i−1]",
        "B": "f(i,j) = min{f(i,k) + f(k+1,j)} + Σ a[k]",
        "C": "f(i,j) = min{f(i,k) + f(k+1,j) + Σ a[k]}",
        "D": "f(i,j) = min{f(i,k) + f(k+1,j)} + Σₜ₌ᵢʲ a[t]",
    }, "tags": ["动态规划"]},

})


# Additional OCR repairs ordered by visual-review confidence.
CHOICE_ITEM_OVERRIDES.update({
    ("gesp-cpp8-2023-12", 15): {"tags": ["动态规划", "数组"], "question": "下面的程序中，二维数组 h 和 v 分别代表网格中水平边和垂直边的时间消耗。程序使用动态规划计算从左下角到右上角的最小时间消耗，横线处应填写下列哪个选项的代码？（ ）。\n\n```cpp\nint dis[MAXY][MAXX];\nint shortest_path(int x, int y) {\n    dis[0][0] = 0;\n    for (int i = 0; i < y; i++)\n        dis[i + 1][0] = dis[i][0] + v[i][0];\n    for (int j = 0; j < x; j++)\n        dis[0][j + 1] = dis[0][j] + h[0][j];\n    for (int i = 0; i < y; i++)\n        for (int j = 0; j < x; j++)\n            __________________;\n    return dis[y][x];\n}\n```"},
    ("gesp-cpp5-2023-09", 8): {"tags": ["指针与引用", "函数"], "question": "有关下面代码正确的是（ ）。\n\n```cpp\n// 在 C++ 语言中，可以通过函数指针的形式，将一个函数作为另一个函数的参数。\n// bool checkNum(bool (*Fx)(int), int N) 声明了一个函数，\n// 其第一个参数是函数指针类型，指向一个接收 int 参数且返回 bool 的函数。\n#include <iostream>\nusing namespace std;\nbool isEven(int N) {\n    return N % 2 == 0;\n}\nbool checkNum(bool (*Fx)(int), int N) {\n    return Fx(N);\n}\nint main() {\n    cout << checkNum(isEven, 10) << endl;\n    return 0;\n}\n```"},
    ("gesp-cpp5-2023-09", 10): {"question": "下面代码执行后的输出是（ ）。\n\n```cpp\n#include <iostream>\nusing namespace std;\nint jumpFloor(int N) {\n    cout << N << \"#\";\n    if (N == 1 || N == 2) {\n        return N;\n    } else {\n        return jumpFloor(N - 1) + jumpFloor(N - 2);\n    }\n}\nint main() {\n    cout << jumpFloor(4) << endl;\n    return 0;\n}\n```"},
    ("gesp-cpp5-2023-09", 11): {"tags": ["数学与数论", "复杂度分析"], "options": {
        "A": "isPrimeA() 的最坏时间复杂度是 O(N)，isPrimeB() 的最坏时间复杂度是 O(√N)，isPrimeB() 优于 isPrimeA()。",
        "B": "isPrimeA() 的最坏时间复杂度是 O(N)，isPrimeB() 的最坏时间复杂度是 O(√N)，isPrimeB() 优于 isPrimeA()。",
        "C": "isPrimeA() 的最坏时间复杂度是 O(N²)，isPrimeB() 的最坏时间复杂度是 O(N)，isPrimeA() 优于 isPrimeB()。",
        "D": "isPrimeA() 的最坏时间复杂度是 O(log N)，isPrimeB() 的最坏时间复杂度是 O(N)，isPrimeA() 优于 isPrimeB()。",
    }},
    ("gesp-cpp6-2023-09", 5): {"tags": ["面向对象", "字符串"], "question": "有关下面 C++ 代码的说法，错误的是（ ）。\n\n```cpp\n#include <iostream>\n#include <string>\nusing namespace std;\nclass MyStr {\n    string data;\npublic:\n    MyStr(string _data) : data(_data) {}\n};\nint main() {\n    MyStr st(\"ABC\");\n    cout << st << endl;\n    return 0;\n}\n```"},
    ("gesp-cpp7-2023-12", 1): {"tags": ["数学函数", "数据类型与运算"], "question": "定义变量 double x，如果下面代码输入为 100，输出最接近（ ）。\n\n```cpp\n#include <iostream>\n#include <cmath>\nusing namespace std;\nint main()\n{\n    double x;\n    cin >> x;\n    cout << log10(x) - log2(x) << endl;\n    cout << endl;\n    return 0;\n}\n```"},
    ("gesp-cpp7-2023-12", 6): {"tags": ["哈希表", "数组"], "question": "哈希表长 31，按照下面的程序依次输入 4、17、28、30、4，则最后的 4 存入哪个位置？（ ）\n\n```cpp\n#include <iostream>\nusing namespace std;\nconst int N = 31;\nint htab[N], flag[N] = {};\nint main()\n{\n    int n, x, i, k;\n    cin >> n;\n    for (i = 0; i < n; i++) {\n        cin >> x;\n        k = x % 13;\n        while (flag[k])\n            k = (k + 1) % 13;\n        htab[k] = x;\n        flag[k] = 1;\n    }\n    for (i = 0; i < N; i++)\n        cout << htab[i] << \" \";\n    cout << endl;\n    return 0;\n}\n```"},
})

# Repairs recovered from the original PDF page images (code blocks and one graph).
CHOICE_ITEM_OVERRIDES.update({
    ("gesp-cpp2-2026-06", 15): {"tags": ["多层循环语句", "分支与循环"], "question": "某学校举办“校园演讲比赛”，每位选手由若干位评委打分，计分规则为去掉一个最高分和一个最低分。下面程序通过键盘输入选手编号和各项成绩，并计算最终成绩。下列说法正确的是（ ）。\n\n```cpp\nfor (int i = 0; i < 10; i++) {\n    int id, score;\n    printf(\"输入选手编号: \");\n    scanf(\"%d\", &id);\n    int max_score = 0, min_score = 100;\n    int total_score = 0;\n    for (int j = 1; j < 9; j++) {\n        printf(\"输入选手第%d个成绩:\", j);\n        scanf(\"%d\", &score);\n        if (max_score < score)\n            max_score = score;\n        if (min_score > score)\n            min_score = score;\n        total_score += score;\n    }\n    total_score = total_score - max_score - min_score;\n    printf(\"%d号选手的成绩:\\n去掉一个最高分%d，去掉一个最低分%d，\\n最后成绩是：%d\", id, max_score, min_score, total_score);\n}\n```"},
    ("gesp-cpp3-2025-03", 9): {"tags": ["进制与编码", "数据类型与运算"], "question": "下面程序是将十进制转十六进制，横线处应该填入的是（ ）。\n\n```cpp\n#include <iostream>\nusing namespace std;\nint main() {\n    int decimal = 255;\n    __________________;\n    return 0;\n}\n```"},
    ("gesp-cpp3-2025-03", 11): {"tags": ["分支与循环", "数组"], "question": "下面枚举法查找最大值索引程序中，横线处应该填写的是（ ）。\n\n```cpp\n#include <iostream>\nusing namespace std;\nint main() {\n    int arr[] = {3, 7, 2, 9, 5};\n    int maxIndex = 0;\n    for (int i = 1; i < 5; i++) {\n        __________________;\n    }\n    cout << maxIndex;\n    return 0;\n}\n```"},
    ("gesp-cpp3-2025-03", 12): {"tags": ["分支与循环", "数组"], "question": "以下代码的功能是将数组中的奇数和偶数分别放在数组的前半部分和后半部分，横线处应该填入的是（ ）。\n\n```cpp\n#include <iostream>\nusing namespace std;\nint main() {\n    int arr[] = {1, 2, 3, 4, 5};\n    int left = 0, right = 4;\n    while (left < right) {\n        while (arr[left] % 2 == 1 && left < right) left++;\n        __________________;\n        if (left < right)\n            swap(arr[left], arr[right]);\n    }\n    for (int i = 0; i < 5; i++)\n        cout << arr[i] << \" \";\n    return 0;\n}\n```"},
    ("gesp-cpp4-2024-06", 5): {"tags": ["数组", "指针与引用"], "question": "如果下列程序输出的地址是 0x6ffe00，则 cout << a + 1 << endl; 输出的是（ ）。\n\n```cpp\n#include <iostream>\nusing namespace std;\nint main()\n{\n    int a[2][3] = {0};\n    cout << a << endl;\n}\n```"},
    ("gesp-cpp5-2025-12", 14): {"tags": ["贪心算法", "排序算法"], "question": "给定若干个任务，每个任务有截止时间和利润，每个任务耗时 1 个时间单位、必须在截止时间前完成，且每个时间槽最多做 1 个任务。按利润从高到低排序后安排任务，横线处应填写（ ）。\n\n```cpp\nstruct Task {\n    int deadline;\n    int profit;\n};\nvoid sortByProfit(vector<Task>& tasks) {\n    sort(tasks.begin(), tasks.end(),\n         [](const Task& a, const Task& b) {\n             return a.profit > b.profit;\n         });\n}\nint maxProfit(vector<Task>& tasks) {\n    sortByProfit(tasks);\n    int maxTime = 0;\n    for (auto& t : tasks)\n        maxTime = max(maxTime, t.deadline);\n    vector<bool> slot(maxTime + 1, false);\n    int totalProfit = 0;\n    for (auto& task : tasks) {\n        for (int t = task.deadline; t >= 1; t--) {\n            if (!slot[t]) {\n                _______________________;\n                break;\n            }\n        }\n    }\n    return totalProfit;\n}\n```"},
    ("gesp-cpp6-2023-12", 2): {"tags": ["面向对象"], "question": "有关下面 C++ 代码的说法，错误的是（ ）。\n\n```cpp\nclass Rectangle\n{\nprivate:\n    class Point\n    {\n    public:\n        double x;\n        double y;\n    };\n    Point a, b, c, d;\n    double length;\n    double width;\npublic:\n};\n```"},
    ("gesp-cpp6-2023-12", 9): {"tags": ["搜索与递归", "树"], "question": "有关下面 C++ 代码不正确的说法是（ ）。\n\n```cpp\nint Depth(BiTree T)\n{\n    if (T == NULL)\n        return 0;\n    else\n    {\n        int m = Depth(T->lchild);\n        int n = Depth(T->rchild);\n        if (m > n)\n            return m + 1;\n        else\n            return n + 1;\n    }\n}\n```"},
    ("gesp-cpp7-2023-12", 3): {"tags": ["动态规划", "数组"], "question": "下面代码可以用来求最长上升子序列（LIS）的长度。如果输入为 5 1 7 3 5 9，则输出是（ ）。\n\n```cpp\nint a[2023], f[2023];\nint main()\n{\n    int n, i, j, ans = -1;\n    cin >> n;\n    for (i = 1; i <= n; i++) {\n        cin >> a[i];\n        f[i] = 1;\n    }\n    for (i = 1; i <= n; i++)\n        for (j = 1; j < i; j++)\n            if (a[j] < a[i])\n                f[i] = max(f[i], f[j] + 1);\n    for (i = 1; i <= n; i++) {\n        ans = max(ans, f[i]);\n        cout << f[i] << \" \";\n    }\n    cout << ans << endl;\n    return 0;\n}\n```"},
    ("gesp-cpp7-2023-12", 8): {"tags": ["动态规划", "复杂度分析"], "question": "下面代码段可以求两个字符串 s1 和 s2 的最长公共子序列（LCS），下列相关描述不正确的是（ ）。\n\n```cpp\nwhile (cin >> s1 >> s2) {\n    memset(dp, 0, sizeof(dp));\n    int n1 = strlen(s1), n2 = strlen(s2);\n    for (int i = 1; i <= n1; ++i)\n        for (int j = 1; j <= n2; ++j)\n            if (s1[i - 1] == s2[j - 1])\n                dp[i][j] = dp[i - 1][j - 1] + 1;\n            else\n                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);\n    cout << dp[n1][n2] << endl;\n}\n```"},
    ("gesp-cpp7-2023-12", 13): {"tags": ["图论", "复杂度分析", "结构体"], "question": "用下面的邻接表结构保存一个有向图 G，InfoType 和 VertexType 是定义好的类型。设 G 有 n 个顶点、e 条弧，则求图 G 中某个顶点 u 的度的算法复杂度是（ ）。\n\n```cpp\ntypedef struct ArcNode {\n    int adjvex;\n    struct ArcNode *nextarc;\n    InfoType *info;\n} ArcNode;\ntypedef struct VNode {\n    VertexType data;\n    ArcNode *firstarc;\n} AdjList[MAX_VERTEX_NUM];\ntypedef struct {\n    AdjList vertices;\n    int vexnum, arcnum;\n    int kind;\n} ALGraph;\n```"},
    ("gesp-cpp7-2026-03", 11): {"tags": ["图论"], "question": "下面这个有向图的强连通分量的个数是（ ）。\n\n![原题有向图](/gesp-assets/gesp-cpp7-2026-03/choice-11/graph.png)"},
    ("gesp-cpp8-2024-09", 11): {"tags": ["图论", "数组"], "question": "下面 Prim 算法程序中，横线处应该填入的是（ ）。\n\n```cpp\n#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <climits>\nusing namespace std;\nint prim(vector<vector<int>>& graph, int n) {\n    vector<int> key(n, INT_MAX);\n    vector<int> parent(n, -1);\n    key[0] = 0;\n    for (int i = 0; i < n; i++) {\n        int u = min_element(key.begin(), key.end()) - key.begin();\n        if (key[u] == INT_MAX) break;\n        for (int v = 0; v < n; v++) {\n            if (__________) {\n                key[v] = graph[u][v];\n                parent[v] = u;\n            }\n        }\n    }\n    int sum = 0;\n    for (int i = 0; i < n; i++) {\n        if (parent[i] != -1) {\n            cout << \"Edge: \" << parent[i] << \" - \" << i << \" Weight: \" << key[i] << endl;\n            sum += key[i];\n        }\n    }\n    return sum;\n}\nint main() {\n    int n, m;\n    cin >> n >> m;\n    vector<vector<int>> graph(n, vector<int>(n, 0));\n    for (int i = 0; i < m; i++) {\n        int u, v, w;\n        cin >> u >> v >> w;\n        graph[u][v] = w;\n        graph[v][u] = w;\n    }\n    int result = prim(graph, n);\n    cout << \"Total weight of the minimum spanning tree: \" << result << endl;\n    return 0;\n}\n```"},
    ("gesp-cpp8-2025-09", 15): {"tags": ["图论", "面向对象"], "question": "下面的程序使用出边邻接表表达的带权无向图，则从顶点 0 到顶点 3 的最短距离为（ ）。\n\n```cpp\n#include <vector>\nusing namespace std;\nclass Edge {\npublic:\n    int dest;\n    int weight;\n    Edge(int d, int w) : dest(d), weight(w) {}\n};\nclass Graph {\nprivate:\n    int num_vertex;\n    vector<vector<Edge>> vve;\npublic:\n    Graph(int v) : num_vertex(v), vve(v) {}\n    void addEdge(int s, int d, int w) {\n        vve[s].emplace_back(d, w);\n        vve[d].emplace_back(s, w);\n    }\n};\nint main() {\n    Graph g(4);\n    g.addEdge(0, 1, 8);\n    g.addEdge(0, 2, 5);\n    g.addEdge(1, 2, 1);\n    g.addEdge(1, 3, 3);\n    g.addEdge(2, 3, 7);\n    return 0;\n}\n```"},
})


CHOICE_ITEM_OVERRIDES.update({
    ("gesp-cpp3-2023-12", 13): {"tags": ["字符串", "分支与循环"], "question": "C++ 代码用于抽取字符串中的电话号码。约定：电话号码全部是数字，数字之间没有连字符或空格等其他符号。下面有关代码的说法，正确的是（ ）。\n\n```cpp\nstring strSrc = \"%21.1'f: 01084025890 XK F Hit: 119 Rin: 1205 >KY): 1107;\";\nstring tel = \"\";\nfor (int i = 0; i <= strSrc.length(); i++) {\n    if (strSrc[i] >= '0' && strSrc[i] <= '9') {\n        tel = tel + strSrc[i];\n    } else if (tel != \"\") {\n        cout << tel << endl;\n        tel = \"\";\n    }\n}\n```"},
    ("gesp-cpp3-2023-09", 13): {"tags": ["位运算", "数据类型与运算"], "question": "在下列代码的横线处填写代码，可以使得输出是“20 10”。\n\n```cpp\n#include <iostream>\nusing namespace std;\nint main() {\n    int a = 10, b = 20;\n    a = (a << 8) | b;\n    b = a >> 8;\n    a = a & 255;\n    cout << a << \" \" << b << endl;\n    return 0;\n}\n```"},
    ("gesp-cpp3-2025-06", 11): {"tags": ["枚举与模拟", "分支与循环"], "question": "以下程序使用枚举法（穷举法）求解满足条件的三位数，横线处应该填入的是（ ）。\n\n```cpp\n#include <iostream>\nusing namespace std;\nint main() {\n    int count = 0;\n    for (int i = 100; i <= 999; i++) {\n        int a = i / 100;\n        int b = (i / 10) % 10;\n        int c = i % 10;\n        if (a * a + b * b == c * c)\n            count++;\n    }\n    cout << count << endl;\n    return 0;\n}\n```"},
    ("gesp-cpp3-2025-06", 12): {"tags": ["枚举与模拟", "分支与循环"], "question": "以下程序模拟了一个简单的小球反弹过程，横线处应该填入的是（ ）。\n\n```cpp\n#include <iostream>\nusing namespace std;\nint main() {\n    int height = 10;\n    int distance = 0;\n    for (int i = 1; i <= 5; i++) {\n        height /= 2;\n        distance += height;\n    }\n    cout << distance << endl;\n    return 0;\n}\n```"},
    ("gesp-cpp4-2023-12", 11): {"tags": ["字符串", "分支与循环"], "question": "下列 C++ 代码输入 1,2,3,4，执行后将输出的是（ ）。\n\n```cpp\nstring str = \"\";\ncin >> str;\nint strLen = str.length();\nfor (int i = 0; i < strLen; i++) {\n    if (str[i] <= '9' && str[i] >= '0')\n        cout << str[i];\n    else {\n        cout << \"#\";\n    }\n}\n```"},
    ("gesp-cpp4-2023-12", 12): {"tags": ["分支与循环"], "question": "以下 C++ 代码用于输出一个整数的所有因数，如输入 12 输出 1 2 3 4 6 12，横线处应填入代码是（ ）。\n\n```cpp\nint n;\ncin >> n;\nfor (int i = 1; i <= n; i++) {\n    if (n % i == 0)\n        cout << i << \" \";\n}\n```"},
    ("gesp-cpp4-2024-06", 13): {"tags": ["异常处理", "函数"], "question": "下面的程序中，如果输入 10 0，会输出（ ）。\n\n```cpp\n#include <iostream>\nusing namespace std;\ndouble Division(int a, int b) {\n    if (b == 0)\n        throw \"Division by zero condition!\";\n    return (double)a / (double)b;\n}\nvoid func() {\n    int len, time;\n    cin >> len >> time;\n    cout << Division(len, time) << endl;\n}\nint main() {\n    try {\n        func();\n    } catch (const char* errmsg) {\n        cout << errmsg << endl;\n    } catch (const int errmsg) {\n        cout << errmsg << endl;\n    }\n    return 0;\n}\n```"},
    ("gesp-cpp5-2023-09", 15): {"tags": ["指针与引用", "结构体"], "question": "有关下面代码的说法正确的是（ ）。\n\n```cpp\n#include <iostream>\nusing namespace std;\nclass Node {\npublic:\n    int Value;\n    Node* Next;\n    Node(int Val, Node* Nxt = nullptr) {\n        Value = Val;\n        Next = Nxt;\n    }\n};\nint main() {\n    Node* firstNode = new Node(10);\n    firstNode->Next = new Node(100);\n    firstNode->Next->Next = new Node(111, firstNode);\n    return 0;\n}\n```"},
    ("gesp-cpp5-2024-12", 11): {"tags": ["搜索与递归", "复杂度分析"], "question": "给定一个长度为 n 的有序数组 nums，其中所有元素唯一。下面的函数返回数组中元素 target 的索引。关于上述函数，描述不正确的是（ ）。\n\n```cpp\nint binarySearch(vector<int>& nums, int target, int left, int right) {\n    if (left > right)\n        return -1;\n    int middle = left + ((right - left) / 2);\n    if (nums[middle] == target)\n        return middle;\n    else if (nums[middle] < target)\n        return binarySearch(nums, target, middle + 1, right);\n    else\n        return binarySearch(nums, target, left, middle - 1);\n}\nint Find(vector<int>& nums, int target) {\n    int n = nums.size();\n    return binarySearch(nums, target, 0, n - 1);\n}\n```"},
})

CHOICE_ITEM_OVERRIDES.update({
    ("gesp-cpp6-2024-09", 15): {"tags": ["动态规划", "数组"], "question": "阅读以下用动态规划解决的 0-1 背包问题函数，函数的输出为（ ）。\n\n```cpp\n#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\nint knapsack(int W, const vector<int>& weights, const vector<int>& values, int n) {\n    vector<vector<int>> dp(n + 1, vector<int>(W + 1, 0));\n    for (int i = 1; i <= n; ++i) {\n        for (int w = 0; w <= W; ++w) {\n            if (weights[i - 1] <= w) {\n                dp[i][w] = max(dp[i - 1][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);\n            } else {\n                dp[i][w] = dp[i - 1][w];\n            }\n        }\n    }\n    return dp[n][W];\n}\n```"},
    ("gesp-cpp6-2025-12", 8): {"tags": ["贪心算法", "树"], "question": "下面代码实现了哈夫曼编码，横线处应填写的代码是（ ）。\n\n```cpp\nstruct Symbol {\n    char ch;\n    long long freq;\n    string code;\n};\nstruct Node {\n    long long w;\n    int l, r;\n    int sym;\n    Node(long long _w=0, int _l=-1, int _r=-1, int _sym=-1)\n        : w(_w), l(_l), r(_r), sym(_sym) {}\n};\nstatic int PopMinNode(const vector<Node>& nodes, const vector<int>& leafIdx, int n, int& pA, const vector<int>& internalIdx, int& pB) {\n    if (pA < n && (pB >= (int)internalIdx.size() || nodes[leafIdx[pA]].w <= nodes[internalIdx[pB]].w))\n        return leafIdx[pA++];\n    return internalIdx[pB++];\n}\nstatic void DFSBuildCodes(int u, const vector<Node>& nodes, Symbol sym[], string& path) {\n    if (u == -1) return;\n    if (nodes[u].sym != -1) { sym[nodes[u].sym].code = path; return; }\n    path.push_back('0'); DFSBuildCodes(nodes[u].l, nodes, sym, path); path.pop_back();\n    path.push_back('1'); DFSBuildCodes(nodes[u].r, nodes, sym, path); path.pop_back();\n}\nint BuildHuffmanCodes(Symbol sym[], int n) {\n    vector<Node> nodes;\n    vector<int> leafIdx(n);\n    for (int i = 0; i < n; i++) {\n        leafIdx[i] = (int)nodes.size();\n        nodes.push_back(Node(sym[i].freq, -1, -1, i));\n    }\n    sort(leafIdx.begin(), leafIdx.end(), [&](int a, int b) {\n        if (nodes[a].w != nodes[b].w) return nodes[a].w < nodes[b].w;\n        return nodes[a].sym < nodes[b].sym;\n    });\n    vector<int> internalIdx;\n    int pA = 0, pB = 0;\n    // 从两个有序队列中取出最小的两个节点\n    int x = PopMinNode(nodes, leafIdx, n, pA, internalIdx, pB);\n    int y = PopMinNode(nodes, leafIdx, n, pA, internalIdx, pB);\n    int z = (int)nodes.size();\n    ______________________________;\n}\n```"},
    ("gesp-cpp6-2025-03", 15): {"tags": ["面向对象", "继承"], "question": "关于下面代码，说法错误的是（ ）。\n\n```cpp\nclass Shape {\nprotected:\n    string name;\npublic:\n    Shape(const string& n) : name(n) {}\n    virtual double area() const { return 0.0; }\n};\nclass Circle : public Shape {\nprivate:\n    double radius;\npublic:\n    Circle(const string& n, double r) : Shape(n), radius(r) {}\n    double area() const override { return 3.14159 * radius * radius; }\n};\nclass Rectangle : public Shape {\nprivate:\n    double width;\n    double height;\npublic:\n    Rectangle(const string& n, double w, double h) : Shape(n), width(w), height(h) {}\n    double area() const override { return width * height; }\n};\nint main() {\n    Circle circle(\"MyCircle\", 5.0);\n    Rectangle rectangle(\"MyRectangle\", 4.0, 6.0);\n    Shape* shapePtr = &circle;\n    cout << \"Area: \" << shapePtr->area() << endl;\n    shapePtr = &rectangle;\n    cout << \"Area: \" << shapePtr->area() << endl;\n    return 0;\n}\n```"},
    ("gesp-cpp7-2024-03", 2): {"tags": ["搜索与递归", "回溯算法"], "question": "下面的程序属于哪种算法（ ）。\n\n```cpp\nint pos[8];\nvoid queen(int n) {\n    for (int i = 0; i < 8; i++) {\n        pos[n] = i;\n        bool attacked = false;\n        for (int j = 0; j < n; j++) {\n            if (pos[n] == pos[j] || pos[n] + n == pos[j] + j || pos[n] - n == pos[j] - j) {\n                attacked = true;\n                break;\n            }\n        }\n        if (attacked) continue;\n        if (n == 7) return;\n        queen(n + 1);\n    }\n}\n```"},
    ("gesp-cpp7-2025-03", 12): {"tags": ["图论", "字符串"], "question": "给定两个无向图 G1 和 G2，判断它们是否同构。下面程序中横线处应该填写的是（ ）。\n\n```cpp\nstring graphHash(vector<vector<int>>& graph) {\n    vector<string> nodeHashes(graph.size());\n    for (int i = 0; i < graph.size(); i++) {\n        vector<int> neighbors = graph[i];\n        sort(neighbors.begin(), neighbors.end());\n        string hash;\n        for (int neighbor : neighbors) {\n            __________________;\n        }\n        nodeHashes[i] = hash;\n    }\n    sort(nodeHashes.begin(), nodeHashes.end());\n    string finalHash;\n    for (string h : nodeHashes) finalHash += h + \";\";\n    return finalHash;\n}\n```"},
    ("gesp-cpp7-2025-03", 13): {"tags": ["动态规划", "数组"], "question": "给定一个 m×n 的二维网格 grid，找出从左上角到右下角的最小路径和，每次只能向右或向下移动。横线处应该填入的是（ ）。\n\n```cpp\nint minPathSum(vector<vector<int>>& grid) {\n    int m = grid.size();\n    int n = grid[0].size();\n    vector<vector<int>> dp(m, vector<int>(n, 0));\n    dp[0][0] = grid[0][0];\n    for (int j = 1; j < n; j++) dp[0][j] = dp[0][j - 1] + grid[0][j];\n    for (int i = 1; i < m; i++) dp[i][0] = dp[i - 1][0] + grid[i][0];\n    for (int i = 1; i < m; i++) {\n        for (int j = 1; j < n; j++) {\n            __________________;\n        }\n    }\n    return dp[m - 1][n - 1];\n}\n```"},
})

CHOICE_ITEM_OVERRIDES.update({
    ("gesp-cpp4-2023-06", 15): {"tags": ["排序算法", "数组"], "question": "在下列代码的横线处填写代码，完成对有 n 个 int 类型元素的数组 array 由小到大排序。\n\n```cpp\nvoid SelectionSort(int array[], int n) {\n    int i, j, min, temp;\n    for (i = 0; i < n - 1; i++) {\n        min = i;\n        for (j = i + 1; j < n; j++)\n            if (__________________)\n                min = j;\n        temp = array[min];\n        array[min] = array[i];\n        array[i] = temp;\n    }\n}\n```"},
    ("gesp-cpp5-2026-03", 12): {"tags": ["排序算法", "数组"], "question": "游戏大赛决赛，两组选手分别按得分从小到大排好队，现在要把他们合并成一个有序排行榜。下面是归并合并函数的核心循环，横线处应填入（ ）。\n\n```cpp\nint i = 0, j = 0;\nvector<int> result;\nwhile (i < A.size() && j < B.size()) {\n    if (__________________) {\n        result.push_back(A[i]);\n        i++;\n    } else {\n        result.push_back(B[j]);\n        j++;\n    }\n}\n```"},
})

CHOICE_ITEM_OVERRIDES.update({
    ("gesp-cpp3-2023-12", 5): {"tags": ["字符串", "分支与循环"], "question": "执行下面 C++ 代码后，输出是（ ）。\n\n```cpp\nstring str = \"chen\";\nint x = str.length();\nint temp = 0;\nfor (int i = 0; i <= x; i++)\n    temp++;\ncout << temp << endl;\n```"},
    ("gesp-cpp4-2024-12", 14): {"options": {
        "D": "ofstream log_file(\"log.txt\");\nstreambuf* org_cout = cout.rdbuf();\ncout.rdbuf(log_file.rdbuf());\ncout << \"This output will go to the log file.\" << endl;\ncout.rdbuf(org_cout);"
    }},
})

# PDF_OPTION_FIX_2023_12_13: restore the complete stem, code block and options from the PDF.
CHOICE_ITEM_OVERRIDES.update({
    ("gesp-cpp7-2023-12", 13): {
        "tags": ["图论", "复杂度分析", "结构体"],
        "question": """用下面的邻接表结构保存一个有向图 G，InfoType 和 VertexType 是定义好的类型。设 G 有 n 个顶点、e 条弧，则求图 G 中某个顶点 u 的度的算法复杂度是（ ）。

```cpp
typedef struct ArcNode {
    int adjvex;
    struct ArcNode *nextarc;
    InfoType *info;
} ArcNode;
typedef struct VNode {
    VertexType data;
    ArcNode *firstarc;
} VNode, AdjList[MAX_VERTEX_NUM];
typedef struct {
    AdjList vertices;
    int vexnum, arcnum;
    int kind;
} ALGraph;
```""",
        "options": {
            "A": "O(n)",
            "B": "O(e)",
            "C": "O(n + e)",
            "D": "O(n + 2 * e)",
        },
    },
})
JUDGMENT_ITEM_OVERRIDES = {
    ("gesp-cpp3-2025-09", 8): {"question": "表达式 a > b ? a : b = 19; 一定是合法的 C++ 代码。（ ）"},
    ("gesp-cpp8-2023-12", 10): {"tags": ["数学函数"], "question": "给定 double 类型的变量 x，且其值大于等于 0，我们可以通过二分法求出 √x 的近似值。（ ）"},    ("gesp-cpp5-2025-09", 3): {"question": "下面递归实现的斐波那契数列的时间复杂度为 O(n)。\n\n```cpp\nlong long fib_memo(int n, long long memo[]) {\n    if (n <= 1) return n;\n    if (memo[n] != -1) return memo[n];\n    memo[n] = fib_memo(n - 1, memo) + fib_memo(n - 2, memo);\n    return memo[n];\n}\nint main() {\n    int n = 48;\n    long long memo[100];\n    fill_n(memo, 100, -1);\n    long long result = fib_memo(n, memo);\n    return 0;\n}\n```"},
    ("gesp-cpp7-2025-12", 10): {"question": "一个包含 V 个顶点的连通无向图，其任何一棵生成树都恰好包含 V − 1 条边。"},
    ("gesp-cpp5-2023-09", 10): {"question": "下面的 C++ 代码执行后将输出 0 5 1 6 2 3 4。\n\n```cpp\n#include <iostream>\n#include <algorithm>\nusing namespace std;\nbool compareModulo5(int a, int b) {\n    return a % 5 < b % 5;\n}\nint main() {\n    int lst[7];\n    for (int i = 0; i < 7; i++)\n        lst[i] = i;\n    // 对序列所有元素按 compareModulo5 结果排序\n    sort(lst, lst + 7, compareModulo5);\n    for (int i = 0; i < 7; i++)\n        cout << lst[i] << \" \";\n    cout << endl;\n    return 0;\n}\n```"},    ("gesp-cpp6-2024-12", 10): {"question": "栈中元素的插入和删除操作都在栈的顶端进行，所以用双向链表比单向链表更合适来实现。"},
    ("gesp-cpp6-2025-12", 10): {"question": "假定只有一个根节点的树的深度为 1，则一棵有 n 个节点的完全二叉树，其树的深度为 ⌊log₂(n)⌋ + 1。"},
    ("gesp-cpp8-2025-03", 10): {"question": "从 32 名学生中选出 4 人分别担任班长、副班长、学习委员和组织委员，共有 C(32, 4) 种不同的选法。"},
    ("gesp-cpp8-2025-12", 7): {"question": "n 个不同元素依次入栈的出栈序列数与将 n 个不同元素划分成若干非空子集的方案数相等。"},
    ("gesp-cpp4-2023-09", 9): {"question": "== 和 := 都是 C++ 语言的运算符。"},
    ("gesp-cpp2-2023-03", 7): {"question": "while 语句的循环体至少会执行一次。"},    ("gesp-cpp2-2025-12", 10): {
        "question": """C++代码执行后输出如下，因为代码 `printf("\\n")` 没有任何可读内容，删除不影响输出效果。（ ）

```text
  1  2  3  4  5  6  7  8  9
  2  4  6  8 10 12 14 16 18
  3  6  9 12 15 18 21 24 27
  4  8 12 16 20 24 28 32 36
  5 10 15 20 25 30 35 40 45
  6 12 18 24 30 36 42 48 54
  7 14 21 28 35 42 49 56 63
  8 16 24 32 40 48 56 64 72
  9 18 27 36 45 54 63 72 81
```

```cpp
for (int i = 1; i < 10; i++) {
    for (int j = 1; j < 10; j++)
        printf("%3d", i * j);
    printf("\\n");
}
```""",
    },
}

JUDGMENT_ITEM_OVERRIDES.update({
    ("gesp-cpp4-2024-06", 8): {"tags": ["多层循环语句", "数组"], "question": "在下面这个程序里，a[i][j] 和一个普通的整型变量一样使用。（ ）\n\n```cpp\n#include <iostream>\nusing namespace std;\nint main()\n{\n    int a[10][10] = {0};\n    for (int i = 0; i < 10; i++)\n        for (int j = 0; j < 10; j++)\n        {\n            if (i == 3)\n                a[i][j] = 1;\n        }\n}\n```"},
})
JUDGMENT_ITEM_OVERRIDES.update({
    ("gesp-cpp3-2023-12", 5): {"tags": ["数组", "分支与循环"], "question": "C++ 代码将输出 0 5，5 后面还有一个空格。（ ）\n\n```cpp\nint list[10] = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};\nfor (int i = 0; i < 10; i++)\n    if (i % 5 == 0)\n        cout << list[i] << \" \";\n```"},
})

# PDF-confirmed text replacements for the remaining visual/OCR issues.
QUESTION_TEXT_OVERRIDES = {
    ("gesp-cpp8-2026-03", 6): "若一个图中所有顶点的度数为偶数，则一定存在欧拉回路。（ ）",
    ("gesp-cpp5-2024-09", 1): "在操作系统中，需要对一组进程进行循环。每个进程被赋予一个时间片，当时间片用完时，CPU 将切换到下一个进程。这种循环操作可以通过环形链表来实现。",
    ("gesp-cpp2-2023-06", 7): "循环语句的循环体有可能无限制地执行下去。",
    ("gesp-cpp8-2023-12", 5): "哈希函数的设计目标是在不会产生冲突的情况下，将关键字映射到哈希表的位置。",
    ("gesp-cpp8-2024-06", 1): "若干个人围成一个圆圈坐在一起，一共有 48 种排法。",
    ("gesp-cpp6-2025-06", 3): "为了实现一个队列，使其出队操作（pop）的时间复杂度为 O(1) 并且避免数组删除首元素的 O(n) 问题，一种常见且有效的方法是使用环形数组，通过调整队首和队尾指针来实现。",
    ("gesp-cpp3-2023-09", 8): "著名的哥德巴赫猜想：任一大于 2 的偶数都可写成两个素数之和。我们可以通过枚举法来证明它。",
    ("gesp-cpp4-2024-12", 2): "一个函数必须在调用之前既声明又定义。",
    ("gesp-cpp8-2025-03", 9): "判断无向图中是否有环，可以通过广度优先搜索实现。",
    ("gesp-cpp3-2023-09", 1): "二进制数 101.101 在十进制下是 5.005。",
    ("gesp-cpp5-2024-12", 1): "单链表只支持在表头进行插入和删除操作。",
    ("gesp-cpp3-2024-06", 5): "数组的所有元素在内存中可以不连续存放。",
    ("gesp-cpp5-2024-12", 3): "任何一个大于 1 的自然数都可以分解成若干个不同的质数的乘积，且分解方式是唯一的。",
    ("gesp-cpp8-2025-12", 6): "使用二叉堆优化的 Dijkstra 最短路算法，在某些特殊情况下时间复杂度不如朴素实现的 O(V^2)。",
    ("gesp-cpp4-2023-09", 8): "一个可能抛出异常的函数，调用它的位置没有在 try 子句中，会引起编译错误。",
    ("gesp-cpp6-2025-09", 5): "循环队列通过模运算循环使用空间。",
    ("gesp-cpp6-2025-03", 8): "面向对象编程中，封装是指将数据和行为绑定在一起，并对外隐藏实现细节。",
    ("gesp-cpp4-2024-09", 4): "二维数组的行的大小必须在定义时确定，列的大小可以动态变化。",
    ("gesp-cpp8-2024-12", 9): "判断图是否连通，可以通过广度优先搜索实现。",
    ("gesp-cpp6-2025-12", 2): "面向对象编程中，封装是指将数据和操作数据的方法绑定在一起，并对外隐藏实现细节。",
    ("gesp-cpp4-2023-06", 9): ">= 和 >> 都是 C++ 语言的运算符。",
    ("gesp-cpp7-2024-03", 6): "要求出简单有向图中从顶点 A 到顶点 B 的最短路径，在深度优先搜索和广度优先搜索中选择，广度优先更适合。（ ）",
    ("gesp-cpp4-2023-12", 3): "[(1, 2) * 2] * 3 在 C++ 中是合法的表达式。（ ）",
    ("gesp-cpp8-2024-09", 8): "已知 int 类型的变量 a 和 b 中分别存储着一个直角三角形的两条直角边的长度，则该三角形的面积可以通过表达式 a / 2.0 * b 求得。",
    ("gesp-cpp8-2023-12", 7): "已知 int 类型的变量 a、b 和 h 中分别存储着一个梯形的顶边、底边长和高，则这个梯形的面积可以通过表达式 (a + b) * h / 2 求得。",
    ("gesp-cpp8-2025-03", 8): "定义 int 类型的变量 a 和 b，求二次函数 y = x^2 + ax + b 取最小值时的值，可以通过表达式 -a / 2.0 求得。",
    ("gesp-cpp8-2024-06", 4): "已知 int 类型的变量 a 和 b 中分别存储着一个直角三角形的两条直角边的长度，则斜边的长度可以通过表达式 sqrt(a * a + b * b) 求得。",
    ("gesp-cpp5-2025-09", 8): "下面代码采用分治算法求解标准 3 柱汉诺塔问题，时间复杂度为 O(n log n)。",
    ("gesp-cpp8-2025-09", 10): "从 32 名学生中选出 2 人分别担任男生班长和女生班长（男生班长必须是男生，女生班长必须是女生），则共有 C(32, 2) / 2 种不同的选法。",
    ("gesp-cpp7-2025-03", 6): "一棵 N 层的满二叉树，一定有 2^N - 1 个结点。",
    ("gesp-cpp8-2025-06", 7): "n 个顶点的无向完全图，有 n^(n - 2) 棵生成树。",
    ("gesp-cpp6-2025-09", 6): "一棵有 n 个节点的二叉树一定有 n - 1 条边。",
    ("gesp-cpp7-2024-09", 6): "一棵 N 层的完全二叉树，一定有 2^N - 1 个结点。",
    ("gesp-cpp7-2024-06", 6): "一棵 N 层的二叉树，至少有 2^(N - 1) 个节点。",
    ("gesp-cpp7-2025-09", 6): "一棵有 N 个节点的完全二叉树，则树的深度为 log2(N) + 1。（ ）",
    ("gesp-cpp6-2025-09", 3): "一个含有 100 个节点的完全二叉树，高度为 8。",
    ("gesp-cpp8-2024-03", 4): "N 个顶点的无向完全图有 N * (N - 1) 条边。",
    ("gesp-cpp8-2023-12", 4): "N 个顶点的有向完全图（不带自环）有 N * (N - 1) / 2 条边。",
    ("gesp-cpp6-2023-12", 7): "二叉搜索树查找的平均时间复杂度为 O(log N)。（ ）",
    ("gesp-cpp4-2024-06", 10): "插入排序算法中，平均时间复杂度是 O(n^2)，最坏的情况逆序情况下，达到最大时间复杂度。",
    ("gesp-cpp5-2023-12", 1): "归并排序的时间复杂度是 O(log N)。（ ）",
    ("gesp-cpp8-2024-03", 10): "给定 double 类型的变量 x，且其值大于等于 1，我们可以通过二分法求出 log x 的近似值。",
    ("gesp-cpp8-2026-03", 8): "如果将一个连通无向图 G1 中所有边的权值都统一增加同一个正整数常数 C，形成图 G2，则 G1 的最小生成树中每条边对应 G2 中对应的边组成的树，一定是 G2 的最小生成树。（ ）",
}
QUESTION_PREFIX_OVERRIDES = {
    ("gesp-cpp2-2023-09", 7): "如下图所示，输出 N 行 N 列的矩阵，对角线为 1。N = 9 时，原题示例输出为：\n\n\x60\x60\x60text\n1 0 0 0 0 0 0 0 0\n0 1 0 0 0 0 0 0 0\n0 0 1 0 0 0 0 0 0\n0 0 0 1 0 0 0 0\n0 0 0 0 1 0 0 0\n0 0 0 0 0 1 0 0\n0 0 0 0 0 0 1 0\n0 0 0 0 0 0 0 1 0\n0 0 0 0 0 0 0 0 1\n\x60\x60\x60\n\n横线处应填入（ ）。",
    ("gesp-cpp7-2025-03", 8): "2025 是个神奇的数字，因为它是由两个数 20 和 25 拼接而成，而且 2025 = (20 + 25)^2。小杨决定写个程序找找小于 N 的正整数中共有多少这样的神奇的数字。下面程序横线处应填入的是（ ）。",
    ("gesp-cpp8-2025-03", 9): "2025 是个神奇的数字，因为它是由两个数 20 和 25 拼接而成，而且 2025 = (20 + 25)^2。小杨决定写个程序找找小于 N 的正整数中共有多少这样的神奇的数字。下面程序横线处应填入的是（ ）。",
}
def apply_question_text_overrides(paper_id: str, items: list[dict]) -> None:
    for item in items:
        key = (paper_id, item["number"])
        exact = QUESTION_TEXT_OVERRIDES.get(key)
        if exact is not None:
            item["question"] = exact
        prefix = QUESTION_PREFIX_OVERRIDES.get(key)
        if prefix is not None:
            original = item.get("question", "")
            code_at = original.find("\x60\x60\x60cpp")
            if code_at >= 0:
                item["question"] = prefix + "\n\n" + original[code_at:]
            else:
                item["question"] = prefix


QUESTION_EXACT_OVERRIDES = {
    ("gesp-cpp3-2023-09", 2): "下列流程图的输出结果是（ ）。\n\n\x60\x60\x60text\n开始\n  a = 5, s = 1\n  当 a > 4 时：\n      s = s * a\n      a = a - 1\n  输出 s\n结束\n\x60\x60\x60",
    ("gesp-cpp6-2026-03", 3): "对如下结构的树，执行 travel 函数，输出结果是 1 2 3 4 5。（ ）\n\n\x60\x60\x60text\n    1\n   / \\\n  2   3\n / \\\n4   5\n\x60\x60\x60\n\n\x60\x60\x60cpp\nstruct Node {\n    int val;\n    Node *left, *right;\n    Node(int v) : val(v), left(nullptr), right(nullptr) {}\n};\nvoid travel(Node* root) {\n    if (!root) return;\n    stack<Node*> s;\n    s.push(root);\n    while (!s.empty()) {\n        Node* cur = s.top(); s.pop();\n        cout << cur->val << \" \";\n        if (cur->right) s.push(cur->right);\n        if (cur->left) s.push(cur->left);\n    }\n}\n\x60\x60\x60",
}
def apply_question_text_overrides(paper_id: str, items: list[dict], question_type: str) -> None:
    for item in items:
        key = (paper_id, item["number"])
        if question_type == "judgment":
            exact = QUESTION_TEXT_OVERRIDES.get(key)
        else:
            exact = None
        if exact is not None:
            item["question"] = exact
        if question_type == "choice":
            prefix = QUESTION_PREFIX_OVERRIDES.get(key)
        else:
            prefix = None
        if prefix is not None:
            original = item.get("question", "")
            code_at = original.find("\x60\x60\x60cpp")
            if code_at >= 0:
                item["question"] = prefix + "\n\n" + original[code_at:]
            else:
                item["question"] = prefix
        exact = QUESTION_EXACT_OVERRIDES.get(key)
        exact_type = "choice" if key == ("gesp-cpp3-2023-09", 2) else "judgment"
        if exact is not None and exact_type == question_type:
            item["question"] = exact


def apply_judgment_item_overrides(paper_id: str, items: list[dict]) -> None:
    for item in items:
        override = JUDGMENT_ITEM_OVERRIDES.get((paper_id, item["number"]))
        if override:
            item.update(override)
    apply_question_text_overrides(paper_id, items, "judgment")


def apply_choice_item_overrides(paper_id: str, items: list[dict]) -> None:
    for item in items:
        override = CHOICE_ITEM_OVERRIDES.get((paper_id, item["number"]))
        if override:
            item.update(override)
    apply_question_text_overrides(paper_id, items, "choice")

PAGE_NOISE = (
    re.compile(r"^第\s*\d+\s*页\s*/\s*共\s*\d+\s*页$"),
    re.compile(r"^题号(?:\s+\d+){3,}\s*$"),
    re.compile(r"^答案(?:\s+[A-D×√])*\s*$"),
)


def clean_text(text: str) -> str:
    text = text.replace("\u00a0", " ").replace("\u3000", " ").replace("\r", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def is_page_noise(line: str) -> bool:
    value = re.sub(r"\s+", " ", line.strip())
    return any(pattern.fullmatch(value) for pattern in PAGE_NOISE)


def code_payload(line: str) -> tuple[int, str] | None:
    """Return a PDF line-numbered code line, preserving its indentation."""
    match = re.match(r"^\s*(\d{1,3})(\s+)(.*\S)\s*$", line)
    if not match:
        return None
    payload = match.group(2)[2:] + match.group(3)
    code_markers = (
        "#include", "#define", "using namespace", "int ", "long ", "double ",
        "float ", "char ", "bool ", "void ", "const ", "static ", "virtual ",
        "string ", "vector", "class ", "struct ", "template", "public:",
        "private:", "protected:", "cout", "cin", "printf", "scanf", "return",
        "for ", "for(", "while ", "while(", "if ", "if(", "else", "switch",
        "switch(", "case ", "default:", "new ", "delete", "{", "}", "//", "/*",
        "*/", "++", "--", "<<", ">>", "=", ";", "________________",
    )
    ascii_chars = sum(ord(char) < 128 for char in payload)
    mostly_ascii_code = (
        bool(payload)
        and ascii_chars / len(payload) > 0.8
        and bool(re.search(r"(?:==|!=|<=|>=|<<|>>|\+\+|--|[;{}=])", payload))
    )
    if (
        mostly_ascii_code
        or any(marker in payload for marker in code_markers)
        or bool(re.search(r"_{4,}", payload))
    ):
        payload = re.sub(
            r"\s+\d{1,3}\s+(?=(?:#(?:include|define)|using\s+namespace|"
            r"(?:int|long|double|float|char|bool|void|string|class|struct|template)\b|"
            r"(?:public|private|protected|default):|(?:if|for|while|switch)\s*\())",
            "\n",
            payload,
        )
        return int(match.group(1)), payload.rstrip()
    return None


def looks_like_code(value: str) -> bool:
    text = value.strip()
    markers = (
        "#include", "using namespace", "cout", "cin", "printf(", "scanf(",
        "return ", "for (", "while (", "if (", "else {", "switch (",
        "int ", "long ", "double ", "float ", "char ", "bool ", "string ",
        "vector<", "++", "--", "<<", ">>", "==", "!=", "&&", "||",
    )
    ascii_chars = sum(ord(char) < 128 for char in text)
    mostly_ascii_expression = (
        bool(text) and ascii_chars / len(text) > 0.8
        and bool(re.search(r"(?:==|!=|<=|>=|<<|>>|\+\+|--|[;{}=])", text))
    )
    return (
        mostly_ascii_expression
        or (
            any(marker in text for marker in markers)
            and (
                text.endswith(";") or "{" in text or "}" in text or "\n" in text
                or bool(re.match(r"^(?:int|long|double|float|char|bool|string|for|while|if)\b", text))
            )
        )
    )


def join_prose(lines: list[str]) -> str:
    parts = [
        re.sub(r"\s+", " ", unicodedata.normalize("NFKC", line.strip()))
        for line in lines if line.strip()
    ]
    return " ".join(parts).strip()


def format_pdf_block(text: str, *, option: bool = False) -> str:
    """Clean a question/option block and format extracted C++ consistently."""
    raw_lines = [
        line.rstrip()
        for line in text.replace("\r", "").splitlines()
        if not is_page_noise(line)
    ]
    has_code_context = any(
        line.strip() == OCR_START or code_payload(line) for line in raw_lines
    )
    if has_code_context:
        raw_lines = [line for line in raw_lines if not re.fullmatch(r"\s*\d{1,3}\s*", line)]
    output: list[str] = []
    prose: list[str] = []
    index = 0

    def flush_prose() -> None:
        value = join_prose(prose)
        if value:
            output.append(value)
        prose.clear()

    while index < len(raw_lines):
        if raw_lines[index].strip() == OCR_START:
            flush_prose()
            index += 1
            code_lines: list[str] = []
            while index < len(raw_lines) and raw_lines[index].strip() != OCR_END:
                code_lines.append(raw_lines[index].rstrip())
                index += 1
            index += 1
            output.append("```cpp\n" + "\n".join(code_lines).strip() + "\n```")
            continue
        current = code_payload(raw_lines[index])
        if current:
            code_lines: list[str] = []
            while index < len(raw_lines):
                parsed = code_payload(raw_lines[index])
                if not parsed:
                    if not raw_lines[index].strip():
                        index += 1
                        continue
                    break
                code_lines.append(parsed[1])
                index += 1
            flush_prose()
            output.append("```cpp\n" + "\n".join(code_lines) + "\n```")
            continue
        if raw_lines[index].strip():
            prose.append(raw_lines[index])
        index += 1
    flush_prose()

    value = "\n\n".join(output).strip().replace("{@}", "{0}")

    def clean_fenced_code(match: re.Match) -> str:
        lines: list[str] = []
        for line in match.group(1).splitlines():
            parsed = code_payload(line)
            lines.append(parsed[1] if parsed else line)
        return "```cpp\n" + "\n".join(lines) + "\n```"

    value = re.sub(r"```cpp\n([\s\S]*?)\n```", clean_fenced_code, value)
    if option:
        value = re.sub(
            r"```(?:cpp|text)?\n([\s\S]*?)\n```",
            lambda match: match.group(1).strip(),
            value,
        )
        return re.sub(r"\n{3,}", "\n\n", value).strip()
    return value


def parse_header(text: str):
    m = re.search(r"GESP_(\d{4})年(\d{1,2})月_C\+\+(\d+)级", text)
    if not m:
        raise ValueError("cannot parse paper metadata")
    return int(m.group(1)), int(m.group(2)), int(m.group(3))


def choice_answers(text: str) -> list[str]:
    # The first answer row is the official single-choice key.
    m = re.search(r"答案\s*((?:[A-D]\s*){15})", text)
    if not m:
        raise ValueError("choice answer row missing")
    ans = re.findall(r"[A-D]", m.group(1))
    if len(ans) != 15:
        raise ValueError(f"expected 15 choice answers, got {len(ans)}")
    return ans


def normalize_ocr_code(raw: str) -> str:
    value = (
        raw.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
        .replace("＜", "<").replace("＞", ">").replace("＝", "=")
    )
    lines = [
        re.sub(r"^\s*\d{1,3}(?:\)|\s+|(?=[{}]))\s*", "", line).rstrip()
        for line in value.splitlines() if line.strip()
    ]
    numbered = sum(bool(re.match(r"^\s*\d{1,3}\s{2,}", line)) for line in lines)
    if numbered >= max(1, len(lines) // 2):
        lines = [re.sub(r"^\s*\d{1,3}\s{2,}", "", line) for line in lines]
    for index, line in enumerate(lines):
        if line.strip() == "=" and index and lines[index - 1].rstrip().endswith(")"):
            lines[index] = "{"
    value = "\n".join(lines)
    value = re.sub(r"\s+\$\s+", " % ", value)
    value = (
        value.replace("—=", "-=").replace("–=", "-=").replace("!'=", "!=")
        .replace(" gs ", " % ").replace(" 9s ", " % ")
    )
    value = re.sub(r"\b([A-Za-z_]\w*)\s*:\s*:\s*", r"\1::", value)
    value = re.sub(r"(?<![<>=!])=\s+=", "==", value)
    value = re.sub(r"<\s+<", "<<", value)
    value = re.sub(r">\s+>", ">>", value)
    value = re.sub(r"\(\s{5,}\)", "(________________)", value)
    if "for (" in value and "cout << i" in value:
        value = re.sub(r"(%|/|\*)\s*1(?=\s*(?:==|!=|<|>))", r"\1 i", value)
    if re.search(r"for\s*\(\s*i\s*=", value):
        value = re.sub(r"(?<=\W)1(?=\s*(?:<|<=|>|>=)\s*[A-Za-z_])", "i", value)
    value = re.sub(r"\bif\s*\)", "if (________________)", value)
    value = re.sub(r"\bJj\b", "j", value)
    value = re.sub(r"\b1i\b", "i", value)
    if re.search(r"\bx\b", value):
        value = re.sub(r"\bX\b", "x", value)
    value = re.sub(r"\b1st(?=\w*\b)", "lst", value)
    return value.strip()


def ocr_image(path: Path, page_number: int, image: dict) -> str:
    override = OCR_OVERRIDES.get((path.name, page_number, image.get("name")))
    if override is not None:
        return override.strip()
    key = f"{path.name}|{page_number}|{image.get('name')}|{image.get('srcsize')}|eng+chi_sim-gutter-v2"
    raw = OCR_CACHE.get(key)
    if raw is None:
        if not TESSERACT.exists() or not (TESSDATA / "eng.traineddata").exists():
            return ""
        try:
            source = Image.open(io.BytesIO(image["stream"].get_data())).convert("L")
        except Exception:
            render_key = (str(path), page_number)
            rendered = RENDER_CACHE.get(render_key)
            if rendered is None:
                document = pdfium.PdfDocument(str(path))
                rendered = document[page_number - 1].render(scale=3).to_pil().convert("RGB")
                RENDER_CACHE[render_key] = rendered
            scale = 3
            source = rendered.crop((
                int(image["x0"] * scale), int(image["top"] * scale),
                int(image["x1"] * scale), int(image["bottom"] * scale),
            )).convert("L")
        # Source screenshots include a line-number/fold gutter that badly
        # confuses OCR (for example `1` becomes `i`). Remove only that gutter.
        source = source.crop((int(source.width * 0.06), 0, source.width, source.height))
        source = source.resize((source.width * 3, source.height * 3))
        source = ImageEnhance.Contrast(source).enhance(2)
        buffer = io.BytesIO()
        source.save(buffer, format="PNG")
        completed = subprocess.run(
            [
                str(TESSERACT), "stdin", "stdout", "--tessdata-dir", str(TESSDATA),
                "-l", "eng+chi_sim", "--psm", "6", "-c", "preserve_interword_spaces=1",
                "-c", "user_defined_dpi=300",
            ],
            input=buffer.getvalue(), capture_output=True, check=False,
        )
        raw = completed.stdout.decode("utf-8", errors="replace")
        OCR_CACHE[key] = raw

    code = normalize_ocr_code(raw)
    marker_count = sum(
        marker in code
        for marker in (
            "#include", "int ", "long ", "double ", "float ", "char ", "bool ",
            "string ", "vector", "cout", "cin", "printf", "scanf", "return",
            "for", "while", "if", "else", "switch", "{", "}", ";", "<<", ">>",
        )
    )
    return code if marker_count >= 2 or looks_like_code(code) else ""


def page_text(path: Path, page) -> tuple[str, bool]:
    lines = page.extract_text_lines(layout=True, return_chars=False)
    programming_tops = [line["top"] for line in lines if "编程题" in line["text"]]
    programming_top = min(programming_tops) if programming_tops else None
    items = [(line["top"], 0, line["text"]) for line in lines]
    for image in page.images:
        if (
            image["top"] < 80
            and image["height"] < 80
            and image["width"] > 350
        ):
            continue
        if programming_top is not None and image["top"] >= programming_top:
            continue
        code = ocr_image(path, page.page_number, image)
        if code:
            items.append((image["top"], 1, f"{OCR_START}\n{code}\n{OCR_END}"))
    items.sort(key=lambda item: (item[0], item[1]))
    RENDER_CACHE.pop((str(path), page.page_number), None)
    return "\n".join(item[2] for item in items), programming_top is not None


def all_text(path: Path) -> str:
    """Merge text lines and embedded code images in their visual page order."""
    pages: list[str] = []
    with pdfplumber.open(str(path)) as pdf:
        for page in pdf.pages:
            value, reached_programming = page_text(path, page)
            pages.append(value)
            if reached_programming:
                break
    return "\n\n".join(pages)


def section_text(text: str, heading: str, next_heading: str | None = None) -> str:
    start = text.find(heading)
    if start < 0:
        raise ValueError(f"section missing: {heading}")
    body = text[start + len(heading):]
    if next_heading:
        end = body.find(next_heading)
        if end >= 0:
            line_start = body.rfind("\n", 0, end) + 1
            if re.fullmatch(r"\s*\d+\s*", body[line_start:end]):
                end = line_start
            body = body[:end]
    return body


def split_numbered(body: str) -> list[str]:
    matches = list(re.finditer(r"(?:第\s*)?(\d{1,2})\s*题", body))
    latest: dict[int, re.Match] = {}
    strict_matches = list(re.finditer(r"\u7b2c\s*(\d{1,2})\s*\u9898", body))
    if len(strict_matches) >= 10:
        matches = strict_matches
    for match in matches:
        latest[int(match.group(1))] = match
    matches = [latest[n] for n in sorted(latest)]
    result: list[str] = []
    for index, match in enumerate(matches):
        number = int(match.group(1))
        if number < 1 or number > 15:
            continue
        end = matches[index + 1].start() if index + 1 < len(matches) else len(body)
        value = body[match.end():end]
        value = re.sub(r"^\s*[:：.]?\s*", "", value)
        result.append(value)
    # Some PDFs use a bare `1.` rather than `第 1 题`.
    if len(result) < 10:
        matches = list(re.finditer(r"(?m)^\s*(\d{1,2})[.、]\s*", body))
        result = []
        for index, match in enumerate(matches):
            end = matches[index + 1].start() if index + 1 < len(matches) else len(body)
            result.append(body[match.end():end])
    return result


def parse_choice_items(text: str) -> list[dict]:
    body = section_text(text, "单选题", "判断题")
    chunks = split_numbered(body)
    items: list[dict] = []
    for number, chunk in enumerate(chunks, 1):
        if number > 15:
            break
        option_matches = list(re.finditer(r"(?:^|\s)([ABCD])[.．、]\s*", chunk))
        question = chunk[: option_matches[0].start()] if option_matches else chunk
        options: dict[str, str] = {}
        for index, match in enumerate(option_matches):
            end = option_matches[index + 1].start() if index + 1 < len(option_matches) else len(chunk)
            options[match.group(1)] = format_pdf_block(chunk[match.end():end], option=True)
        if not question.strip():
            question = f"\u539f\u5377\u7b2c {number} \u9898\uff08PDF \u6587\u672c\u5c42\u672a\u63d0\u53d6\u9898\u5e72\uff09"
        for key in "ABCD":
            options.setdefault(key, f"\u539f\u5377\u9009\u9879 {key}\uff08PDF \u4e2d\u7684\u56fe\u793a\u6216\u4ee3\u7801\u672a\u63d0\u53d6\uff09")
        items.append({"number": number, "question": format_pdf_block(question), "options": options})
    if len(items) != 15:
        raise ValueError(f"expected 15 choice questions, got {len(items)}")
    return items


def parse_judgment_answers(text: str) -> list[str] | None:
    # Newer PDFs contain an extractable answer row using ×/√.
    start = text.find("判断题")
    candidate = text[start:start + 5000] if start >= 0 else text
    candidate = text
    m = re.search(r"答案\s*((?:[×√]\s*){10})", candidate)
    if m:
        return ["A" if c == "√" else "B" for c in re.findall(r"[×√]", m.group(1))]
    return None


def vector_judgment_answers(path: Path) -> list[str] | None:
    """Decode check/cross glyphs used by older answer tables."""
    with pdfplumber.open(str(path)) as pdf:
        for page in pdf.pages:
            groups: dict[float, list[dict]] = {}
            for rect in page.rects:
                if rect["width"] > 10 and rect["height"] < 2:
                    groups.setdefault(round(rect["top"], 1), []).append(rect)
            rows = sorted((top, sorted(rects, key=lambda item: item["x0"]))
                          for top, rects in groups.items() if len(rects) >= 11)
            for (_, _), (answer_top, answer_row), (bottom_top, _) in zip(rows, rows[1:], rows[2:]):
                if len(answer_row) < 11:
                    continue
                answers = []
                for index in range(1, 11):
                    left, right = answer_row[index]["x0"], answer_row[index]["x1"]
                    marks = [c for c in page.curves if c["x0"] >= left - 0.2 and c["x1"] <= right + 0.2
                             and c["top"] >= answer_top and c["bottom"] <= bottom_top]
                    if not marks:
                        break
                    answers.append("A" if max(c["width"] for c in marks) >= 6 else "B")
                if len(answers) == 10:
                    return answers
    return None


def parse_judgment_items(text: str) -> list[dict]:
    body = section_text(text, "判断题", "编程题")
    chunks = split_numbered(body)
    items: list[dict] = []
    for number, chunk in enumerate(chunks, 1):
        if number > 10:
            break
        # Strip answer-table noise that can appear before question 1.
        chunk = re.sub(r"^.*?(?=(?:C\+\+|在|若|如果|一个|一条|执行|给定|对于|通过|使用|表达式|已知|某))", "", chunk, flags=re.S)
        if not chunk.strip():
            chunk = f"\u539f\u5377\u7b2c {number} \u9898\uff08PDF \u6587\u672c\u5c42\u672a\u63d0\u53d6\u9898\u5e72\uff09"
        items.append({"number": number, "question": format_pdf_block(chunk)})
    if len(items) != 10:
        raise ValueError(f"expected 10 judgment questions, got {len(items)}")
    return items


TAG_RULES = [
    # Rules are ordered from specific to general. Each rule also carries the
    # first GESP level in which the syllabus introduces that topic.
    ("动态规划", 6, [r"动态规划", r"状态转移", r"背包问题", r"最长公共(?:子序列|子串)", r"(?<![A-Za-z])DP(?![A-Za-z])"]),
    ("图论", 7, [r"图论", r"有向图", r"无向图", r"连通图", r"图的(?:遍历|存储|连通)", r"顶点", r"邻接(?:矩阵|表)", r"最短(?:路|路径)", r"最小生成树", r"\b(?:Dijkstra|Floyd|Kruskal|Prim)\b", r"泛洪算法"]),
    ("树与二叉树", 6, [r"二叉树", r"完全二叉树", r"二叉搜索树", r"哈夫曼", r"树的(?:遍历|深度|高度|结点)", r"(?:前序|中序|后序|层序)遍历", r"叶子结点"]),
    ("哈希表", 7, [r"哈希", r"散列", r"hash(?:_?table)?"]),
    ("栈与队列", 6, [r"栈", r"队列", r"循环队列", r"\b(?:stack|queue|deque)\b"]),
    ("面向对象", 6, [r"面向对象", r"构造函数", r"析构函数", r"继承", r"多态", r"成员变量", r"成员函数", r"访问权限", r"\bclass\s+[A-Za-z_]"]),
    ("链表", 5, [r"链表", r"链式结构", r"链式存储", r"头结点", r"尾结点"]),
    ("高精度", 5, [r"高精度", r"大整数", r"超过.*(?:整数|long long).*范围"]),
    ("二分查找", 5, [r"二分(?:查找|搜索|答案)", r"折半查找", r"lower_bound", r"upper_bound"]),
    ("贪心算法", 5, [r"贪心"]),
    ("分治算法", 5, [r"分治", r"归并排序", r"快速排序"]),
    ("搜索与递归", 5, [r"递归", r"回溯", r"深度优先", r"广度优先", r"(?<![A-Za-z])DFS(?![A-Za-z])", r"(?<![A-Za-z])BFS(?![A-Za-z])"]),
    ("组合数学", 8, [r"排列组合", r"排列数", r"组合数", r"杨辉三角", r"二项式", r"计数原理"]),
    ("几何与代数", 8, [r"解析几何", r"平面几何", r"点积", r"叉积", r"矩阵乘法", r"线性代数"]),
    ("算法优化", 8, [r"倍增", r"离散化", r"空间换时间", r"时间换空间"]),
    ("数学与数论", 5, [r"质数", r"素数", r"质因数", r"素因数", r"最大公约数", r"最小公倍数", r"欧几里得", r"埃氏筛", r"线性筛", r"唯一分解", r"\bgcd\s*\(", r"\blcm\s*\("]),
    ("排序算法", 4, [r"排序", r"冒泡", r"插入排序", r"选择排序", r"归并排序", r"快速排序", r"\bsort\s*\("]),
    ("复杂度分析", 4, [r"时间复杂度", r"空间复杂度", r"算法复杂度", r"(?<![A-Za-z])O\s*\(\s*(?:1|n|log|n\s*log|n\s*\^)\s*[^)]*\)"]),
    ("文件操作", 4, [r"文件(?:输入|输出|读|写|操作)", r"\b(?:fstream|ifstream|ofstream)\b", r"\bfreopen\s*\("]),
    ("异常处理", 4, [r"异常处理", r"\b(?:try|catch|throw)\b"]),
    ("结构体", 4, [r"结构体", r"\bstruct\s+[A-Za-z_]"]),
    ("指针与引用", 4, [r"指针", r"引用传递", r"引用参数", r"地址运算符", r"取地址", r"解引用", r"\bnullptr\b", r"\bNULL\b", r"\b(?:new|delete)\b", r"->", r"\b(?:int|long|double|float|char|bool|void|string)\s*\*+\s*[A-Za-z_]"]),
    ("函数", 4, [r"函数(?:定义|声明|调用|参数|返回)", r"形参", r"实参", r"作用域", r"局部变量", r"全局变量", r"值传递", r"参数传递", r"返回值"]),
    ("递推", 4, [r"递推", r"递推式", r"递推关系"]),
    ("数组", 3, [r"数组", r"二维数组", r"多维数组", r"数组下标", r"\b[A-Za-z_]\w*\s*\[[^\]]*\]"]),
    ("字符串", 3, [r"字符串", r"字符数组", r"\bstring\b", r"\b(?:strcmp|strcpy|strcat|strlen|substr|find)\s*\("]),
    ("位运算", 3, [r"位运算", r"按位(?:与|或|异或|取反)", r"左移", r"右移", r"二进制位", r"\b(?!cout\b|cin\b)[A-Za-z_]\w*\s*(?:<<|>>)\s*(?:[A-Za-z_]\w*|\d+)"]),
    ("枚举与模拟", 3, [r"枚举", r"模拟算法", r"按题意模拟"]),
    ("流程图", 2, [r"流程图", r"程序流程", r"流程框", r"判断框", r"处理框"]),
    ("进制与编码", 2, [r"进制", r"二进制", r"八进制", r"十六进制", r"补码", r"原码", r"反码", r"ASCII", r"字符编码"]),
    ("数学函数", 2, [r"绝对值", r"平方根", r"向上取整", r"向下取整", r"\b(?:abs|fabs|sqrt|pow|ceil|floor|round)\s*\("]),
    ("分支与循环", 1, [r"循环", r"分支", r"条件语句", r"\b(?:if|else|switch|for|while|do|break|continue)\b"]),
    ("数据类型与运算", 1, [r"数据类型", r"类型转换", r"运算符", r"表达式", r"整数除法", r"取模", r"自增", r"自减", r"\b(?:int|long|double|float|char|bool|sizeof)\b"]),
    ("计算机基础", 1, [r"计算机", r"硬件", r"软件", r"中央处理器", r"处理器", r"\bCPU\b", r"存储器", r"内存", r"硬盘", r"操作系统", r"网络", r"\bTCP\b", r"\bUDP\b", r"\bIP(?:v[46])?\b", r"协议", r"传感器", r"输入设备", r"输出设备", r"编译器", r"解释器", r"程序设计语言", r"机器语言", r"汇编语言", r"字节"]),
]


def tags_for(question: str, level: int, question_type: str) -> list[str]:
    del question_type  # Reserved for future type-specific rules.
    tags = [
        name
        for name, minimum_level, patterns in TAG_RULES
        if level >= minimum_level and any(re.search(pattern, question, flags=re.I) for pattern in patterns)
    ]
    loop_count = len(re.findall(r"\b(?:for|while|do)\b", question, flags=re.I))
    if level >= 2 and (
        re.search(r"(?:嵌套|多层|双重|两层|三层).{0,8}循环|循环.{0,8}(?:嵌套|多层)", question)
        or loop_count >= 2
    ):
        tags.insert(0, "多层循环语句")
    if not tags:
        tags = ["C++基础" if level <= 4 else "算法基础"]
    return list(dict.fromkeys(tags))[:3]

def js_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def explanation(answer: str, answer_text: str, tags: list[str], question_type: str) -> str:
    topic = "、".join(tags)
    if question_type == "judgment":
        verdict = "题干说法成立" if answer == "A" else "题干说法不成立"
        detail = f"本题考查{topic}。逐项核对题干中的定义、运算规则和适用条件，可以判断：{verdict}，因此答案为“{answer_text}”。"
        tip = "判断题先找绝对化表述和边界条件，再用一个最小反例或规则逐句验证。"
        pitfall = "不要因为题干前半句正确就忽略后半句；整句话只有全部成立时才能选“正确”。"
    else:
        detail = f"本题考查{topic}。先提取题干的关键条件，再按照 C++ 语法、类型规则或算法定义逐步推导；与题干条件完全一致的选项是“{answer}（{answer_text}）”。"
        tip = "先圈出输入范围、循环边界、运算符优先级和复杂度要求，再逐项排除不满足条件的选项。"
        pitfall = "注意 C++ 的整数除法、下标边界、短路求值和运算符优先级，这些细节最容易导致误判。"
    return f"参考答案为 {answer}（{answer_text}）。\n\n**详细解析：**\n\n{detail}\n\n**解题技巧：** {tip}\n\n**易错点：** {pitfall}"


def build():
    papers: dict[str, dict] = {f"GESP-{level}": {} for level in range(2, 9)}
    errors = []
    count = 0
    for level in range(2, 9):
        folder = next(p for p in ROOT.iterdir() if p.is_dir() and p.name.startswith(f"GESP_C++{level}"))
        for pdf in sorted(folder.glob("*.pdf")):
            try:
                reader = pypdf.PdfReader(str(pdf))
                answer_text = "\n".join(page.extract_text() or "" for page in reader.pages)
                text = all_text(pdf)
                year, month, parsed_level = parse_header(pdf.name)
                if parsed_level != level:
                    raise ValueError("level mismatch")
                choice_key = choice_answers(answer_text)
                choices = parse_choice_items(text)
                judgments = parse_judgment_items(text)
                judgment_key = parse_judgment_answers(answer_text)
                if judgment_key is None:
                    judgment_key = vector_judgment_answers(pdf)
                if judgment_key is None:
                    # Old PDFs encode √/× as vector glyphs. The importer will
                    # fail loudly until a vector decoder is added for that file.
                    raise ValueError("judgment answer row is vector-only")
                paper_id = f"gesp-cpp{level}-{year}-{month:02d}"
                apply_choice_item_overrides(paper_id, choices)
                apply_judgment_item_overrides(paper_id, judgments)
                if paper_id == "gesp-cpp2-2026-06":
                    choices[11]["question"] = """如下数字图形在执行后续的 C++ 代码时，输入 `10` 输出：

```text
1 1 1 1 1 1 1 1 1 1
1 1 0 0 0 0 0 0 0 1
1 0 1 0 0 0 0 0 0 1
1 0 0 1 0 0 0 0 0 1
1 0 0 0 1 0 0 0 0 1
1 0 0 0 0 1 0 0 0 1
1 0 0 0 0 0 1 0 0 1
1 0 0 0 0 0 0 1 0 1
1 0 0 0 0 0 0 0 1 1
1 1 1 1 1 1 1 1 1 1
```

横线处应填入的代码是（ ）。

```cpp
int N;
cin >> N;
for (int i = 1; i < N + 1; i++) {
    for (int j = 1; j < N + 1; j++)
        if (________)
            cout << "1 ";
        else
            cout << "0 ";
    cout << endl;
}
```"""
                choice_questions = []
                for item, answer in zip(choices, choice_key):
                    option_text = item["options"].get(answer, "")
                    # Wrong options often deliberately name unrelated algorithms.
                    # Only the stem and official answer should influence tags.
                    tags = item.get("tags") or tags_for(item["question"] + " " + option_text, level, "choice")
                    choice_questions.append({
                        "id": f"{paper_id}-choice-{item['number']}", "number": item["number"],
                        "question": item["question"], "options": item["options"], "answer": answer,
                        "tags": tags, "explanation": explanation(answer, option_text, tags, "choice"),
                    })
                judgment_questions = []
                for item, answer in zip(judgments, judgment_key):
                    option_text = "正确" if answer == "A" else "错误"
                    tags = item.get("tags") or tags_for(item["question"], level, "judgment")
                    judgment_questions.append({
                        "id": f"{paper_id}-judgment-{item['number']}", "number": item["number"],
                        "question": item["question"], "options": {"A": "正确", "B": "错误"}, "answer": answer,
                        "tags": tags, "explanation": explanation(answer, option_text, tags, "judgment"),
                    })
                papers[f"GESP-{level}"][f"{year}-{month:02d}"] = {
                    "id": paper_id, "language": "C++", "level": level, "year": year, "month": month,
                    "session": f"{year}-{month:02d}", "title": f"{year}年{month}月 GESP C++ {level}级",
                    "sourceFile": pdf.name,
                    "sections": {
                        "choice": {"label": "单选题", "scorePerQuestion": 2, "questions": choice_questions},
                        "judgment": {"label": "判断题", "scorePerQuestion": 2, "questions": judgment_questions},
                    },
                }
                count += 25
                OCR_CACHE_PATH.write_text(
                    json.dumps(OCR_CACHE, ensure_ascii=False, indent=2), encoding="utf-8"
                )
            except Exception as exc:
                errors.append(f"{pdf}: {exc}")
    if errors:
        raise SystemExit("\n".join(errors))
    OCR_CACHE_PATH.write_text(
        json.dumps(OCR_CACHE, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    payload = json.dumps(papers, ensure_ascii=False, indent=2)
    output = """const explain = (answer, answerText, detail, tip, pitfall) => detail;\n\nexport const gespPapers = """ + payload + ";\n\n""" + """
export function listGespQuestions() {
  return Object.entries(gespPapers).flatMap(([level, sessions]) =>
    Object.values(sessions).flatMap(paper =>
      Object.entries(paper.sections).flatMap(([questionType, section]) =>
        section.questions.map(question => ({
          ...question,
          source: { level, paperId: paper.id, year: paper.year, session: paper.session,
            questionType, typeLabel: section.label, scorePerQuestion: section.scorePerQuestion },
        }))
      )
    )
  );
}

export function findGespQuestion(id) {
  for (const sessions of Object.values(gespPapers)) {
    for (const paper of Object.values(sessions)) {
      for (const section of Object.values(paper.sections)) {
        const question = section.questions.find(item => item.id === id);
        if (question) return { paper, question };
      }
    }
  }
  return null;
}
"""
    OUT.write_text(output, encoding="utf-8")
    print(f"generated {count} objective questions across {sum(len(x) for x in papers.values())} papers")


if __name__ == "__main__":
    build()
