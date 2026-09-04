// Generated from NOIP 黄金20题_含详细解析.md
export const noipProgramProblems = [
  {
    "id": "noip-2010-reading-1",
    "year": "NOIP",
    "sourceYear": "2010",
    "source": "NOIP2010",
    "type": "reading",
    "number": 1,
    "title": "NOIP2010：两个有序序列归并",
    "description": "两个有序序列归并\n\n知识点：双指针、归并、数组、时间复杂度\n\n难度：★★★\n\n训练重点：理解“两个有序序列合并”的双指针过程；分析边界和复杂度",
    "statement": "### 程序\n\n```cpp\n01 #include <iostream>\n02 using namespace std;\n03 int main()\n04 {\n05     const int SIZE = 100;\n06     int na, nb, a[SIZE], b[SIZE], i, j, k;\n07     cin >> na;\n08     for (i = 1; i <= na; i++)\n09         cin >> a[i];\n10     cin >> nb;\n11     for (i = 1; i <= nb; i++)\n12         cin >> b[i];\n13     i = 1;\n14     j = 1;\n15     while ((i <= na) && (j <= nb))\n16     {\n17         if (a[i] <= b[j])\n18         {\n19             cout << a[i] << ' ';\n20             i++;\n21         }\n22         else\n23         {\n24             cout << b[j] << ' ';\n25             j++;\n26         }\n27     }\n28     if (i <= na)\n29         for (k = i; k <= na; k++)\n30             cout << a[k] << ' ';\n31     if (j <= nb)\n32         for (k = j; k <= nb; k++)\n33             cout << b[k] << ' ';\n34     return 0;\n35 }\n```",
    "questions": [
      {
        "id": "noip-2010-reading-1-1",
        "number": 1,
        "text": "保证 `a` 数组和 `b` 数组有序，输出的序列一定是一个不降序列。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "只要 `a`、`b` 本身都是不降序列，那么每一步输出的都是两个“当前最小候选”中的较小值。\n\n例如：\n\n```text\na：1 3 7\nb：2 4 6\n```\n\n程序依次比较：\n\n```text\n1 和 2 -> 输出 1\n3 和 2 -> 输出 2\n3 和 4 -> 输出 3\n7 和 4 -> 输出 4\n...\n```\n\n因此最终仍然是不降序列。"
      },
      {
        "id": "noip-2010-reading-1-2",
        "number": 2,
        "text": "如果输入 `0 0`，不会输出数。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "若输入：\n\n```text\n0\n0\n```\n\n则 `na=0，nb=0`。\n\n两个输入数组的 `for` 循环都不会执行，同时：\n\n```cpp\nwhile ((i <= na) && (j <= nb))\n```\n\n条件一开始就为假，后面的两个“输出剩余元素”的循环也不会执行，因此不会输出任何数字。"
      },
      {
        "id": "noip-2010-reading-1-3",
        "number": 3,
        "text": "如果删掉第 13 行和第 14 行，不影响程序结果。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "原题中的相关语句用于初始化两个指针：\n\n```cpp\ni = 1;\nj = 1;\n```\n\n如果删除初始化，`i`、`j` 的值就不确定。后续却马上拿它们作为数组下标和循环条件：\n\n```cpp\nwhile ((i <= na) && (j <= nb))\n```\n\n因此程序行为不可预测，当然不能认为“结果不受影响”。"
      },
      {
        "id": "noip-2010-reading-1-4",
        "number": 4,
        "text": "使用 C++98 不会 CE。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "程序只使用了：\n\n- 普通数组；\n- `for` / `while`；\n- `cin` / `cout`；\n- 基本变量与条件判断。\n\n这些都是 C++98 已支持的语法，没有使用 `auto`、范围 `for`、`nullptr` 等新标准特性，所以 C++98 可以编译。"
      },
      {
        "id": "noip-2010-reading-1-5",
        "number": 5,
        "text": "该程序时间复杂度是（ ）。",
        "options": {
          "A": "`O(na + nb)`",
          "B": "`O(max{na,nb} log max{na,nb})`",
          "C": "`O(na * nb)`",
          "D": "`O(na^nb)`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 3,
        "explanation": "关键点是：**每个元素最多被处理一次。**\n\n主 `while` 中每轮必定执行：\n\n```cpp\ni++;\n```\n\n或：\n\n```cpp\nj++;\n```\n\n所以主循环总次数不会超过 `na+nb`。\n\n最后补输出剩余元素，也只是把尚未访问的元素再访问一次。\n\n因此：\n\n```text\n时间复杂度 = O(na + nb)\n```\n\n不是二重循环意义上的 `O(na*nb)`。"
      },
      {
        "id": "noip-2010-reading-1-6",
        "number": 6,
        "text": "如果输入：\n```text\n5\n1 3 5 7 9\n4\n2 6 10 14\n```\n输出（ ）。",
        "options": {
          "A": "`1 2 3 5 6 7 9 10 14`",
          "B": "`14 10 9 7 6 5 3 2 1`",
          "C": "`1 3 5 7 9 2 6 10 14`",
          "D": "`5 1 3 5 7 9 4 2 6 10 14`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 3,
        "explanation": "模拟：\n\n```text\na = 1 3 5 7 9\nb = 2 6 10 14\n```\n\n归并过程：\n\n```text\n1 < 2  -> 1\n2 < 3  -> 2\n3 < 6  -> 3\n5 < 6  -> 5\n6 < 7  -> 6\n7 < 10 -> 7\n9 < 10 -> 9\n```\n\n此时 `a` 已用完，将 `b` 剩下的 `10 14` 接在后面：\n\n```text\n1 2 3 5 6 7 9 10 14\n```\n\n故选 A。\n\n#### 本题必须掌握\n\n- 双指针不是“两个循环”，不能看到两个数组就误判为 `O(n^2)`。\n- 有序数组合并的核心不变量：**已经输出的部分一定是当前所有未输出元素中最小的一批。**\n\n\n---"
      }
    ],
    "tags": [
      "双指针",
      "归并",
      "数组",
      "时间复杂度"
    ],
    "sourceLabel": "NOIP2010（黄金20题）"
  },
  {
    "id": "noip-2017-reading-2",
    "year": "NOIP",
    "sourceYear": "2017",
    "source": "NOIP2017",
    "type": "reading",
    "number": 2,
    "title": "NOIP2017：归并排序与逆序对",
    "description": "归并排序与逆序对\n\n知识点：归并排序、递归、逆序对、时间复杂度\n\n难度：★★★★\n\n训练重点：读懂分治递归与 merge 过程；理解逆序对计数",
    "statement": "### 程序\n\n```cpp\n01 #include <iostream>\n02 using namespace std;\n03 int n, s, a[100005], t[100005], i;\n04 void mergesort(int l, int r)\n05 {\n06     if (l == r)\n07         return;\n08     int mid = (l + r) / 2;\n09     int p = l;\n10     int i = l;\n11     int j = mid + 1;\n12     mergesort(l, mid);\n13     mergesort(mid + 1, r);\n14     while (i <= mid && j <= r)\n15     {\n16         if (a[j] < a[i])\n17         {\n18             s += mid - i + 1;\n19             t[p] = a[j];\n20             p++;\n21             j++;\n22         }\n23         else\n24         {\n25             t[p] = a[i];\n26             p++;\n27             i++;\n28         }\n29     }\n30     while (i <= mid)\n31     {\n32         t[p] = a[i];\n33         p++;\n34         i++;\n35     }\n36     while (j <= r)\n37     {\n38         t[p] = a[j];\n39         p++;\n40         j++;\n41     }\n42     for (i = l; i <= r; i++)\n43         a[i] = t[i];\n44 }\n45 int main()\n46 {\n47     cin >> n;\n48     for (i = 1; i <= n; i++)\n49         cin >> a[i];\n50     mergesort(1, n);\n51     cout << s << endl;\n52     return 0;\n53 }\n```",
    "questions": [
      {
        "id": "noip-2017-reading-2-1",
        "number": 1,
        "text": "如果将第 10 行的 `mid+1` 改成 `mid`，不会影响程序结果和时间复杂度。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "原程序中：\n\n```cpp\nint j = mid + 1;\n```\n\n`j` 必须指向**右半部分的第一个元素**。\n\n若改为：\n\n```cpp\nint j = mid;\n```\n\n则 `a[mid]` 同时出现在“左半部分”和“右半部分”的扫描范围中，左右区间发生重叠，归并和逆序对统计都会被破坏。\n\n所以程序结果会改变。"
      },
      {
        "id": "noip-2017-reading-2-2",
        "number": 2,
        "text": "如果将第 7 行的 `(l+r)/2` 改成 `(l+r+1)/2`，不会影响程序结果和时间复杂度。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "若把：\n\n```cpp\nmid = (l + r) / 2;\n```\n\n改为：\n\n```cpp\nmid = (l + r + 1) / 2;\n```\n\n而递归仍是：\n\n```cpp\nmergesort(l, mid);\nmergesort(mid + 1, r);\n```\n\n当区间长度为 2，例如：\n\n```text\nl=1，r=2\n```\n\n会得到：\n\n```text\nmid=(1+2+1)/2=2\n```\n\n于是第一层递归变为：\n\n```cpp\nmergesort(1, 2);\n```\n\n也就是再次调用自己，区间没有缩小，会无限递归直至栈溢出。\n\n> **勘误提示**：原书答案表把本小题标为 `√`，但按书中所印代码和标准 C++ 执行应为 `×`。"
      },
      {
        "id": "noip-2017-reading-2-3",
        "number": 3,
        "text": "程序输出结果不可能是 0。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "如果原数组已经是单调不降序，例如：\n\n```text\n1 2 3 4\n```\n\n不存在任何 `i<j` 且 `a[i]>a[j]` 的数对，因此逆序对数量：\n\n```text\ns = 0\n```\n\n所以输出完全可能是 0。"
      },
      {
        "id": "noip-2017-reading-2-4",
        "number": 4,
        "text": "该程序的时间复杂度是（ ）。",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "归并排序：\n\n- 递归层数约为 `log n`；\n- 每一层归并总共处理 `n` 个元素。\n\n因此：\n\n```text\nO(n) × O(log n) = O(n log n)\n```\n\n逆序对统计只是在归并过程中顺便完成，并没有增加一个额外的 `O(n)` 嵌套层次。"
      },
      {
        "id": "noip-2017-reading-2-5",
        "number": 5,
        "text": "如果输入：\n```text\n6\n2 6 3 4 5 1\n```\n输出（ ）。",
        "options": {
          "A": "`1`",
          "B": "`2`",
          "C": "`4`",
          "D": "`8`"
        },
        "answers": [
          "D"
        ],
        "multiple": false,
        "score": 3,
        "explanation": "序列：\n\n```text\n2 6 3 4 5 1\n```\n\n逐个统计逆序对：\n\n```text\n2 > 1                      -> 1 个\n6 > 3,4,5,1                -> 4 个\n3 > 1                      -> 1 个\n4 > 1                      -> 1 个\n5 > 1                      -> 1 个\n```\n\n总数：\n\n```text\n1 + 4 + 1 + 1 + 1 = 8\n```\n\n故选 D。"
      },
      {
        "id": "noip-2017-reading-2-6",
        "number": 6,
        "text": "该程序是求输入序列的（ ）。",
        "options": {
          "A": "元素总和",
          "B": "逆序列",
          "C": "逆序对",
          "D": "卷积"
        },
        "answers": [
          "C"
        ],
        "multiple": false,
        "score": 3,
        "explanation": "判断程序功能最重要的语句是：\n\n```cpp\nif (a[j] < a[i])\n    s += mid - i + 1;\n```\n\n它统计的是：\n\n```text\n左边位置在前、数值反而更大\n```\n\n的数对，正是逆序对定义。\n\n#### 本题必须掌握\n\n看到归并排序阅读题，要同时抓住：\n\n1. `[l,mid]` 和 `[mid+1,r]` 两段必须严格分开；\n2. 两段已经分别有序；\n3. `a[j] < a[i]` 时可以“一次统计一批逆序对”；\n4. 时间复杂度仍为 `O(n log n)`。\n\n\n---"
      }
    ],
    "tags": [
      "归并排序",
      "递归",
      "逆序对",
      "时间复杂度"
    ],
    "sourceLabel": "NOIP2017（黄金20题）"
  },
  {
    "id": "noip-2014-reading-3",
    "year": "NOIP",
    "sourceYear": "2014",
    "source": "NOIP2014",
    "type": "reading",
    "number": 3,
    "title": "NOIP2014：递归数列",
    "description": "递归数列\n\n知识点：递归、递推关系、递归复杂度、边界条件\n\n难度：★★★★\n\n训练重点：从递归代码提取递推式；分析缺失递归边界的后果",
    "statement": "### 程序\n\n```cpp\n01 #include <iostream>\n02 using namespace std;\n03 int fun(int n)\n04 {\n05     if (n == 1) return 1;\n06     if (n == 2) return 2;\n07     return fun(n - 2) - fun(n - 1);\n08 }\n09 int main()\n10 {\n11     int n;\n12     cin >> n;\n13     cout << fun(n) << endl;\n14     return 0;\n15 }\n```",
    "questions": [
      {
        "id": "noip-2014-reading-3-1",
        "number": 1,
        "text": "输入 `114514` 时，在普通计算机上程序运行时间不会超过 1s。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "`fun(n)` 会同时递归计算：\n\n```cpp\nfun(n-2)\nfun(n-1)\n```\n\n并且大量子问题被重复计算。\n\n例如 `fun(7)` 会多次计算 `fun(5)`、`fun(4)` 等。\n\n当输入达到 `114514` 时，递归调用数量呈指数级增长，远远不可能在 1 秒内结束。"
      },
      {
        "id": "noip-2014-reading-3-2",
        "number": 2,
        "text": "输入 `0` 程序不会出现运行错误。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "程序只给出了：\n\n```cpp\nn==1\nn==2\n```\n\n两个出口。\n\n输入 `0` 时：\n\n```text\nfun(0)\n -> fun(-2) - fun(-1)\n```\n\n之后参数会继续变小，永远不可能到达 `1` 或 `2`，最终发生栈溢出。\n\n这说明读递归程序时第一件事就是检查：\n\n> **递归参数是否一定会向边界靠近？**"
      },
      {
        "id": "noip-2014-reading-3-3",
        "number": 3,
        "text": "该程序开启 O2 不会出现错误。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "对正常合法输入而言，打开 `-O2` 只是编译器优化，不会改变程序所定义的递推关系。\n\n需要注意：优化并不会把这个指数级递归自动变成动态规划，时间复杂度仍然很高。"
      },
      {
        "id": "noip-2014-reading-3-4",
        "number": 4,
        "text": "输入 `6`，输出 `7`。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "根据上面的递推：\n\n```text\nf(3)=-1\nf(4)=3\nf(5)=-4\nf(6)=7\n```\n\n所以输入 6 输出 7。"
      },
      {
        "id": "noip-2014-reading-3-5",
        "number": 5,
        "text": "时间复杂度为（ ）。",
        "options": {
          "A": "`O(2^n)`",
          "B": "`O(n^n)`",
          "C": "`O(n^(log n))`",
          "D": "`O(n)`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 3,
        "explanation": "可以粗略写出：\n\n```text\nT(n)=T(n-1)+T(n-2)+O(1)\n```\n\n其增长速度类似斐波那契数列，是指数级。\n\n在选择题中通常记为：\n\n```text\nO(2^n)\n```\n\n虽然这是一个较宽松的上界，但足以判断它不是线性、平方或多项式级。"
      },
      {
        "id": "noip-2014-reading-3-6",
        "number": 6,
        "text": "输入 `7` 时输出（ ）。",
        "options": {
          "A": "`-11`",
          "B": "`11`",
          "C": "`-10`",
          "D": "`10`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 3,
        "explanation": "继续递推：\n\n```text\nf(5)=-4\nf(6)=7\nf(7)=f(5)-f(6)\n    =-4-7\n    =-11\n```\n\n故选 A。\n\n#### 本题必须掌握\n\n递归阅读题建议先做一张小表，而不是直接画很大的递归树：\n\n```text\nn      1   2   3   4   5   6   7\nf(n)   1   2  -1   3  -4   7  -11\n```\n\n小输入求值用递推表最快；复杂度分析再看递归树。\n\n\n---"
      }
    ],
    "tags": [
      "递归",
      "递推关系",
      "递归复杂度",
      "边界条件"
    ],
    "sourceLabel": "NOIP2014（黄金20题）"
  },
  {
    "id": "noip-2013-reading-4",
    "year": "NOIP",
    "sourceYear": "2013",
    "source": "NOIP2013",
    "type": "reading",
    "number": 4,
    "title": "NOIP2013：Flood Fill / 最大连通块",
    "description": "Flood Fill / 最大连通块\n\n知识点：DFS、Flood Fill、二维数组、访问标记、连通块\n\n难度：★★★★\n\n训练重点：递归搜索边界；“访问即标记”；复杂度分析",
    "statement": "### 程序\n\n```cpp\n01 #include <cstring>\n02 #include <iostream>\n03 using namespace std;\n04 const int SIZE = 100;\n05 int n, m, p, a[SIZE][SIZE], cnt;\n06 void colour(int x, int y)\n07 {\n08     cnt++;\n09     a[x][y] = 1;\n10     if ((x > 1) && (a[x - 1][y] == 0)) colour(x - 1, y);\n11     if ((y > 1) && (a[x][y - 1] == 0)) colour(x, y - 1);\n12     if ((x < n) && (a[x + 1][y] == 0)) colour(x + 1, y);\n13     if ((y < m) && (a[x][y + 1] == 0)) colour(x, y + 1);\n14 }\n15 int main()\n16 {\n17     int i, j, x, y, ans;\n18     memset(a, 0, sizeof(a));\n19     cin >> n >> m >> p;\n20     for (i = 1; i <= p; i++)\n21     {\n22         cin >> x >> y;\n23         a[x][y] = 1;\n24     }\n25     ans = 0;\n26     for (i = 1; i <= n; i++)\n27         for (j = 1; j <= m; j++)\n28             if (a[i][j] == 0)\n29             {\n30                 cnt = 0;\n31                 colour(i, j);\n32                 if (ans < cnt) ans = cnt;\n33             }\n34     cout << ans << endl;\n35     return 0;\n36 }\n```",
    "questions": [
      {
        "id": "noip-2013-reading-4-1",
        "number": 1,
        "text": "由于没有赋初值，该程序会运行错误。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "`a` 是全局数组，而且程序又执行：\n\n```cpp\nmemset(a, 0, sizeof(a));\n```\n\n因此搜索开始前所有位置都明确初始化为 0。\n\n不会因为“没有初值”出错。"
      },
      {
        "id": "noip-2013-reading-4-2",
        "number": 2,
        "text": "如果将第 18 行去掉，程序结果会发生改变。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "原程序中把障碍位置设为：\n\n```cpp\na[x][y] = 1;\n```\n\n这一步是必要的。如果题目所指删除的是其他不影响状态的语句，需要结合原书行号判断；按原题答案，删除对应行并不会改变最终连通块统计。\n\n阅读此类题不能只看行号，最好定位到**该行承担的功能**再判断。"
      },
      {
        "id": "noip-2013-reading-4-3",
        "number": 3,
        "text": "如果将第 30 行的 `ans<cnt` 改成 `ans<=cnt`，输出结果会发生改变。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "原代码：\n\n```cpp\nif (ans < cnt) ans = cnt;\n```\n\n改为：\n\n```cpp\nif (ans <= cnt) ans = cnt;\n```\n\n当 `ans==cnt` 时，只是再次把相同的 `cnt` 赋给 `ans`。\n\n因此最终值不变。"
      },
      {
        "id": "noip-2013-reading-4-4",
        "number": 4,
        "text": "该程序有可能输出 `114514`。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "数组规模是：\n\n```cpp\nSIZE = 100\n```\n\n可访问网格总数有明确上界，不可能出现十几万规模的连通块。\n\n因此 `114514` 不可能成为连通块大小。"
      },
      {
        "id": "noip-2013-reading-4-5",
        "number": 5,
        "text": "若输入为：\n```text\n6 5 9\n1 4\n2 3\n2 4\n3 2\n4 1\n4 3\n4 5\n5 4\n6 4\n```\n则输出结果是（ ）。",
        "options": {
          "A": "`114514`",
          "B": "`1919810`",
          "C": "`7`",
          "D": "`8`"
        },
        "answers": [
          "C"
        ],
        "multiple": false,
        "score": 3,
        "explanation": "把题目给出的障碍点标出来，然后对剩余 `0` 做四方向连通搜索，可以发现最大连通块大小为 7。\n\n这类题考试时不建议真正递归展开每一个函数栈，而应：\n\n1. 先在小网格上标记障碍；\n2. 按四连通关系圈出连通块；\n3. 数每块格子数。"
      },
      {
        "id": "noip-2013-reading-4-6",
        "number": 6,
        "text": "该程序的时间复杂度为（ ）。",
        "options": {
          "A": "`O(1)`",
          "B": "`O(n)`",
          "C": "`O(n * m)`",
          "D": "`O(2^n)`"
        },
        "answers": [
          "C"
        ],
        "multiple": false,
        "score": 3,
        "explanation": "虽然主程序是二重循环，并且里面又调用 DFS，但不要误判成更高复杂度。\n\n原因是：\n\n```cpp\na[x][y] = 1;\n```\n\n一个格子一旦被 DFS 访问，就不会再次进入另一个 DFS。\n\n所以整个运行过程中，每个格子只会被正式搜索一次：\n\n```text\nO(n*m)\n```\n\n#### 本题必须掌握\n\nFlood Fill 的复杂度分析核心：\n\n> 外层看似“每个点都可能 DFS”，但访问标记保证所有 DFS 加起来总共只访问 `n*m` 个点。\n\n\n---"
      }
    ],
    "tags": [
      "DFS",
      "Flood Fill",
      "二维数组",
      "访问标记",
      "连通块"
    ],
    "sourceLabel": "NOIP2013（黄金20题）"
  },
  {
    "id": "noip-2013-reading-5",
    "year": "NOIP",
    "sourceYear": "2013",
    "source": "NOIP2013",
    "type": "reading",
    "number": 5,
    "title": "NOIP2013：最长上升子序列（LIS）",
    "description": "最长上升子序列（LIS）\n\n知识点：动态规划、LIS、状态定义、二重循环\n\n难度：★★★★\n\n训练重点：理解 `num[i]` 的含义；从转移条件判断求的是上升还是下降",
    "statement": "### 程序\n\n```cpp\n01 #include <iostream>\n02 using namespace std;\n03 int main()\n04 {\n05     const int SIZE = 100;\n06     int height[SIZE], num[SIZE], n, ans;\n07     cin >> n;\n08     for (int i = 0; i < n; i++)\n09     {\n10         cin >> height[i];\n11         num[i] = 1;\n12         for (int j = 0; j < i; j++)\n13         {\n14             if ((height[j] < height[i]) && (num[j] >= num[i]))\n15                 num[i] = num[j] + 1;\n16         }\n17     }\n18     ans = 0;\n19     for (int i = 0; i < n; i++)\n20     {\n21         if (num[i] > ans) ans = num[i];\n22     }\n23     cout << ans << endl;\n24 }\n```",
    "questions": [
      {
        "id": "noip-2013-reading-5-1",
        "number": 1,
        "text": "将第 4 行的程序移动到第 2、3 行中间，程序能够正常运行。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "题目所移动的是一个变量声明，把它从 `main` 内某处移动到更前面，只要仍在合法作用域中，就不会改变程序逻辑。\n\n判断这种题时要分清：\n\n- 改变“声明位置”；\n- 改变“执行顺序”。\n\n只有真正可执行语句的顺序改变才常常影响结果。"
      },
      {
        "id": "noip-2013-reading-5-2",
        "number": 2,
        "text": "第 6 行输入 `n=5`，则输出 `ans` 的值一定小于 5。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "当 `n=5` 时，完全可能输入：\n\n```text\n1 2 3 4 5\n```\n\n最长上升子序列长度就是 5。\n\n因此 `ans` 并不一定小于 5。"
      },
      {
        "id": "noip-2013-reading-5-3",
        "number": 3,
        "text": "把第 01 行的 `iostream` 改为 `cstdio` 时不会编译错误。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "若只把：\n\n```cpp\n#include <iostream>\n```\n\n改成：\n\n```cpp\n#include <cstdio>\n```\n\n但程序仍使用：\n\n```cpp\ncin\ncout\n```\n\n则标准输入输出流的声明不存在，会发生编译错误。"
      },
      {
        "id": "noip-2013-reading-5-4",
        "number": 4,
        "text": "如果输出是 1，则 `height` 数组中的数一定是递减的。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "输出 1 表示不存在长度为 2 的严格上升子序列，即不存在：\n\n```text\nj<i 且 height[j]<height[i]\n```\n\n这只能说明序列是**单调不增**，不一定严格递减。\n\n例如：\n\n```text\n5 5 5\n```\n\nLIS 仍为 1，但它并不是严格递减序列。"
      },
      {
        "id": "noip-2013-reading-5-5",
        "number": 5,
        "text": "当 `n=6` 时，输入 `height` 数组为：\n```text\n2 5 3 11 12 4\n```\n输出为（ ）。",
        "options": {
          "A": "`4`",
          "B": "`2`",
          "C": "`14`",
          "D": "`6`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 3,
        "explanation": "序列：\n\n```text\n2 5 3 11 12 4\n```\n\n可以找到：\n\n```text\n2 5 11 12\n```\n\n或：\n\n```text\n2 3 11 12\n```\n\n长度均为 4。\n\n因此答案为 4。"
      },
      {
        "id": "noip-2013-reading-5-6",
        "number": 6,
        "text": "如果将第 13 行的 `height[j]<height[i]` 改成 `height[j]>height[i]`，则第（5）题的输出结果为（ ）。",
        "options": {
          "A": "`4`",
          "B": "`2`",
          "C": "`14`",
          "D": "`6`"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 3,
        "explanation": "将：\n\n```cpp\nheight[j] < height[i]\n```\n\n改为：\n\n```cpp\nheight[j] > height[i]\n```\n\n程序相当于求**最长严格下降子序列**。\n\n对于：\n\n```text\n2 5 3 11 12 4\n```\n\n可取：\n\n```text\n5 3\n11 4\n12 4\n```\n\n最长长度为 2。\n\n#### 本题必须掌握\n\n看到 LIS 的 `O(n^2)` 代码时，先说清一句：\n\n```text\ndp[i] / num[i] = 以第 i 个元素结尾的最长上升子序列长度\n```\n\n状态含义一旦说对，转移条件就容易理解。\n\n\n---"
      }
    ],
    "tags": [
      "动态规划",
      "LIS",
      "状态定义",
      "二重循环"
    ],
    "sourceLabel": "NOIP2013（黄金20题）"
  },
  {
    "id": "noip-2016-reading-6",
    "year": "NOIP",
    "sourceYear": "2016",
    "source": "NOIP2016",
    "type": "reading",
    "number": 6,
    "title": "NOIP2016：最长回文子序列",
    "description": "最长回文子序列\n\n知识点：递归、区间问题、最长回文子序列、指数级复杂度\n\n难度：★★★★★\n\n训练重点：理解区间 `[i,j]`；区分“回文子串”和“回文子序列”",
    "statement": "### 程序\n\n```cpp\n01 #include <iostream>\n02 using namespace std;\n03 int lps(string seq, int i, int j)\n04 {\n05     int len1, len2;\n06     if (i == j)\n07         return 1;\n08     if (i > j)\n09         return 0;\n10     if (seq[i] == seq[j])\n11         return lps(seq, i + 1, j - 1) + 2;\n12     len1 = lps(seq, i, j - 1);\n13     len2 = lps(seq, i + 1, j);\n14     if (len1 > len2)\n15         return len1;\n16     return len2;\n17 }\n18 int main()\n19 {\n20     string seq;\n21     cin >> seq;\n22     int n = seq.size();\n23     cout << lps(seq, 0, n - 1) << endl;\n24     return 0;\n25 }\n```",
    "questions": [
      {
        "id": "noip-2016-reading-6-1",
        "number": 1,
        "text": "`n` 代表 `seq` 的长度。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "```cpp\nint n = seq.size();\n```\n\n所以 `n` 就是字符串长度。"
      },
      {
        "id": "noip-2016-reading-6-2",
        "number": 2,
        "text": "输入 `acmerandacm`，输出 `5`。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "输入：\n\n```text\nacmerandacm\n```\n\n最长回文子序列长度为 5，所以程序输出 5。\n\n阅读比赛题时，如果手工寻找最长回文子序列较慢，可以按照递归含义缩小区间，而不必列出所有子序列。"
      },
      {
        "id": "noip-2016-reading-6-3",
        "number": 3,
        "text": "第 7～8 行代码删去后程序仍能正常运行。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "如果删掉：\n\n```cpp\nif (i > j)\n    return 0;\n```\n\n当区间长度为 2 且两端字符相同时，例如：\n\n```text\naa\n```\n\n会调用：\n\n```cpp\nlps(seq,1,0)\n```\n\n此时 `i>j`，如果没有这个边界，后续继续访问 `seq[i]`、`seq[j]`，程序逻辑失效，甚至越界。"
      },
      {
        "id": "noip-2016-reading-6-4",
        "number": 4,
        "text": "程序最好情况下的时间复杂度为 `O(n^2)`。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "最好情况是两端字符不断相等，例如：\n\n```text\naaaaaa\n```\n\n每次只递归：\n\n```cpp\nlps(i+1,j-1)\n```\n\n区间每次缩短 2，因此调用次数是线性的：\n\n```text\nO(n)\n```\n\n所以“最好情况 `O(n^2)`”错误。"
      },
      {
        "id": "noip-2016-reading-6-5",
        "number": 5,
        "text": "程序的最坏时间复杂度为（ ）。",
        "options": {
          "A": "`O(n log n)`",
          "B": "`O(n^2)`",
          "C": "`O(n)`",
          "D": "`O(2^n)`"
        },
        "answers": [
          "D"
        ],
        "multiple": false,
        "score": 3,
        "explanation": "最坏情况下，大量状态遇到：\n\n```cpp\nseq[i] != seq[j]\n```\n\n每次都会分裂成两个递归：\n\n```cpp\nlps(i,j-1)\nlps(i+1,j)\n```\n\n而程序没有记忆化，会反复计算同一区间。\n\n因此最坏为指数级，选择项中为：\n\n```text\nO(2^n)\n```"
      },
      {
        "id": "noip-2016-reading-6-6",
        "number": 6,
        "text": "函数 `lps(seq,i,j)` 的用途是（ ）。",
        "options": {
          "A": "求字符串 `seq` 的最长回文子序列长度。",
          "B": "求字符串 `seq` 中区间 `[i,j]` 上的最长回文子串长度。",
          "C": "求字符串 `seq` 中区间 `[i,j]` 上的最长回文子序列长度。",
          "D": "求字符串 `seq` 中区间 `[i,j]` 上的最长相同前缀后缀长度。"
        },
        "answers": [
          "C"
        ],
        "multiple": false,
        "score": 3,
        "explanation": "函数并不是求整个字符串固定答案，而是接收：\n\n```cpp\ni, j\n```\n\n两个边界。\n\n所以更准确的功能是：\n\n> 求 `seq[i..j]` 的最长回文子序列长度。\n\n故选 C。\n\n#### 本题必须掌握\n\n本题特别适合区分：\n\n- **子串**：必须连续；\n- **子序列**：可以跳过字符。\n\n也要看到一个重要优化方向：若增加 `dp[i][j]` 记忆化，就能避免指数级重复递归。\n\n\n---"
      }
    ],
    "tags": [
      "递归",
      "区间问题",
      "最长回文子序列",
      "指数级复杂度"
    ],
    "sourceLabel": "NOIP2016（黄金20题）"
  },
  {
    "id": "noip-2008-reading-7",
    "year": "NOIP",
    "sourceYear": "2008",
    "source": "NOIP2008",
    "type": "reading",
    "number": 7,
    "title": "NOIP2008：由先序、中序求后序遍历",
    "description": "由先序、中序求后序遍历\n\n知识点：二叉树、先序遍历、中序遍历、后序遍历、递归\n\n难度：★★★★\n\n训练重点：通过字符串区间递归重建遍历顺序",
    "statement": "### 程序\n\n```cpp\n01 #include <iostream>\n02 #include <cstring>\n03 using namespace std;\n04 #define MAX 100\n05 void solve(char first[], int spos_f, int epos_f,\n06            char mid[], int spos_m, int epos_m)\n07 {\n08     int i, root_m;\n09     if (spos_f > epos_f)\n10         return;\n11     for (i = spos_m; i <= epos_m; i++)\n12         if (first[spos_f] == mid[i])\n13         {\n14             root_m = i;\n15             break;\n16         }\n17     solve(first, spos_f + 1, spos_f + (root_m - spos_m),\n18           mid, spos_m, root_m - 1);\n19     solve(first, spos_f + (root_m - spos_m) + 1, epos_f,\n20           mid, root_m + 1, epos_m);\n21     cout << first[spos_f];\n22 }\n23 int main()\n24 {\n25     char first[MAX], mid[MAX];\n26     int len;\n27     cin >> len;\n28     cin >> first >> mid;\n29     solve(first, 0, len - 1, mid, 0, len - 1);\n30     cout << endl;\n31     return 0;\n32 }\n```",
    "questions": [
      {
        "id": "noip-2008-reading-7-1",
        "number": 1,
        "text": "将第 25 行移到 22 行和 23 行之间，程序不会出错。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "原来输出根结点在两个递归之后：\n\n```text\n左子树\n右子树\n根\n```\n\n即后序遍历。\n\n如果把输出根移动到两个递归之间，程序本身依然能够正常递归、不会出现编译或运行错误，只是输出顺序会变成：\n\n```text\n左子树\n根\n右子树\n```\n\n即中序形式。\n\n因此按题目“程序不会出错”的表述为正确；但要注意**程序功能会改变**。"
      },
      {
        "id": "noip-2008-reading-7-2",
        "number": 2,
        "text": "将第 09 行和 10 行去掉，程序可以得出相同的结果。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "递归必须有空区间出口：\n\n```cpp\nif (spos_f > epos_f)\n    return;\n```\n\n如果删除，递归到空子树时仍会继续访问数组、继续递归，可能出现越界或无限递归。"
      },
      {
        "id": "noip-2008-reading-7-3",
        "number": 3,
        "text": "该程序的时间复杂度为 `O(n)`。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "每个递归区间中，程序都要：\n\n```cpp\nfor (...)\n    if (first[spos_f] == mid[i])\n```\n\n线性寻找根在中序序列中的位置。\n\n如果树非常偏斜，查找规模可能为：\n\n```text\nn + (n-1) + (n-2) + ...\n```\n\n因此最坏可达：\n\n```text\nO(n^2)\n```\n\n不是 `O(n)`。"
      },
      {
        "id": "noip-2008-reading-7-4",
        "number": 4,
        "text": "将第 25 行的 `char` 改为 `int` 类型，程序可以得到相同的结果。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "这里用字符数组表示结点：\n\n```cpp\nchar first[]\nchar mid[]\n```\n\n如果简单把相关字符类型改成 `int`，输入、比较以及字符串相关处理方式都会发生变化，不能保证程序仍按原方式工作。"
      },
      {
        "id": "noip-2008-reading-7-5",
        "number": 5,
        "text": "输入：\n```text\n7\nABDCEGF\nBDAGECF\n```\n输出为（ ）。",
        "options": {
          "A": "`DBGEFCA`",
          "B": "`DBGFECA`",
          "C": "`GBDEFCA`",
          "D": "`ABCDEFG`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 3,
        "explanation": "先序：\n\n```text\nABDCEGF\n```\n\n中序：\n\n```text\nBDAGECF\n```\n\n按照：\n\n```text\n先序首字符找根\n-> 中序切左右子树\n-> 递归\n```\n\n得到后序：\n\n```text\nDBGEFCA\n```\n\n故选 A。"
      },
      {
        "id": "noip-2008-reading-7-6",
        "number": 6,
        "text": "该程序要解决的问题是（ ）。",
        "options": {
          "A": "给出先序遍历和后序遍历求中序遍历",
          "B": "给出先序遍历和中序遍历求后序遍历",
          "C": "给出中序遍历和后序遍历求前序遍历",
          "D": "给出前序遍历和中序遍历求层序遍历"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 3,
        "explanation": "因为：\n\n- 输入的是先序 `first`；\n- 输入的是中序 `mid`；\n- 根最后输出。\n\n所以功能是：\n\n> 给出先序遍历和中序遍历，求后序遍历。\n\n#### 本题必须掌握\n\n树遍历重建题建议牢牢记住：\n\n```text\n先序：根 左 右\n中序：左 根 右\n后序：左 右 根\n```\n\n先序负责“找到根”，中序负责“划分左右子树”。\n\n\n---"
      }
    ],
    "tags": [
      "二叉树",
      "先序遍历",
      "中序遍历",
      "后序遍历",
      "递归"
    ],
    "sourceLabel": "NOIP2008（黄金20题）"
  },
  {
    "id": "noip-2018-reading-8",
    "year": "NOIP",
    "sourceYear": "2018",
    "source": "NOIP2018",
    "type": "reading",
    "number": 8,
    "title": "NOIP2018：置换环与访问标记",
    "description": "置换环与访问标记\n\n知识点：置换、环、访问标记、数组下标\n\n难度：★★★★\n\n训练重点：从 `j=d[j]` 理解状态转移；识别环的个数",
    "statement": "### 程序\n\n```cpp\n01 #include <cstdio>\n02 int n, d[100];\n03 bool v[100];\n04 int main()\n05 {\n06     scanf(\"%d\", &n);\n07     for (int i = 0; i < n; ++i)\n08     {\n09         scanf(\"%d\", d + i);\n10         v[i] = false;\n11     }\n12     int cnt = 0;\n13     for (int i = 0; i < n; ++i)\n14     {\n15         if (!v[i])\n16         {\n17             for (int j = i; !v[j]; j = d[j])\n18             {\n19                 v[j] = true;\n20             }\n21             ++cnt;\n22         }\n23     }\n24     printf(\"%d\\n\", cnt);\n25     return 0;\n26 }\n```",
    "questions": [
      {
        "id": "noip-2018-reading-8-1",
        "number": 1,
        "text": "将第 7 行的 `d+i` 换成 `&d[i]`，程序运行不受影响。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "```cpp\nd + i\n```\n\n是指向 `d[i]` 的指针，与：\n\n```cpp\n&d[i]\n```\n\n完全等价。\n\n所以：\n\n```cpp\nscanf(\"%d\", d+i);\n```\n\n和：\n\n```cpp\nscanf(\"%d\", &d[i]);\n```\n\n作用相同。"
      },
      {
        "id": "noip-2018-reading-8-2",
        "number": 2,
        "text": "第 12 行的 `!v[i]` 与 `v[i]==false` 语句意思一致。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "对布尔变量：\n\n```cpp\n!v[i]\n```\n\n等价于：\n\n```cpp\nv[i] == false\n```\n\n都是判断该位置尚未访问。"
      },
      {
        "id": "noip-2018-reading-8-3",
        "number": 3,
        "text": "程序的输出结果 `cnt` 至少等于 1。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "如果：\n\n```text\nn=0\n```\n\n外层：\n\n```cpp\nfor (int i=0; i<n; ++i)\n```\n\n一次也不执行，`cnt` 保持 0。\n\n因此不能笼统说输出至少为 1。"
      },
      {
        "id": "noip-2018-reading-8-4",
        "number": 4,
        "text": "若输入的数组 `d` 中有重复的数字，则程序会进入死循环。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "即使 `d` 中有重复数字，只要映射值仍落在数组有效范围，某条路径最终也会进入一个已经访问过的结点。\n\n循环条件：\n\n```cpp\n!v[j]\n```\n\n一旦遇到访问过的位置就会退出，并不必然死循环。"
      },
      {
        "id": "noip-2018-reading-8-5",
        "number": 5,
        "text": "若输入数字为：\n```text\n5 1 2 3 4 5\n```\n则输出为（ ）。",
        "options": {
          "A": "`0`",
          "B": "`1`",
          "C": "`2`",
          "D": "`5`"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 3,
        "explanation": "按当前代码的全局数组初始化规则，沿：\n\n```text\n0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 0\n```\n\n会在一次遍历中把相关位置标记，最终只启动一次新的连通遍历，所以 `cnt=1`。"
      },
      {
        "id": "noip-2018-reading-8-6",
        "number": 6,
        "text": "若输入数字为：\n```text\n10 7 1 4 3 2 5 9 8 0 6\n```\n则输出为（ ）。",
        "options": {
          "A": "`3`",
          "B": "`6`",
          "C": "`7`",
          "D": "`8`"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 3,
        "explanation": "按映射不断追踪并做访问标记，每找到一个尚未访问的新起点就让 `cnt++`。逐个追踪题目给出的映射后，共得到 6 个独立环/部分，所以选 B。\n\n#### 本题必须掌握\n\n看到：\n\n```cpp\nfor (j=i; !vis[j]; j=next[j])\n```\n\n要马上联想到：\n\n- 函数映射；\n- 环；\n- 访问标记；\n- 每个点最多访问一次。\n\n\n---"
      }
    ],
    "tags": [
      "置换",
      "环",
      "访问标记",
      "数组下标"
    ],
    "sourceLabel": "NOIP2018（黄金20题）"
  },
  {
    "id": "noip-2009-reading-9",
    "year": "NOIP",
    "sourceYear": "2009",
    "source": "NOIP2009",
    "type": "reading",
    "number": 9,
    "title": "NOIP2009：欧几里得算法（GCD）",
    "description": "欧几里得算法（GCD）\n\n知识点：最大公约数、辗转相除、递归、对数复杂度\n\n难度：★★★\n\n训练重点：递归参数变化；识别欧几里得算法",
    "statement": "### 程序\n\n```cpp\n01 #include <iostream>\n02 using namespace std;\n03 int a, b;\n04 int work(int a, int b)\n05 {\n06     if (a % b) return work(b, a % b);\n07     return b;\n08 }\n09 int main()\n10 {\n11     cin >> a >> b;\n12     cout << work(a, b) << endl;\n13     return 0;\n14 }\n```",
    "questions": [
      {
        "id": "noip-2009-reading-9-1",
        "number": 1,
        "text": "在第 2 行下面添加 `#define int long long`，程序可以正常运行。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "如果直接在代码前加入：\n\n```cpp\n#define int long long\n```\n\n那么：\n\n```cpp\nint main()\n```\n\n会被宏替换为：\n\n```cpp\nlong long main()\n```\n\n而标准 C++ 要求 `main` 返回类型为 `int`，因此可能编译失败。\n\n这也是为什么竞赛中即便有人使用：\n\n```cpp\n#define int long long\n```\n\n也常写：\n\n```cpp\nsigned main()\n```\n\n来规避宏替换。"
      },
      {
        "id": "noip-2009-reading-9-2",
        "number": 2,
        "text": "将第 3 行的 `int` 改成 `double`，结果不会改变。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "如果只是把外部输入变量 `a,b` 改为 `double`，而：\n\n```cpp\nint work(int a, int b)\n```\n\n的形参仍然是 `int`，调用时会发生整数转换。\n\n对于题目通常给出的整数输入，进入 `work` 后仍按整数求 gcd，结果不变。"
      },
      {
        "id": "noip-2009-reading-9-3",
        "number": 3,
        "text": "不能输入 `0 0`。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "当前代码中：\n\n```cpp\nif (a % b)\n```\n\n会先计算 `a%b`。\n\n若输入：\n\n```text\n0 0\n```\n\n则发生：\n\n```text\n0 % 0\n```\n\n整数对 0 取模是未定义行为，通常会产生运行错误。\n\n因此“不能输入 0 0”应判正确。\n\n> **勘误提示**：原书答案表将本题判为 `×`，并写“可以输入 0 0”，这与标准 C++ 的整数取模规则不符。本版按实际代码修正为 `√`。"
      },
      {
        "id": "noip-2009-reading-9-4",
        "number": 4,
        "text": "输入 `20 12`，结果输出 `4`。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "```text\ngcd(20,12)\n= gcd(12,8)\n= gcd(8,4)\n= 4\n```\n\n所以输出 4。"
      },
      {
        "id": "noip-2009-reading-9-5",
        "number": 5,
        "text": "输入 `2012 13`，输出（ ）。",
        "options": {
          "A": "`2012`",
          "B": "`2013`",
          "C": "`13`",
          "D": "`1`"
        },
        "answers": [
          "D"
        ],
        "multiple": false,
        "score": 3,
        "explanation": "```text\n2012 ÷ 13\n```\n\n不能整除，而且 13 是质数。\n\n2012 与 13 的最大公约数为 1，因此选 D。"
      },
      {
        "id": "noip-2009-reading-9-6",
        "number": 6,
        "text": "该算法的时间复杂度级别为（ ）。",
        "options": {
          "A": "线性时间",
          "B": "对数时间",
          "C": "平方时间",
          "D": "常数时间"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 3,
        "explanation": "欧几里得算法每次通过取模让第二个参数快速减小。\n\n其经典复杂度为：\n\n```text\nO(log min(a,b))\n```\n\n在选项的复杂度“级别”中属于对数时间。\n\n#### 本题必须掌握\n\n两点非常容易考：\n\n1. `gcd(a,b)=gcd(b,a%b)`；\n2. `%` 的除数不能为 0。\n\n不要只会背 gcd 模板，而忽略边界输入。\n\n\n---"
      }
    ],
    "tags": [
      "最大公约数",
      "辗转相除",
      "递归",
      "对数复杂度"
    ],
    "sourceLabel": "NOIP2009（黄金20题）"
  },
  {
    "id": "noip-2013-reading-10",
    "year": "NOIP",
    "sourceYear": "2013",
    "source": "NOIP2013",
    "type": "reading",
    "number": 10,
    "title": "NOIP2013：排序 + 二分查找",
    "description": "排序 + 二分查找\n\n知识点：排序、二分查找、左闭右开、闭区间边界、lower_bound 思想\n\n难度：★★★★\n\n训练重点：跟踪排序结果；理解“寻找第一个大于等于 f 的位置”",
    "statement": "### 程序\n\n```cpp\n01 #include <iostream>\n02 using namespace std;\n03 int main()\n04 {\n05     const int SIZE = 100;\n06     int n, f, i, j, t, left, right, middle, a[SIZE];\n07     cin >> n >> f;\n08     for (i = 1; i <= n; i++)\n09         cin >> a[i];\n10     for (i = 1; i <= n; i++)\n11         for (j = 1; j <= i; j++)\n12             if (a[i] >= a[j])\n13             {\n14                 t = a[j];\n15                 a[j] = a[i];\n16                 a[i] = t;\n17             }\n18     left = 1;\n19     right = n;\n20     do\n21     {\n22         middle = (left + right) / 2;\n23         if (f <= a[middle])\n24             right = middle;\n25         else\n26             left = middle + 1;\n27     } while (left < right);\n28     cout << left << endl;\n29     return 0;\n30 }\n```",
    "questions": [
      {
        "id": "noip-2013-reading-10-1",
        "number": 1,
        "text": "将第 04 行的程序移动到 02、03 行的中间，程序能够正常运行。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "```cpp\nconst int SIZE = 100;\n```\n\n只是常量定义。\n\n把它从 `main` 内移动到全局作用域，只要仍在使用数组定义之前，就不会影响程序正常运行。"
      },
      {
        "id": "noip-2013-reading-10-2",
        "number": 2,
        "text": "将第 11 行的 `=` 删除，运行结果会改变。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "把：\n\n```cpp\na[i] >= a[j]\n```\n\n改为：\n\n```cpp\na[i] > a[j]\n```\n\n只会减少“两个值相等时的无意义交换”。\n\n相等元素交换前后数值完全相同，所以最终数值序列不变。\n\n因此“结果会改变”错误。"
      },
      {
        "id": "noip-2013-reading-10-3",
        "number": 3,
        "text": "将第 07 行的 `i=1;i<=n;` 改为 `i=0;i<n;`，运行结果不会改变。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "输入原本写入：\n\n```cpp\na[1] ... a[n]\n```\n\n如果改成：\n\n```cpp\na[0] ... a[n-1]\n```\n\n但后面的排序和二分仍按 `1...n` 访问，就会：\n\n- 忽略 `a[0]`；\n- 使用没有正确输入的 `a[n]`。\n\n因此结果当然可能改变，甚至产生未定义行为。"
      },
      {
        "id": "noip-2013-reading-10-4",
        "number": 4,
        "text": "若第 08 行输入 `n` 个相同的数字，程序最后输出的 `left` 值为 1。（ ）",
        "options": {
          "A": "正确",
          "B": "错误"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 1.5,
        "explanation": "若参与比较的所有元素都相同，并且 `f` 与该值满足二分条件，则：\n\n```cpp\nf <= a[middle]\n```\n\n一直成立，`right` 不断向左缩，最终：\n\n```text\nleft=right=1\n```\n\n所以输出 1。"
      },
      {
        "id": "noip-2013-reading-10-5",
        "number": 5,
        "text": "当 `n=5, f=7, a={8,4,7,5,6}` 时，则结果为（ ）。",
        "options": {
          "A": "`3`",
          "B": "`4`",
          "C": "`5`",
          "D": "`7`"
        },
        "answers": [
          "C"
        ],
        "multiple": false,
        "score": 3,
        "explanation": "输入：\n\n```text\n8 4 7 5 6\n```\n\n按当前比较条件：\n\n```cpp\nif (a[i] >= a[j])\n```\n\n排序后实际得到：\n\n```text\n8 7 6 5 4\n```\n\n然后二分：\n\n```text\nleft=1,right=5\nmid=3,a[3]=6\n7<=6 为假 -> left=4\n\nmid=4,a[4]=5\n7<=5 为假 -> left=5\n```\n\n最终输出：\n\n```text\n5\n```\n\n所以应选 C。\n\n> **勘误提示**：原书答案把第（5）题标为 B，并解释为“程序升序排序”，但与书中打印的 `>=` 比较条件矛盾。本版按代码实际执行修正为 C。"
      },
      {
        "id": "noip-2013-reading-10-6",
        "number": 6,
        "text": "输入仍是第（5）题的条件，将第 11 行的 `>=` 改为 `<=`，则结果为（ ）。",
        "options": {
          "A": "`3`",
          "B": "`4`",
          "C": "`5`",
          "D": "`7`"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 3,
        "explanation": "若将：\n\n```cpp\n>=\n```\n\n改为：\n\n```cpp\n<=\n```\n\n这一次数组会排成升序：\n\n```text\n4 5 6 7 8\n```\n\n二分过程：\n\n```text\nmid=3,a[3]=6\n7<=6 假 -> left=4\n\nleft=right=4\n```\n\n最终输出 4，所以选 B。\n\n> 原书答案表将本小题标为 C；同样属于上述排序方向矛盾，本版按代码修正。\n\n#### 本题必须掌握\n\n这是非常典型的“不要相信注释和套路，要相信代码”的阅读题。\n\n建议学生养成习惯：\n\n> 看到陌生排序代码，拿 `3 1 2` 这种极小样例亲手跑一遍，先确认到底是升序还是降序，再分析二分。\n\n\n---\n\n# 第二部分：完善程序\n\n---"
      }
    ],
    "tags": [
      "排序",
      "二分查找",
      "左闭右开",
      "闭区间边界",
      "lower_bound 思想"
    ],
    "sourceLabel": "NOIP2013（黄金20题）"
  },
  {
    "id": "noip-2008-completion-11",
    "year": "NOIP",
    "sourceYear": "2008",
    "source": "NOIP2008",
    "type": "completion",
    "number": 11,
    "title": "NOIP2008：矩阵中的数字",
    "description": "矩阵中的数字\n\n知识点：二维数组、单调矩阵、指针式移动、查找\n\n难度：★★★★\n\n训练重点：利用行列单调性减少搜索范围",
    "statement": "### 题目\n\n有一个 `n*n`（`1≤n≤5000`）的矩阵 `a`，满足：\n\n- 对于 `1≤i<n, 1≤j≤n`，`a[i][j] < a[i+1][j]`；\n- `a[j][i] < a[j][i+1]`。\n\n即矩阵中左右相邻的两个元素，右边的一定比左边的大；上下相邻的两个元素，下面的一定比上面的大。\n\n给定矩阵 `a` 中的一个数字 `k`，找出 `k` 所在的行列。输入数据保证矩阵中的数字不相同。\n\n### 程序\n\n```cpp\n01 #include <iostream>\n02 using namespace std;\n03 int n, k, answerx, answery;\n04 int a[5001][5001];\n05 void FindKPosition()\n06 {\n07     int i = n, j = n;\n08     while (j > 0)\n09     {\n10         if (a[n][j] < k) break;\n11         j--;\n12     }\n13     ______①______;\n14     while (a[i][j] != k)\n15     {\n16         while (______②______ && i > 1) i--;\n17         while (______③______ && j <= n) j++;\n18     }\n19     ______④______;\n20     ______⑤______;\n21 }\n22 int main()\n23 {\n24     int i, j;\n25     cin >> n;\n26     for (i = 1; i <= n; i++)\n27         for (j = 1; j <= n; j++)\n28             cin >> a[i][j];\n29     cin >> k;\n30     FindKPosition();\n31     cout << answerx << \" \" << answery << endl;\n32     return 0;\n33 }\n```",
    "questions": [
      {
        "id": "noip-2008-completion-11-1",
        "number": 1,
        "text": "①处应填（ ）。",
        "options": {
          "A": "`j--`",
          "B": "`j++`",
          "C": "`i++`",
          "D": "`i--`"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "最开始：\n\n```cpp\nj=n;\nwhile (j>0)\n{\n    if (a[n][j] < k) break;\n    j--;\n}\n```\n\n循环结束时，`j` 停在最后一个：\n\n```text\na[n][j] < k\n```\n\n的位置。\n\n真正有可能等于 `k` 的列应当是右边一列，因此要：\n\n```cpp\nj++;\n```\n\n故选 B。"
      },
      {
        "id": "noip-2008-completion-11-2",
        "number": 2,
        "text": "②处应填（ ）。",
        "options": {
          "A": "`a[i][j]>k`",
          "B": "`a[i][j]<k`",
          "C": "`a[i][j]<=k`",
          "D": "`a[i][j]!=k`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "当前元素比 `k` 大时，由于同一列向下递增：\n\n```text\n上面的数更小\n```\n\n所以应该：\n\n```cpp\ni--;\n```\n\n向上移动。\n\n条件应为：\n\n```cpp\na[i][j] > k\n```"
      },
      {
        "id": "noip-2008-completion-11-3",
        "number": 3,
        "text": "③处应填（ ）。",
        "options": {
          "A": "`a[i][j]>k`",
          "B": "`a[i][j]<k`",
          "C": "`a[i][j]>=k`",
          "D": "`a[i][j]!=k`"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "当前元素比 `k` 小时，由于同一行向右递增：\n\n```text\n右边的数更大\n```\n\n因此应该：\n\n```cpp\nj++;\n```\n\n条件为：\n\n```cpp\na[i][j] < k\n```"
      },
      {
        "id": "noip-2008-completion-11-4",
        "number": 4,
        "text": "④处应填（ ）。",
        "options": {
          "A": "`answerx=i+1`",
          "B": "`answerx=i-1`",
          "C": "`answerx=j`",
          "D": "`answerx=i`"
        },
        "answers": [
          "D"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "循环：\n\n```cpp\nwhile (a[i][j] != k)\n```\n\n结束时已经满足：\n\n```text\na[i][j] == k\n```\n\n所以行坐标就是当前 `i`：\n\n```cpp\nanswerx=i;\n```"
      },
      {
        "id": "noip-2008-completion-11-5",
        "number": 5,
        "text": "⑤处应填（ ）。",
        "options": {
          "A": "`answery=j+1`",
          "B": "`answery=j-1`",
          "C": "`answery=i`",
          "D": "`answery=j`"
        },
        "answers": [
          "D"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "同理，列坐标就是当前 `j`：\n\n```cpp\nanswery=j;\n```\n\n#### 本题必须掌握\n\n单调矩阵查找常用口诀：\n\n```text\n太大：往能变小的方向走\n太小：往能变大的方向走\n```\n\n先判断每个方向数值如何变化，再决定指针移动。\n\n\n---"
      }
    ],
    "tags": [
      "二维数组",
      "单调矩阵",
      "指针式移动",
      "查找"
    ],
    "sourceLabel": "NOIP2008（黄金20题）"
  },
  {
    "id": "noip-2016-completion-12",
    "year": "NOIP",
    "sourceYear": "2016",
    "source": "NOIP2016",
    "type": "completion",
    "number": 12,
    "title": "NOIP2016：读入整数",
    "description": "读入整数\n\n知识点：字符输入、ASCII、整数构造、负数处理\n\n难度：★★★★\n\n训练重点：从字符流中提取整数；字符转数字",
    "statement": "### 题目\n\n请完善下面的程序，使得程序能够读入两个 `int` 范围内的整数，并将这两个整数分别输出，每行一个。\n\n输入的整数之间和前后只会出现空格或者回车，输入数据保证合法。\n\n例如：\n\n```text\n01 输入\n02 123\n03 -789\n04 输出\n05 123\n06 -789\n```\n\n### 程序\n\n```cpp\n01 #include <iostream>\n02 using namespace std;\n03 int readint()\n04 {\n05     int num = 0;       // 存储读取到的整数\n06     int negative = 0;  // 负数标识\n07     char c;            // 存储当前读取到的字符\n08     c = cin.get();\n09     while ((c < '0' || c > '9') && c != '-')\n10         c = ______①______;\n11     if (c == '-')\n12         negative = 1;\n13     else\n14         ______②______;\n15     c = cin.get();\n16     while (______③______)\n17     {\n18         ______④______;\n19         c = cin.get();\n20     }\n21     if (negative == 1)\n22         ______⑤______;\n23     return num;\n24 }\n25 int main()\n26 {\n27     int a, b;\n28     a = readint();\n29     b = readint();\n30     cout << a << endl << b << endl;\n31     return 0;\n32 }\n```",
    "questions": [
      {
        "id": "noip-2016-completion-12-1",
        "number": 1,
        "text": "①处应填（ ）。",
        "options": {
          "A": "`c='0'`",
          "B": "`'0'`",
          "C": "`c+'0'`",
          "D": "`cin.get()`"
        },
        "answers": [
          "D"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "当前字符不是数字也不是 `'-'` 时，需要继续读取下一个字符：\n\n```cpp\nc = cin.get();\n```\n\n因此空格、换行等都会被不断跳过。"
      },
      {
        "id": "noip-2016-completion-12-2",
        "number": 2,
        "text": "②处应填（ ）。",
        "options": {
          "A": "`num=0`",
          "B": "`num=c-'0'`",
          "C": "`num=c-'a'`",
          "D": "`num=c`"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "若第一个有效字符不是负号，就说明它已经是第一位数字。\n\n字符：\n\n```text\n'7'\n```\n\n对应整数值要通过：\n\n```cpp\n'7' - '0'\n```\n\n得到 `7`。\n\n所以：\n\n```cpp\nnum = c - '0';\n```"
      },
      {
        "id": "noip-2016-completion-12-3",
        "number": 3,
        "text": "③处应填（ ）。",
        "options": {
          "A": "`c>='0'&&c<='9'`",
          "B": "`c>='a'&&c<='z'`",
          "C": "`c<'0'||c>'9'`",
          "D": "`c!='-'`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "后面的循环要继续读取连续的数字字符，所以条件必须是：\n\n```cpp\nc >= '0' && c <= '9'\n```\n\n一旦遇到空格或换行，数字结束。"
      },
      {
        "id": "noip-2016-completion-12-4",
        "number": 4,
        "text": "④处应填（ ）。",
        "options": {
          "A": "`num=num+c-'0'`",
          "B": "`num=num*10+c-'0'`",
          "C": "`num=num+c`",
          "D": "`num=num*10+c`"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "十进制拼接的标准公式：\n\n```text\n新数 = 原数 × 10 + 新的一位\n```\n\n例如已经读到：\n\n```text\n12\n```\n\n再读 `'3'`：\n\n```text\n12*10 + 3 = 123\n```\n\n所以应写：\n\n```cpp\nnum = num * 10 + c - '0';\n```"
      },
      {
        "id": "noip-2016-completion-12-5",
        "number": 5,
        "text": "⑤处应填（ ）。",
        "options": {
          "A": "`num=-num`",
          "B": "`num=num+num`",
          "C": "`num--`",
          "D": "`num++`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "若之前检测到：\n\n```cpp\nnegative=1;\n```\n\n说明原数有负号。\n\n数值部分读取完后只需：\n\n```cpp\nnum=-num;\n```\n\n#### 本题必须掌握\n\n字符转数字：\n\n```cpp\ndigit = c - '0';\n```\n\n多位十进制数累积：\n\n```cpp\nnum = num * 10 + digit;\n```\n\n这是 CSP-J 阅读/完善程序中非常常见的基本模型。\n\n\n---"
      }
    ],
    "tags": [
      "字符输入",
      "ASCII",
      "整数构造",
      "负数处理"
    ],
    "sourceLabel": "NOIP2016（黄金20题）"
  },
  {
    "id": "noip-2011-completion-13",
    "year": "NOIP",
    "sourceYear": "2011",
    "source": "NOIP2011",
    "type": "completion",
    "number": 13,
    "title": "NOIP2011：子矩阵",
    "description": "子矩阵\n\n知识点：二维数组、暴力枚举、子矩阵匹配、多重循环\n\n难度：★★★★\n\n训练重点：正确确定枚举起点和子矩阵边界",
    "statement": "### 题目\n\n输入一个 `n1*m1` 的矩阵 `a` 和一个 `n2*m2` 的矩阵 `b`，问 `a` 中是否存在子矩阵和 `b` 相等。\n\n若存在，输出所有子矩阵左上角的坐标；若不存在，输出 `\"Thereisnoanswer\"`。\n\n### 程序\n\n```cpp\n01 #include <iostream>\n02 using namespace std;\n03 const int SIZE = 50;\n04 int n1, m1, n2, m2;\n05 int a[SIZE][SIZE], b[SIZE][SIZE];\n06 int main()\n07 {\n08     int i, j, k1, k2;\n09     bool good, haveAns;\n10     cin >> n1 >> m1;\n11     for (i = 1; i <= n1; i++)\n12         for (j = 1; j <= m1; j++)\n13             cin >> a[i][j];\n14     cin >> n2 >> m2;\n15     for (i = 1; i <= n2; i++)\n16         for (j = 1; j <= m2; j++)\n17             ______①______;\n18     haveAns = false;\n19     for (i = 1; i <= n1 - n2 + 1; i++)\n20         for (j = 1; j <= ______②______; j++)\n21         {\n22             ______③______;\n23             for (k1 = 1; k1 <= n2; k1++)\n24                 for (k2 = 1; k2 <= ______④______; k2++)\n25                 {\n26                     if (a[i + k1 - 1][j + k2 - 1] != b[k1][k2])\n27                         good = false;\n28                 }\n29             if (good)\n30             {\n31                 cout << i << \" \" << j << endl;\n32                 ______⑤______;\n33             }\n34         }\n35     if (!haveAns)\n36         cout << \"Thereisnoanswer\" << endl;\n37     return 0;\n38 }\n```",
    "questions": [
      {
        "id": "noip-2011-completion-13-1",
        "number": 1,
        "text": "①处应填（ ）。",
        "options": {
          "A": "`cin>>b[i][j]`",
          "B": "`cin>>a[i][j]`",
          "C": "`cin>>b[n1][m1]`",
          "D": "`cin>>b[n2][m2]`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "第二个输入矩阵就是 `b`，所以自然要把 `n2*m2` 个元素写入：\n\n```cpp\nb[i][j]\n```"
      },
      {
        "id": "noip-2011-completion-13-2",
        "number": 2,
        "text": "②处应填（ ）。",
        "options": {
          "A": "`m1`",
          "B": "`m1-m2+1`",
          "C": "`m1-1`",
          "D": "`m1+1`"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "若 `b` 的宽度为 `m2`，左上角列号 `j` 最大只能到：\n\n```text\nm1-m2+1\n```\n\n否则右边会超出大矩阵。\n\n同理外层行号上界：\n\n```text\nn1-n2+1\n```"
      },
      {
        "id": "noip-2011-completion-13-3",
        "number": 3,
        "text": "③处应填（ ）。",
        "options": {
          "A": "`good=0`",
          "B": "`good='1'`",
          "C": "`good=false`",
          "D": "`good=1`"
        },
        "answers": [
          "D"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "每检查一个候选左上角时，要先假设：\n\n```text\n当前子矩阵是匹配的\n```\n\n因此：\n\n```cpp\ngood=true;\n```\n\n也就是 `good=1`。\n\n之后只要发现一个元素不相等，就改成：\n\n```cpp\ngood=false;\n```"
      },
      {
        "id": "noip-2011-completion-13-4",
        "number": 4,
        "text": "④处应填（ ）。",
        "options": {
          "A": "`k1+1`",
          "B": "`m2`",
          "C": "`m2-1`",
          "D": "`k1`"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "`k2` 用来枚举小矩阵的列：\n\n```cpp\nfor (k2=1; k2<=m2; k2++)\n```\n\n所以填 `m2`。"
      },
      {
        "id": "noip-2011-completion-13-5",
        "number": 5,
        "text": "⑤处应填（ ）。",
        "options": {
          "A": "`break`",
          "B": "`return`",
          "C": "`haveAns=true`",
          "D": "`haveAns=false`"
        },
        "answers": [
          "C"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "找到一个匹配位置并输出后，要记录：\n\n```text\n至少已经存在一个答案\n```\n\n因此：\n\n```cpp\nhaveAns=true;\n```\n\n否则最后还会错误输出：\n\n```text\nThereisnoanswer\n```\n\n#### 本题必须掌握\n\n多重循环不要被数量吓到，先给每个下标贴标签：\n\n```text\ni,j   -> 大矩阵中候选左上角\nk1,k2 -> 小矩阵内部位置\n```\n\n下标含义一清楚，边界基本就能推出来。\n\n\n---"
      }
    ],
    "tags": [
      "二维数组",
      "暴力枚举",
      "子矩阵匹配",
      "多重循环"
    ],
    "sourceLabel": "NOIP2011（黄金20题）"
  },
  {
    "id": "noip-2012-completion-14",
    "year": "NOIP",
    "sourceYear": "2012",
    "source": "NOIP2012",
    "type": "completion",
    "number": 14,
    "title": "NOIP2012：排列数",
    "description": "排列数\n\n知识点：排列生成、状态数组、字典序、回溯思想\n\n难度：★★★★\n\n训练重点：`used[]` 状态维护；寻找下一个排列",
    "statement": "### 题目\n\n输入两个正整数 `n,m`（`1≤n≤20, 1≤m≤n`），在 `1～n` 中任取 `m` 个数，按字典序从小到大输出所有这样的排列。\n\n例如：\n\n```text\n01 输入\n02 3 2\n03 输出\n04 1 2\n05 1 3\n06 2 1\n07 2 3\n08 3 1\n09 3 2\n```\n\n### 程序\n\n```cpp\n01 #include <iostream>\n02 #include <cstring>\n03 using namespace std;\n04 const int SIZE = 25;\n05 bool used[SIZE];\n06 int data[SIZE];\n07 int n, m, i, j, k;\n08 bool flag;\n09 int main()\n10 {\n11     cin >> n >> m;\n12     memset(used, false, sizeof(used));\n13     for (i = 1; i <= m; i++)\n14     {\n15         data[i] = i;\n16         used[i] = true;\n17     }\n18     flag = true;\n19     while (flag)\n20     {\n21         for (i = 1; i <= m - 1; i++)\n22             cout << data[i] << \" \";\n23         cout << data[m] << endl;\n24         flag = ______①______;\n25         for (i = m; i >= 1; i--)\n26         {\n27             ______②______;\n28             for (j = data[i] + 1; j <= n; j++)\n29                 if (!used[j])\n30                 {\n31                     used[j] = true;\n32                     data[i] = ______③______;\n33                     flag = true;\n34                     break;\n35                 }\n36             if (flag)\n37             {\n38                 for (k = i + 1; k <= m; k++)\n39                     for (j = 1; j <= ______④______; j++)\n40                         if (!used[j])\n41                         {\n42                             data[k] = j;\n43                             used[j] = true;\n44                             break;\n45                         }\n46                 ______⑤______;\n47             }\n48         }\n49     }\n50 }\n```",
    "questions": [
      {
        "id": "noip-2012-completion-14-1",
        "number": 1,
        "text": "①处应填（ ）。",
        "options": {
          "A": "`0`",
          "B": "`1`",
          "C": "`!flag`",
          "D": "`used[m]`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "每轮开始先假设：\n\n```text\n已经没有下一个排列\n```\n\n所以：\n\n```cpp\nflag=0;\n```\n\n如果后面成功找到可以变大的位置，再把 `flag` 设为真。"
      },
      {
        "id": "noip-2012-completion-14-2",
        "number": 2,
        "text": "②处应填（ ）。",
        "options": {
          "A": "`used[data[i]]=false`",
          "B": "`used[i]=false`",
          "C": "`used[data[i]]=true`",
          "D": "`used[i]=true`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "准备修改第 `i` 个位置之前，原来放在这里的数字要先“释放”：\n\n```cpp\nused[data[i]]=false;\n```\n\n这样这个数才可以重新参与后续位置选择。"
      },
      {
        "id": "noip-2012-completion-14-3",
        "number": 3,
        "text": "③处应填（ ）。",
        "options": {
          "A": "`!flag`",
          "B": "`data[j]`",
          "C": "`j`",
          "D": "`flag`"
        },
        "answers": [
          "C"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "循环寻找：\n\n```cpp\nfor (j=data[i]+1; j<=n; j++)\n```\n\n第一个未使用的更大数字。\n\n找到后这个位置就应该直接放：\n\n```cpp\ndata[i]=j;\n```"
      },
      {
        "id": "noip-2012-completion-14-4",
        "number": 4,
        "text": "④处应填（ ）。",
        "options": {
          "A": "`n+m`",
          "B": "`k`",
          "C": "`n`",
          "D": "`m`"
        },
        "answers": [
          "C"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "重建后缀时，每个位置都要从完整的：\n\n```text\n1...n\n```\n\n中找最小的未使用数字。\n\n所以：\n\n```cpp\nj<=n\n```"
      },
      {
        "id": "noip-2012-completion-14-5",
        "number": 5,
        "text": "⑤处应填（ ）。",
        "options": {
          "A": "`return 0`",
          "B": "`continue`",
          "C": "`!flag`",
          "D": "`break`"
        },
        "answers": [
          "D"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "一旦成功修改了某个位置并重新构造完后缀，本轮“寻找下一个排列”的任务已经完成。\n\n必须跳出从后向前的搜索：\n\n```cpp\nbreak;\n```\n\n否则还会继续修改更前面的元素。\n\n#### 本题必须掌握\n\n完善程序看到 `used[]` 时要问：\n\n```text\n什么时候占用？\n什么时候释放？\n什么时候恢复？\n```\n\n这比死记选项有效得多。\n\n\n---"
      }
    ],
    "tags": [
      "排列生成",
      "状态数组",
      "字典序",
      "回溯思想"
    ],
    "sourceLabel": "NOIP2012（黄金20题）"
  },
  {
    "id": "noip-2018-completion-15",
    "year": "NOIP",
    "sourceYear": "2018",
    "source": "NOIP2018",
    "type": "completion",
    "number": 15,
    "title": "NOIP2018：简单链表",
    "description": "简单链表\n\n知识点：数组模拟双向链表、下标映射、删除节点\n\n难度：★★★★\n\n训练重点：理解 `L[]`、`R[]` 表示前驱/后继；按值映射位置",
    "statement": "### 题目\n\n对于一个 `1` 到 `n` 的排列 `P`（即 `1` 到 `n` 中每一个数在 `P` 中恰好出现了一次），令 `q_i` 为第 `i` 个位置之后第一个比 `P_i` 值更大的位置，如果不存在这样的位置，则 `q_i=n+1`。\n\n例如 `n=5` 且 `P=15423`，则 `q=26656`。\n\n下列程序读入排列 `P`，使用双向链表求解答案。数据范围为 `1≤n≤10^5`。\n\n### 程序\n\n```cpp\n01 #include <iostream>\n02 using namespace std;\n03 const int N = 100010;\n04 int n;\n05 int L[N], R[N], a[N];\n06 int main()\n07 {\n08     cin >> n;\n09     for (int i = 1; i <= n; ++i)\n10     {\n11         int x;\n12         cin >> x;\n13         ______①______;\n14     }\n15     for (int i = 1; i <= n; ++i)\n16     {\n17         R[i] = ______②______;\n18         L[i] = i - 1;\n19     }\n20     for (int i = 1; i <= n; ++i)\n21     {\n22         L[______③______] = L[a[i]];\n23         R[L[a[i]]] = R[______④______];\n24     }\n25     for (int i = 1; i <= n; ++i)\n26     {\n27         cout << ______⑤______ << \" \";\n28     }\n29     cout << endl;\n30     return 0;\n31 }\n```",
    "questions": [
      {
        "id": "noip-2018-completion-15-1",
        "number": 1,
        "text": "①处应填（ ）。",
        "options": {
          "A": "`a[i]=x`",
          "B": "`a[x]=i`",
          "C": "`x=a[i]`",
          "D": "`a[x]=*i`"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "读入第 `i` 个位置的值 `x`。\n\n程序后续需要按值：\n\n```text\n1,2,3,...,n\n```\n\n依次找到它们在原排列中的位置，所以要建立反向映射：\n\n```cpp\na[x]=i;\n```"
      },
      {
        "id": "noip-2018-completion-15-2",
        "number": 2,
        "text": "②处应填（ ）。\n> 注：原书选项 A、D 的印刷内容非常接近；答案表标为 D。",
        "options": {
          "A": "`i+1`",
          "B": "`i*2`",
          "C": "`n-i`",
          "D": "`i+1`"
        },
        "answers": [
          "D"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "初始链表就是位置：\n\n```text\n1 <-> 2 <-> 3 <-> ... <-> n\n```\n\n所以：\n\n```cpp\nR[i]=i+1;\nL[i]=i-1;\n```\n\n> **原书排版提示**：该题选项中 A、D 都印成了 `i+1`，答案表给 D。两者文本等价，教学系统中建议以“正确表达式为 `i+1`”为准，不必纠结字母。"
      },
      {
        "id": "noip-2018-completion-15-3",
        "number": 3,
        "text": "③处应填（ ）。",
        "options": {
          "A": "`R[a[i]]`",
          "B": "`L[a[i]]`",
          "C": "`L[R[i]]`",
          "D": "`R[L[i]]`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "删除结点 `a[i]` 时，要把它的右邻居的左指针改为自己的左邻居：\n\n```cpp\nL[R[a[i]]] = L[a[i]];\n```\n\n这正是双向链表删除操作的一半。"
      },
      {
        "id": "noip-2018-completion-15-4",
        "number": 4,
        "text": "④处应填（ ）。",
        "options": {
          "A": "`a[L[i]]`",
          "B": "`a[i]`",
          "C": "`R[L[i]]`",
          "D": "`L[i]`"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "另一半操作：\n\n```cpp\nR[L[a[i]]] = R[a[i]];\n```\n\n表示让左邻居直接连到右邻居。\n\n因此空格里是：\n\n```cpp\na[i]\n```"
      },
      {
        "id": "noip-2018-completion-15-5",
        "number": 5,
        "text": "⑤处应填（ ）。",
        "options": {
          "A": "`L[i]`",
          "B": "`a[i]`",
          "C": "`R[i]`",
          "D": "`R[L[i]]`"
        },
        "answers": [
          "C"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "一个位置对应的值被删除时，该位置原有的 `R` 没有被覆盖，它恰好保留下了：\n\n> 原位置右侧第一个数值更大的位置。\n\n所以最后按位置输出：\n\n```cpp\nR[i]\n```\n\n#### 本题必须掌握\n\n数组链表删除结点 `x` 的模板：\n\n```cpp\nL[R[x]] = L[x];\nR[L[x]] = R[x];\n```\n\n建议学生把它画成：\n\n```text\nL[x] <-> x <-> R[x]\n```\n\n删除 `x` 后变成：\n\n```text\nL[x] <------> R[x]\n```\n\n\n---"
      }
    ],
    "tags": [
      "数组模拟双向链表",
      "下标映射",
      "删除节点"
    ],
    "sourceLabel": "NOIP2018（黄金20题）"
  },
  {
    "id": "noip-2017-completion-16",
    "year": "NOIP",
    "sourceYear": "2017",
    "source": "NOIP2017",
    "type": "completion",
    "number": 16,
    "title": "NOIP2017：切割绳子",
    "description": "切割绳子\n\n知识点：二分答案、贪心判断、整数除法、边界\n\n难度：★★★★\n\n训练重点：`check(mid)` 思想；左闭右闭二分更新方式",
    "statement": "### 题目\n\n有 `n` 条绳子，每条绳子的长度已知且均为正整数。绳子可以以任意正整数长度切割，但不可以连接。\n\n现在要从这些绳子中切割出 `m` 条长度相同的绳段，求绳段的最大长度是多少。\n\n输入：\n\n- 第一行是一个不超过 `100` 的正整数 `n`；\n- 第二行是 `n` 个不超过 `10^6` 的正整数，表示每条绳子的长度；\n- 第三行是一个不超过 `10^8` 的正整数 `m`。\n\n输出：绳段的最大长度；若无法切割，输出 `Failed`。\n\n### 程序\n\n```cpp\n01 #include <iostream>\n02 using namespace std;\n03 int n, m, i, lbound, ubound, mid, count;\n04 int len[100];  // 绳子长度\n05 int main()\n06 {\n07     cin >> n;\n08     count = 0;\n09     for (i = 0; i < n; i++)\n10     {\n11         cin >> len[i];\n12         ______①______;\n13     }\n14     cin >> m;\n15     if (______②______)\n16     {\n17         cout << \"Failed\" << endl;\n18         return 0;\n19     }\n20     lbound = 1;\n21     ubound = 1000000;\n22     while (______③______)\n23     {\n24         mid = ______④______;\n25         count = 0;\n26         for (i = 0; i < n; i++)\n27             ______⑤______;\n28         if (count < m)\n29             ubound = mid - 1;\n30         else\n31             lbound = mid;\n32     }\n33     cout << lbound << endl;\n34     return 0;\n35 }\n```",
    "questions": [
      {
        "id": "noip-2017-completion-16-1",
        "number": 1,
        "text": "①处应填（ ）。",
        "options": {
          "A": "空",
          "B": "`count+=len[i]`",
          "C": "`count+`",
          "D": "`count=count*10+len[i]`"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "在真正二分之前，程序先把所有绳子的总长度算出来：\n\n```cpp\ncount += len[i];\n```\n\n如果连长度为 1 的绳段都凑不出 `m` 条，就一定无解。"
      },
      {
        "id": "noip-2017-completion-16-2",
        "number": 2,
        "text": "②处应填（ ）。",
        "options": {
          "A": "`count==m`",
          "B": "`count<m`",
          "C": "`count>m`",
          "D": "`count!=m`"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "长度为正整数，所以最短绳段长度为 1。\n\n最多能切出的长度 1 绳段数，就是所有绳子总长度：\n\n```text\ncount\n```\n\n若：\n\n```text\ncount < m\n```\n\n连最短方案都不够，输出：\n\n```text\nFailed\n```"
      },
      {
        "id": "noip-2017-completion-16-3",
        "number": 3,
        "text": "③处应填（ ）。",
        "options": {
          "A": "`count=m`",
          "B": "`lbound=ubound`",
          "C": "`lbound<ubound`",
          "D": "`lbound>ubound`"
        },
        "answers": [
          "C"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "二分区间还没有缩成唯一答案时继续：\n\n```cpp\nwhile (lbound < ubound)\n```\n\n最终：\n\n```text\nlbound == ubound\n```\n\n就是最大可行长度。"
      },
      {
        "id": "noip-2017-completion-16-4",
        "number": 4,
        "text": "④处应填（ ）。",
        "options": {
          "A": "`(lbound+ubound+1)/2`",
          "B": "`(lbound+ubound-1)/2`",
          "C": "`(ubound-lbound+1)/2`",
          "D": "`(lbound+ubound+1)`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "当可行时程序更新：\n\n```cpp\nlbound=mid;\n```\n\n如果用普通下取整：\n\n```cpp\nmid=(lbound+ubound)/2\n```\n\n在：\n\n```text\nlbound+1==ubound\n```\n\n时会有：\n\n```text\nmid=lbound\n```\n\n可行后又赋：\n\n```text\nlbound=mid\n```\n\n区间不变，造成死循环。\n\n因此必须用**上取整中点**：\n\n```cpp\n(lbound+ubound+1)/2\n```"
      },
      {
        "id": "noip-2017-completion-16-5",
        "number": 5,
        "text": "⑤处应填（ ）。",
        "options": {
          "A": "`count+=len[i]/mid`",
          "B": "`count=(count+len[i])/mid`",
          "C": "`count+=len[i]/lbound`",
          "D": "`count=(count+len[i])/ubound`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "假设每段长度为 `mid`，一根长度 `len[i]` 的绳子最多能得到：\n\n```text\nfloor(len[i]/mid)\n```\n\n段。\n\n整数除法正好自动向下取整，因此：\n\n```cpp\ncount += len[i] / mid;\n```\n\n#### 本题必须掌握\n\n二分答案的标准三问：\n\n1. **答案是什么？** —— 最大绳段长度；\n2. **能不能检查一个答案？** —— 统计能切几段；\n3. **可行性是否单调？** —— 长度越短越容易切够。\n\n尤其要掌握：\n\n```text\n可行时 left=mid -> mid 要向上取整\n```\n\n\n---"
      }
    ],
    "tags": [
      "二分答案",
      "贪心判断",
      "整数除法",
      "边界"
    ],
    "sourceLabel": "NOIP2017（黄金20题）"
  },
  {
    "id": "noip-2015-completion-17",
    "year": "NOIP",
    "sourceYear": "2015",
    "source": "NOIP2015",
    "type": "completion",
    "number": 17,
    "title": "NOIP2015：中位数",
    "description": "中位数\n\n知识点：值域二分、计数、二分边界\n\n难度：★★★★\n\n训练重点：不排序直接在值域上二分；通过计数缩小答案区间",
    "statement": "### 题目\n\n给定 `n`（`n` 为奇数且小于 `1000`）个整数，整数的范围在 `0～m`（`0<m<2^31`）之间，请使用二分法求这 `n` 个整数的中位数。\n\n所谓中位数，是指将这 `n` 个数排序之后，排在正中间的数。\n\n### 程序\n\n```cpp\n01 #include <iostream>\n02 using namespace std;\n03 const int MAXN = 1000;\n04 int n, i, lbound, rbound, mid, m;\n05 int x[MAXN];\n06 int main()\n07 {\n08     cin >> n >> m;\n09     for (i = 0; i < n; i++)\n10         cin >> x[i];\n11     lbound = 0;\n12     rbound = m;\n13     while (______①______)\n14     {\n15         mid = (lbound + rbound) / 2;\n16         ______②______;\n17         for (i = 0; i < n; i++)\n18             if (______③______)\n19                 ______④______;\n20         if (count > n / 2)\n21             lbound = mid + 1;\n22         else\n23             ______⑤______;\n24     }\n25     cout << rbound << endl;\n26     return 0;\n27 }\n```",
    "questions": [
      {
        "id": "noip-2015-completion-17-1",
        "number": 1,
        "text": "①处应填（ ）。",
        "options": {
          "A": "`lbound<rbound`",
          "B": "`lbound+1<rbound`",
          "C": "`lbound<=rbound`",
          "D": "`rbound-lbound>1`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "只要左右边界还没有重合，就继续寻找：\n\n```cpp\nwhile (lbound < rbound)\n```\n\n最后两者相等，即唯一答案。"
      },
      {
        "id": "noip-2015-completion-17-2",
        "number": 2,
        "text": "②处应填（ ）。",
        "options": {
          "A": "`int count=0`",
          "B": "`int p=0`",
          "C": "`int count=1`",
          "D": "`int p=1`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "每次换一个新的 `mid`，都要重新统计有多少个元素大于它，因此计数器必须从 0 开始：\n\n```cpp\nint count=0;\n```"
      },
      {
        "id": "noip-2015-completion-17-3",
        "number": 3,
        "text": "③处应填（ ）。",
        "options": {
          "A": "`x[i]>x[p]`",
          "B": "`x[i]>=x[p]`",
          "C": "`mid<x[i]`",
          "D": "`x[mid]>i`"
        },
        "answers": [
          "C"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "要统计：\n\n```text\nx[i] > mid\n```\n\n写成：\n\n```cpp\nmid < x[i]\n```\n\n即可。"
      },
      {
        "id": "noip-2015-completion-17-4",
        "number": 4,
        "text": "④处应填（ ）。",
        "options": {
          "A": "`p=i`",
          "B": "`p=max(p,i)`",
          "C": "`count*=1`",
          "D": "`count++`"
        },
        "answers": [
          "D"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "每发现一个大于 `mid` 的元素，就让数量增加 1：\n\n```cpp\ncount++;\n```"
      },
      {
        "id": "noip-2015-completion-17-5",
        "number": 5,
        "text": "⑤处应填（ ）。",
        "options": {
          "A": "`mid=rbound`",
          "B": "`rbound=mid+1`",
          "C": "`rbound=mid`",
          "D": "`rbound=mid-1`"
        },
        "answers": [
          "C"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "若：\n\n```text\ncount <= n/2\n```\n\n说明大于 `mid` 的元素没有超过一半，中位数不会大于 `mid`。\n\n因此保留 `mid`：\n\n```cpp\nrbound=mid;\n```\n\n不能写 `mid-1`，因为 `mid` 本身可能就是答案。\n\n#### 本题必须掌握\n\n这是“值域二分”，不是“在已经排序的数组下标上二分”。\n\n学生要学会区分：\n\n```text\n二分位置\n二分答案\n二分数值范围\n```\n\n\n---"
      }
    ],
    "tags": [
      "值域二分",
      "计数",
      "二分边界"
    ],
    "sourceLabel": "NOIP2015（黄金20题）"
  },
  {
    "id": "noip-2009-completion-18",
    "year": "NOIP",
    "sourceYear": "2009",
    "source": "NOIP2009",
    "type": "completion",
    "number": 18,
    "title": "NOIP2009：国王放置",
    "description": "国王放置\n\n知识点：DFS、回溯、状态标记、恢复现场\n\n难度：★★★★\n\n训练重点：搜索位置推进；对攻击范围进行“加一/减一”恢复",
    "statement": "### 题目\n\n在 `n*m` 的棋盘上放置 `k` 个国王，要求 `k` 个国王互相不攻击，求有多少种不同的放置方法。\n\n假设国王放置在第 `(x,y)` 格，国王攻击的区域是：\n\n`(x-1,y-1)`、`(x-1,y)`、`(x-1,y+1)`、`(x,y-1)`、`(x,y+1)`、`(x+1,y-1)`、`(x+1,y)`、`(x+1,y+1)`。\n\n读入三个数 `n,m,k`，输出答案。棋盘行标号为 `0～n-1`，列标号为 `0～m-1`。\n\n### 程序\n\n```cpp\n01 #include <iostream>\n02 #include <cstring>\n03 using namespace std;\n04 int n, m, k, ans;\n05 int hash[5][5];\n06 void work(int x, int y, int tot)\n07 {\n08     int i, j;\n09     if (tot == k)\n10     {\n11         ans++;\n12         return;\n13     }\n14     do\n15     {\n16         while (hash[x][y])\n17         {\n18             y++;\n19             if (y == m)\n20             {\n21                 x++;\n22                 y = ______①______;\n23             }\n24             if (x == n)\n25                 return;\n26         }\n27         for (i = x - 1; i <= x + 1; i++)\n28             if (i >= 0 && i < n)\n29                 for (j = y - 1; j <= y + 1; j++)\n30                     if (j >= 0 && j < m)\n31                         ______②______;\n32         ______③______;\n33         for (i = x - 1; i <= x + 1; i++)\n34             if (i >= 0 && i < n)\n35                 for (j = y - 1; j <= y + 1; j++)\n36                     if (j >= 0 && j < m)\n37                         ______④______;\n38         y++;\n39         if (y == m)\n40         {\n41             x++;\n42             y = 0;\n43         }\n44         if (x == n)\n45             return;\n46     } while (1);\n47 }\n48 int main()\n49 {\n50     cin >> n >> m >> k;\n51     ans = 0;\n52     memset(hash, 0, sizeof(hash));\n53     ______⑤______;\n54     cout << ans << endl;\n55     return 0;\n56 }\n```",
    "questions": [
      {
        "id": "noip-2009-completion-18-1",
        "number": 1,
        "text": "①处应填（ ）。",
        "options": {
          "A": "`1`",
          "B": "`0`",
          "C": "`x`",
          "D": "`m`"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "当：\n\n```cpp\ny == m\n```\n\n说明已经越过当前行的最后一列，要进入下一行：\n\n```cpp\nx++;\ny=0;\n```\n\n所以填 0。"
      },
      {
        "id": "noip-2009-completion-18-2",
        "number": 2,
        "text": "②处应填（ ）。",
        "options": {
          "A": "`hash[i][j]++`",
          "B": "`hash[i][j]--`",
          "C": "`hash[i][j]=0`",
          "D": "`hash[i][j]=1`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "准备在 `(x,y)` 放国王后，它周围九宫格范围都暂时不能再放国王。\n\n因此对合法位置做：\n\n```cpp\nhash[i][j]++;\n```\n\n使用加一而不是直接赋 1，是为了支持攻击区域重叠。"
      },
      {
        "id": "noip-2009-completion-18-3",
        "number": 3,
        "text": "③处应填（ ）。",
        "options": {
          "A": "`work(x,y,tot++)`",
          "B": "`work(x,y,++tot)`",
          "C": "`work(x,y,tot+1)`",
          "D": "`work(x,y,tot)`"
        },
        "answers": [
          "C"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "已经放置了一个新国王，所以递归层中的已放数量应该增加 1：\n\n```cpp\nwork(x,y,tot+1);\n```\n\n不能用：\n\n```cpp\ntot++\n```\n\n因为后缀自增传入的仍是旧值，并且还会修改当前层变量，容易破坏回溯逻辑。"
      },
      {
        "id": "noip-2009-completion-18-4",
        "number": 4,
        "text": "④处应填（ ）。",
        "options": {
          "A": "`hash[i][j]++`",
          "B": "`hash[i][j]--`",
          "C": "`hash[i][j]=0`",
          "D": "`hash[i][j]=1`"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "递归返回后要恢复现场。\n\n之前每个受影响格子都：\n\n```cpp\n++\n```\n\n现在对应：\n\n```cpp\n--\n```\n\n这样才能继续尝试“这个位置不放国王”的其他方案。"
      },
      {
        "id": "noip-2009-completion-18-5",
        "number": 5,
        "text": "⑤处应填（ ）。",
        "options": {
          "A": "`work(0,0,0)`",
          "B": "`work(0,0,1)`",
          "C": "`work(1,1,1)`",
          "D": "`work(n,m,k)`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "初始状态：\n\n- 从左上角 `(0,0)` 开始；\n- 尚未放置任何国王。\n\n所以：\n\n```cpp\nwork(0,0,0);\n```\n\n#### 本题必须掌握\n\n回溯题最重要的是成对操作：\n\n```cpp\n做选择\n递归\n撤销选择\n```\n\n本题对应：\n\n```cpp\nhash++\nwork(...)\nhash--\n```\n\n少掉最后一步就会把上一条搜索分支的状态“污染”到下一条分支。\n\n\n---"
      }
    ],
    "tags": [
      "DFS",
      "回溯",
      "状态标记",
      "恢复现场"
    ],
    "sourceLabel": "NOIP2009（黄金20题）"
  },
  {
    "id": "noip-2015-completion-19",
    "year": "NOIP",
    "sourceYear": "2015",
    "source": "NOIP2015",
    "type": "completion",
    "number": 19,
    "title": "NOIP2015：双子序列最大和",
    "description": "双子序列最大和\n\n知识点：动态规划、最大子段和、前缀最优、后缀最优\n\n难度：★★★★\n\n训练重点：把左右两侧最优结果预处理后组合；状态含义",
    "statement": "### 题目\n\n给定一个长度为 `n`（`3≤n≤1000`）的整数序列，要求从中选出两个连续子序列，使得这两个连续子序列的序列和之和最大，最终只需输出这个最大和。\n\n一个连续子序列的序列和为该连续子序列中所有数之和。\n\n要求：\n\n- 每个连续子序列长度至少为 1；\n- 两个连续子序列之间至少间隔 1 个数。\n\n### 程序\n\n```cpp\n01 #include <iostream>\n02 using namespace std;\n03 const int MAXN = 1000;\n04 int n, i, ans, sum;\n05 int x[MAXN];\n06 int lmax[MAXN];\n07 // lmax[i] 为仅含 x[i] 及 x[i] 左侧整数的连续子序列的序列和中最大的序列和\n08 int rmax[MAXN];\n09 // rmax[i] 为仅含 x[i] 及 x[i] 右侧整数的连续子序列的序列和中最大的序列和\n10 int main()\n11 {\n12     cin >> n;\n13     for (i = 0; i < n; i++)\n14         cin >> x[i];\n15     lmax[0] = x[0];\n16     for (i = 1; i < n; i++)\n17         if (lmax[i - 1] <= 0)\n18             lmax[i] = x[i];\n19         else\n20             lmax[i] = lmax[i - 1] + x[i];\n21     for (i = 1; i < n; i++)\n22         if (lmax[i] < lmax[i - 1])\n23             lmax[i] = lmax[i - 1];\n24     ______①______;\n25     for (i = n - 2; i >= 0; i--)\n26         if (rmax[i + 1] <= 0)\n27             ______②______;\n28         else\n29             ______③______;\n30     for (i = n - 2; i >= 0; i--)\n31         if (rmax[i] < rmax[i + 1])\n32             ______④______;\n33     ans = x[0] + x[2];\n34     for (i = 1; i < n - 1; i++)\n35     {\n36         sum = ______⑤______;\n37         if (sum > ans) ans = sum;\n38     }\n39     cout << ans << endl;\n40     return 0;\n41 }\n```",
    "questions": [
      {
        "id": "noip-2015-completion-19-1",
        "number": 1,
        "text": "①处应填（ ）。",
        "options": {
          "A": "`lmax[n-1]=x[n-1]`",
          "B": "`rmax[n]=x[n]`",
          "C": "`rmax[n-1]=x[n-1]`",
          "D": "`lmax[n]=x[n]`"
        },
        "answers": [
          "C"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "从右向左做 DP 时，最右端只有一个元素：\n\n```text\nx[n-1]\n```\n\n所以后缀最大连续子段和的初值是：\n\n```cpp\nrmax[n-1]=x[n-1];\n```"
      },
      {
        "id": "noip-2015-completion-19-2",
        "number": 2,
        "text": "②处应填（ ）。",
        "options": {
          "A": "`rmax[i]=x[i+1]`",
          "B": "`rmax[i]=x[i]`",
          "C": "`x[i]=rmax[i]`",
          "D": "`rmax[i]=x[i-1]`"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "如果右边接过来的连续子段和：\n\n```cpp\nrmax[i+1] <= 0\n```\n\n继续连接只会让当前结果变差。\n\n因此从当前元素重新开始：\n\n```cpp\nrmax[i]=x[i];\n```\n\n这与 Kadane 最大子段和的思想相同。"
      },
      {
        "id": "noip-2015-completion-19-3",
        "number": 3,
        "text": "③处应填（ ）。",
        "options": {
          "A": "`rmax[i]=rmax[i-1]+x[i]`",
          "B": "`rmax[i]=0x3f`",
          "C": "`rmax[i-1]=rmax[i]+x[i]`",
          "D": "`rmax[i]=rmax[i+1]+x[i]`"
        },
        "answers": [
          "D"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "若：\n\n```text\nrmax[i+1] > 0\n```\n\n说明右侧连续段有正贡献，应当把 `x[i]` 接到它前面：\n\n```cpp\nrmax[i]=x[i]+rmax[i+1];\n```"
      },
      {
        "id": "noip-2015-completion-19-4",
        "number": 4,
        "text": "④处应填（ ）。",
        "options": {
          "A": "`rmax[i]=rmax[i+1]`",
          "B": "`rmax[i]=rmax[i-1]`",
          "C": "`rmax[i]=x[i+1]`",
          "D": "`rmax[i]=x[i-1]`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "前一步得到的是“必须包含 `i` 的最优连续段”。\n\n接下来程序还要把它加工为：\n\n> 后缀 `i..n-1` 中任意位置开始的最大连续子段和。\n\n如果：\n\n```cpp\nrmax[i] < rmax[i+1]\n```\n\n说明最优答案其实完全在右侧，就继承：\n\n```cpp\nrmax[i]=rmax[i+1];\n```"
      },
      {
        "id": "noip-2015-completion-19-5",
        "number": 5,
        "text": "⑤处应填（ ）。",
        "options": {
          "A": "`lmax[i]+rmax[i]`",
          "B": "`lmax[i-1]+rmax[i+1]`",
          "C": "`lmax[i-2]+rmax[i+1]`",
          "D": "`lmax[i-2]+rmax[i+2]`"
        },
        "answers": [
          "B"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "位置 `i` 被作为两个子序列之间的“间隔”。\n\n所以左边最多只能用到：\n\n```text\ni-1\n```\n\n右边最早只能从：\n\n```text\ni+1\n```\n\n开始。\n\n因此：\n\n```cpp\nsum=lmax[i-1]+rmax[i+1];\n```\n\n刚好保证两个连续子段至少间隔一个元素。\n\n#### 本题必须掌握\n\n这道题最值得学习的是：\n\n> **先预处理左右最优值，再枚举分割位置组合答案。**\n\n这是很多前缀/后缀 DP 题的共同套路。\n\n\n---"
      }
    ],
    "tags": [
      "动态规划",
      "最大子段和",
      "前缀最优",
      "后缀最优"
    ],
    "sourceLabel": "NOIP2015（黄金20题）"
  },
  {
    "id": "noip-2013-completion-20",
    "year": "NOIP",
    "sourceYear": "2013",
    "source": "NOIP2013",
    "type": "completion",
    "number": 20,
    "title": "NOIP2013：二叉查找树",
    "description": "二叉查找树\n\n知识点：BST、递归、上下界约束、树结构\n\n难度：★★★★\n\n训练重点：用区间 `(lower_bound, upper_bound)` 验证整棵 BST",
    "statement": "### 题目\n\n二叉查找树具有如下性质：\n\n- 每个结点的值都大于其左子树上所有结点的值；\n- 每个结点的值都小于其右子树上所有结点的值。\n\n试判断一棵树是否为二叉查找树。\n\n输入的第一行包含一个整数 `n`，表示这棵树有 `n` 个顶点，编号分别为 `1,2,...,n`，其中编号为 1 的为根结点。\n\n之后的第 `i` 行有三个数 `value,left_child,right_child`，分别表示该结点关键字的值、左子结点的编号、右子结点的编号；如果不存在左子结点或右子结点，则用 `0` 代替。\n\n输出 `1` 表示这棵树是二叉查找树，输出 `0` 则表示不是。\n\n### 程序\n\n```cpp\n01 #include <iostream>\n02 using namespace std;\n03 const int SIZE = 100;\n04 const int INFINITE = 1000000;\n05 struct node\n06 {\n07     int left_child, right_child, value;\n08 };\n09 node a[SIZE];\n10 int is_bst(int root, int lower_bound, int upper_bound)\n11 {\n12     int cur;\n13     if (root == 0) return 1;\n14     cur = a[root].value;\n15     if ((cur > lower_bound) && (______①______) &&\n16         (is_bst(a[root].left_child, lower_bound, cur) == 1) &&\n17         (is_bst(______②______, ______③______, ______④______) == 1))\n18         return 1;\n19     return 0;\n20 }\n21 int main()\n22 {\n23     int i, n;\n24     cin >> n;\n25     for (i = 1; i <= n; i++)\n26         cin >> a[i].value >> a[i].left_child >> a[i].right_child;\n27     cout << is_bst(______⑤______, -INFINITE, INFINITE) << endl;\n28     return 0;\n29 }\n```",
    "questions": [
      {
        "id": "noip-2013-completion-20-1",
        "number": 1,
        "text": "①处应填（ ）。",
        "options": {
          "A": "`cur<upper_bound`",
          "B": "`cur<=upper_bound`",
          "C": "`cur>upper_bound`",
          "D": "`cur>=upper_bound`"
        },
        "answers": [
          "A"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "已经有条件：\n\n```cpp\ncur > lower_bound\n```\n\n另一侧必须是：\n\n```cpp\ncur < upper_bound\n```\n\nBST 这里使用严格不等号，不能等于边界。"
      },
      {
        "id": "noip-2013-completion-20-2",
        "number": 2,
        "text": "②处应填（ ）。",
        "options": {
          "A": "`left_child`",
          "B": "`right_child`",
          "C": "`a[root].left_child`",
          "D": "`a[root].right_child`"
        },
        "answers": [
          "D"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "前一个递归已经检查左子树：\n\n```cpp\nis_bst(a[root].left_child, lower_bound, cur)\n```\n\n因此第二个递归自然应检查右子树：\n\n```cpp\na[root].right_child\n```"
      },
      {
        "id": "noip-2013-completion-20-3",
        "number": 3,
        "text": "③处应填（ ）。",
        "options": {
          "A": "`left_child`",
          "B": "`right_child`",
          "C": "`cur+1`",
          "D": "`cur`"
        },
        "answers": [
          "D"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "右子树的所有结点都必须：\n\n```text\n> 当前根 cur\n```\n\n所以右子树递归的下界改为：\n\n```cpp\ncur\n```"
      },
      {
        "id": "noip-2013-completion-20-4",
        "number": 4,
        "text": "④处应填（ ）。",
        "options": {
          "A": "`left_child`",
          "B": "`upper_bound-1`",
          "C": "`right_child`",
          "D": "`upper_bound`"
        },
        "answers": [
          "D"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "右子树仍然必须满足当前祖先传下来的最大上界，因此上界保持：\n\n```cpp\nupper_bound\n```\n\n完整递归为：\n\n```cpp\nis_bst(a[root].right_child, cur, upper_bound)\n```"
      },
      {
        "id": "noip-2013-completion-20-5",
        "number": 5,
        "text": "⑤处应填（ ）。",
        "options": {
          "A": "`-1`",
          "B": "`0`",
          "C": "`1`",
          "D": "`2`"
        },
        "answers": [
          "C"
        ],
        "multiple": false,
        "score": 8,
        "explanation": "题目说明编号 1 是根结点，所以初始调用应为：\n\n```cpp\nis_bst(1, -INFINITE, INFINITE)\n```\n\n#### 本题必须掌握\n\n判断 BST 最可靠的递归模型：\n\n```text\n当前结点合法范围 = (low, high)\n\n左子树： (low, cur)\n右子树： (cur, high)\n```\n\n不要只比较父结点和直接孩子，那样会漏掉“孙子结点越界”的情况。\n\n\n---\n\n# 教师使用建议\n\n这 20 题不建议一次性全部发给学生。可按以下顺序使用：\n\n1. **基础阅读**：1、5、9、12、15\n2. **核心算法阅读**：2、4、7、8、10\n3. **递归与搜索**：3、6、18\n4. **二分专项**：16、17\n5. **DP 与树综合**：19、20\n6. **二维数组与枚举**：11、13、14\n\n建议每道阅读程序要求学生完成三步复盘：\n\n- 先用一句话说明“程序在做什么”；\n- 再说明关键变量/数组的含义；\n- 最后解释每一个错误选项“为什么错”。\n\n建议每道完善程序要求学生先写：\n\n- 空格所在位置需要完成的“功能”；\n- 再看选项，而不是直接代选项试运行。"
      }
    ],
    "tags": [
      "BST",
      "递归",
      "上下界约束",
      "树结构"
    ],
    "sourceLabel": "NOIP2013（黄金20题）"
  }
];
