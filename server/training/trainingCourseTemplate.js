// 管理员首次分配课程时复制此标准模板，教师只修改自己的课程实例。
const trainingCourseTemplate = {
  title: 'C++ 算法集训十日 · 高阶组',
  summary: '面向同班分层集训：全班学习同一知识点、使用同一套 GESP/CSP-J/S 真题体系，再按通关线与提高线安排不同的限时要求、编程题和讲评深度；以练习带讲解，第一轮与编程训练约 6:4。',
  days: [
    {
      day: 1,
      date: '2026-08-03',
      morning: {
        theme: '入营诊断、C++ 基础与程序执行',
        timing: '入营诊断30分钟；基础讲授45分钟；选择真题35分钟；阅读程序40分钟；完善程序20分钟；复盘10分钟',
        goals: '了解学生在语法、运算、循环、函数和程序阅读方面的真实水平；建立先判断程序功能、再追踪关键变量的阅读习惯。',
        knowledge: '变量类型；输入输出；运算符优先级；整除与取模；循环边界；函数参数；程序执行流程。',
        notes: '记录“会做但慢、概念混淆、代码不稳”三类问题，重点检查整数除法、变量初始化、循环次数和输出格式。',
      },
      questions: {
        choice: ['2019-choice-3', '2019-choice-4', '2020-choice-1', '2020-choice-2', '2024-choice-6', '2024-choice-7', '2024-choice-15'],
        reading: ['2023-reading-1'],
        completion: ['2024-completion-1'],
      },
      afternoon: {
        theme: '顺序结构、循环与基础模拟',
        timing: '上午真题回扣35分钟；模型讲解25分钟；独立编程90分钟；调试复盘20分钟；小测与作业10分钟',
        goals: '把语法和边界问题落实到代码，能够把过程描述转换为循环或简单模拟，并独立构造边界样例。',
        knowledge: '读入—处理—输出；循环模拟；状态更新；边界样例；基础调试。',
        notes: '基础题要求正确、规范、一次通过；提高题要求解释每个边界条件并设计自测数据。',
      },
      programming: {
        basic: ['P1001', 'P1046'],
        advanced: ['P5727', 'P1089'],
      },
    },
    {
      day: 2,
      date: '2026-08-04',
      morning: {
        theme: '数据表示、进制、位运算与数论基础',
        timing: '前测回顾20分钟；概念讲授50分钟；选择真题30分钟；阅读程序45分钟；完善程序25分钟；复盘10分钟',
        goals: '掌握常见进制转换、存储容量换算和基本位运算；复习质数、因数、最大公约数和试除法。',
        knowledge: '二、八、十、十六进制；位与字节；原码、反码、补码；按位与、或、异或、移位；质数与因数。',
        notes: '所有进制与位运算题写出中间过程；注意有符号数、整数溢出、1不是质数以及完全平方数边界。',
      },
      questions: {
        choice: ['2019-choice-2', '2020-choice-4', '2020-choice-9', '2021-choice-3', '2021-choice-7', '2022-choice-13', '2024-choice-1', '2024-choice-2', '2024-choice-4', '2024-choice-5'],
        reading: ['2021-reading-1', '2022-reading-1'],
        completion: ['2020-completion-1'],
      },
      afternoon: {
        theme: '枚举、质数判断与数值模拟',
        timing: '上午真题回扣35分钟；枚举模型讲解25分钟；独立编程90分钟；调试复盘20分钟；小测与作业10分钟',
        goals: '能从数据范围反推枚举规模，编写质数判断、因数枚举和数值模拟程序，并减少无效枚举。',
        knowledge: '枚举范围；试除法；筛法入门；前缀统计；乘法边界与溢出。',
        notes: '提高题比较逐个试除、筛法和前缀统计的适用范围，统一用质数、完全平方数和大质数测试。',
      },
      programming: {
        basic: ['P1238', 'P1336'],
        advanced: ['P1358', 'P1379'],
        luoguBasic: ['P5723'],
        luoguPopular: ['P1563', 'P1068', 'P2563'],
        luoguAdvanced: ['P1149', 'P1865'],
        csp: ['P7071', 'P7909', 'P7072', 'P8814'],
      },
    },
    {
      day: 3,
      date: '2026-08-05',
      morning: {
        theme: '数组、字符串与指针基础',
        timing: '错题回顾20分钟；概念讲授50分钟；选择真题30分钟；阅读程序45分钟；完善程序25分钟；复盘10分钟',
        goals: '掌握数组下标、字符串长度和字符编码，理解指针保存地址的含义以及链表结点之间的连接关系。',
        knowledge: '数组下标；字符编码；字符数组与 string；指针与地址；链表结点；频次数组和映射表。',
        notes: '阅读字符串程序时画“下标—字符—当前状态”表，重点检查越界、字符与整数混用以及 size() 的类型。',
      },
      questions: {
        choice: ['2022-choice-3', '2022-choice-4', '2022-choice-11', '2022-choice-14', '2023-choice-3', '2023-choice-4', '2019-choice-6', 'csp-s-2021-choice-10', 'gesp-cpp4-2023-12-judgment-1', 'gesp-cpp4-2023-12-judgment-8', 'gesp-cpp4-2024-03-choice-11', 'csp-s-2021-choice-12'],
        reading: ['2020-reading-1', '2021-reading-2', 'csp-s-2021-reading-2'],
        completion: ['2019-completion-2', '2023-completion-2', 'csp-s-2021-completion-1'],
      },
      afternoon: {
        theme: '数组统计、字符串处理与综合模拟',
        timing: '上午真题回扣35分钟；建模示范25分钟；独立编程90分钟；调试复盘20分钟；小测与作业10分钟',
        goals: '能从题意提取数组状态和统计量，掌握频次数组、字符分类和多行输出，训练较长模拟题的模块拆分。',
        knowledge: '数组遍历；字符分类；频次统计；格式输出；重复字符和极端输入测试。',
        notes: '提高题要求把输入处理、统计和输出拆成清晰模块，重点检查读取空格、大小写范围和重复统计。',
      },
      programming: {
        basic: ['P1428', 'P5730'],
        advanced: ['P1598', 'P1125'],
      },
    },
    {
      day: 4,
      date: '2026-08-06',
      morning: {
        theme: '复杂度、排序与二分查找',
        timing: '错题回顾20分钟；概念讲授50分钟；选择真题30分钟；阅读程序45分钟；完善程序25分钟；复盘10分钟',
        goals: '能从循环层数、递归规模和区间缩减判断复杂度，掌握常见排序特征以及二分查找的不变量。',
        knowledge: '时间与空间复杂度；排序稳定性；二分区间；第一个满足条件的位置；答案二分；单调性。',
        notes: '二分题统一写出查找区间、判定条件和答案位置，重点检查死循环、重复值与左右端点更新。',
      },
      questions: {
        choice: ['2019-choice-5', '2020-choice-5', '2020-choice-6', '2021-choice-4', '2022-choice-12', '2024-choice-9', '2019-choice-11', '2021-choice-15', '2023-choice-6'],
        reading: ['2019-reading-3', '2022-reading-3', '2019-reading-2'],
        completion: ['2023-completion-1', '2020-completion-2'],
      },
      afternoon: {
        theme: '排序、二分、前缀和与贪心优化',
        timing: '上午真题回扣25分钟；二分模型讲解25分钟；前缀和与贪心讲解35分钟；独立编程75分钟；调试复盘20分钟',
        goals: '熟练处理排序、重复元素和二分边界，能用前缀和优化重复区间统计，并能说明典型排序贪心的选择依据。',
        knowledge: '标准排序；lower_bound 思想；二分答案；一维/二维前缀和；排序贪心；活动选择；复杂度比较。',
        notes: '二分题说明单调性，前缀和题写清数组定义与下标，贪心题需给出交换论证或反例检查，不能只凭样例判断。',
      },
      programming: {
        basic: ['P1177', 'P2249', 'P8218', 'P1223'],
        advanced: ['P1102', 'P1873', 'P2004', 'P1803'],
      },
    },
    {
      day: 5,
      date: '2026-08-07',
      morning: {
        theme: '排列组合、递归、DFS、回溯与 BFS',
        timing: '计数原理与排列组合35分钟；递归与搜索讲授40分钟；DFS/回溯检测40分钟；BFS分层讲授45分钟；对比复盘20分钟',
        goals: '掌握加法/乘法原理、排列与组合的基本计数方法，理解递归出口，掌握 DFS 的“选择—递归—撤销”以及 BFS 的“按层扩展”，能在计数、枚举与最短路模型之间正确选择。',
        knowledge: '加法原理与乘法原理；排列数与组合数；相邻、捆绑与至少一个；递归出口；DFS；回溯恢复；基础剪枝；队列；BFS 分层；最短步数。',
        notes: '重点检查递归出口、状态恢复、visited 标记时机和 BFS 入队去重；区分“枚举全部方案”与“求等权最短路”。',
      },
      questions: {
        choice: ['2020-choice-6', '2021-choice-13', '2021-choice-14', '2022-choice-15', '2019-choice-7', '2020-choice-10', '2023-choice-14', '2024-choice-14', 'csp-s-2023-choice-2'],
        reading: ['2024-reading-3', '2020-reading-3'],
        completion: ['2024-completion-2', '2022-completion-2'],
      },
      afternoon: {
        theme: '排列组合回溯与 BFS 经典模型',
        timing: '计数题辨型20分钟；排列/组合/拆分回溯训练55分钟；N皇后与剪枝30分钟；BFS网格与状态最短路训练60分钟；复盘15分钟',
        goals: '能先用计数原理求方案数，再用回溯生成排列、组合、子集、拆分与 N 皇后方案，并用 BFS 解决网格、棋盘和状态转换的最少步数问题。',
        knowledge: '排列组合计数；去重排列；子集与拆分；N 皇后；搜索树与剪枝；队列状态；距离数组；网格最短路；状态最短路。',
        notes: '回溯题先写“选择—递归—撤销”，BFS 题先定义状态和转移；等权最短路在入队时标记，避免重复扩展。',
      },
      programming: {
        basic: ['P1706', 'P1157', 'P1605', 'P1746', 'P1443'],
        advanced: ['P2404', 'P1101', 'P1219', 'P1135', 'P2895'],
      },
    },
    {
      day: 6,
      date: '2026-08-10',
      morning: {
        theme: 'STL、栈队列与前中后缀表达式',
        timing: '间隔回忆测验15分钟；STL容器讲授35分钟；栈与队列30分钟；表达式转换与求值50分钟；真题训练35分钟；复盘15分钟',
        goals: '熟练使用 vector、string、set、map、stack、queue 和 priority_queue，理解栈与队列的典型应用，掌握中缀、前缀和后缀表达式的转换与求值。',
        knowledge: '常用容器与复杂度；栈与队列；运算符优先级与结合性；中缀转前/后缀；后缀表达式求值；括号匹配。',
        notes: '表达式题用运算符栈和操作数栈分开追踪，特别检查括号、同优先级的结合方向、负数和多位数。',
      },
      questions: {
        choice: ['2021-choice-9', '2022-choice-6', '2023-choice-8', '2019-choice-14', '2021-choice-11', '2022-choice-7', '2023-choice-10', '2023-choice-11', '2020-choice-8', '2021-choice-6', '2022-choice-9', '2023-choice-12', '2024-choice-11'],
        reading: [],
        completion: ['csp-s-2024-completion-2'],
      },
      afternoon: {
        theme: '树、二叉树、哈夫曼树与图论基础',
        timing: '树与二叉树性质30分钟；三种遍历与建树35分钟；哈夫曼树25分钟；图论概念与存储30分钟；DFS/BFS遍历30分钟；真题复盘30分钟',
        goals: '掌握树和二叉树的基本性质、遍历与重建，理解哈夫曼树、编码和带权路径长度；掌握图的度、连通性、邻接矩阵/表以及 DFS/BFS 遍历。',
        knowledge: '树的结点、边、层与高度；完全二叉树；前中后序遍历；哈夫曼树与 WPL；顶点与边；入度/出度；连通图；邻接矩阵/表；图的 DFS/BFS。',
        notes: '遍历题先定位根与左右子树，哈夫曼树每次合并最小权值；图论题先判断有向/无向，再计算度、边数、存储空间和遍历顺序。',
      },
      programming: {
        basic: ['P1499', 'P1504', 'P1751', 'P2052', 'P2053', 'P2164', 'P2182'],
        advanced: ['P1759', 'P2054', 'P2047', 'P2190', 'P2189'],
      },
    },
    {
      day: 7,
      date: '2026-08-11',
      morning: {
        theme: '动态规划（一）：状态、转移与边界',
        timing: '错题回顾15分钟；递归到DP讲授40分钟；状态定义训练35分钟；阅读程序45分钟；完善程序30分钟；复盘15分钟',
        goals: '理解重叠子问题和最优子结构，能写清状态含义、转移来源、初始边界和计算顺序，完成线性与网格 DP。',
        knowledge: '记忆化搜索；状态定义；转移方程；初始边界；计算顺序；线性 DP；数字三角形；网格路径。',
        notes: '每题先用一句中文定义 dp，再列出最后一步的选择；禁止在状态含义不清时直接套公式。',
      },
      questions: {
        choice: ['csp-s-2019-choice-15', 'csp-s-2020-choice-6', 'gesp-cpp6-2024-12-choice-14', 'gesp-cpp6-2024-03-choice-7', 'gesp-cpp6-2024-03-choice-11', 'gesp-cpp6-2024-03-judgment-2', 'gesp-cpp6-2024-06-choice-12'],
        reading: ['2024-reading-2', '2023-reading-2'],
        completion: ['2023-completion-2'],
      },
      afternoon: {
        theme: '线性 DP、数字三角形与网格 DP',
        timing: '状态定义检测15分钟；线性DP训练45分钟；数字三角形与网格训练65分钟；编辑距离讲评35分钟；过关测20分钟',
        goals: '从最后一步推导转移，掌握爬楼梯、最大子段和、数字三角形、棋盘路径及编辑距离等基础模型。',
        knowledge: '一维状态；二维状态；不可达初值；路径计数；最大/最小代价；编辑距离；滚动数组入门。',
        notes: '基础题先写二维或完整状态并验证边界，提高题再做空间优化；优化前后必须保持相同状态含义。',
      },
      programming: {
        basic: ['P1216', 'P1002', 'P1115'],
        advanced: ['P1048', 'P1508'],
      },
    },
    {
      day: 8,
      date: '2026-08-12',
      morning: {
        theme: '动态规划（二）：背包、序列与状态优化',
        timing: '首日回顾20分钟；背包模型讲授45分钟；序列DP讲授35分钟；阅读程序45分钟；完善程序25分钟；复盘10分钟',
        goals: '掌握 0/1、完全和分组背包的选取差异，理解 LIS、LCS 等序列 DP，并能根据数据范围分析时间与空间优化。',
        knowledge: '0/1 背包；完全背包；分组背包；容量枚举方向；LIS；LCS；滚动数组；状态压缩与优化。',
        notes: '先明确每件物品可选次数，再决定容量循环方向；序列 DP 要区分子数组、子序列与排列。',
      },
      questions: {
        choice: ['csp-s-2023-choice-7', 'csp-s-2025-choice-9', 'csp-s-2025-choice-14', 'gesp-cpp7-2023-12-choice-2', 'gesp-cpp7-2023-12-choice-3', 'gesp-cpp7-2023-12-choice-8', 'gesp-cpp7-2025-03-choice-10', 'gesp-cpp7-2025-03-choice-11', 'gesp-cpp7-2025-03-choice-13', 'gesp-cpp7-2025-03-choice-14'],
        reading: ['csp-s-2024-reading-2'],
        completion: ['csp-s-2020-completion-2', 'csp-s-2023-completion-1'],
      },
      afternoon: {
        theme: '背包变式、LIS/LCS 与综合动态规划',
        timing: '背包模板检测15分钟；0/1与完全背包55分钟；LIS/LCS训练55分钟；分组背包与优化35分钟；过关测20分钟',
        goals: '独立完成背包与序列 DP 经典题，能从朴素状态出发解释一维优化、循环方向和复杂度变化。',
        knowledge: '背包初始化；逆序/正序枚举；最长上升子序列；最长公共子序列；分组选择；复杂度优化。',
        notes: '提高题必须先给出朴素转移，再说明为何能优化；一维背包尤其检查循环方向是否改变“每件物品使用次数”。',
      },
      programming: {
        basic: ['P1048', 'P1049', 'P1616'],
        advanced: ['P1020', 'P1439', 'P1757'],
      },
    },
    {
      day: 9,
      date: '2026-08-13',
      morning: {
        theme: '完整真题模拟与应试策略',
        timing: '考前说明10分钟；完整模拟120分钟；自查10分钟；集中讲评35分钟；个人复盘5分钟',
        goals: '完整经历选择题、阅读程序题和完善程序题的时间分配，根据真实得分定位最后两天最值得补救的知识点。',
        knowledge: '先易后难；标记回看；选项排除；程序状态表；时间分配；交卷检查。',
        notes: '使用完整的2025年 CSP-J 第一轮真题；前8天不拆用2025年题目，以保证模拟有效。',
      },
      questions: {
        choice: Array.from({ length: 15 }, (_, index) => `2025-choice-${index + 1}`),
        reading: ['2025-reading-1', '2025-reading-2', '2025-reading-3'],
        completion: ['2025-completion-1', '2025-completion-2'],
      },
      afternoon: {
        theme: '综合编程与部分分策略',
        timing: '模拟错题回扣35分钟；题意建模25分钟；分层限时编程90分钟；调试复盘20分钟；作业布置10分钟',
        goals: '把程序分析能力迁移到完整编程，训练读题、样例解释、复杂度预估和先拿基础分再扩展完整解。',
        knowledge: '题意翻译；样例解释；复杂度预估；分步实现；部分分；自测与提交检查。',
        notes: '基础题要求完整通过并补边界测试；提高题先写部分分方案，再优化到完整方案。',
      },
      programming: {
        basic: ['P7071'],
        advanced: ['P7910'],
      },
    },
    {
      day: 10,
      date: '2026-08-14',
      morning: {
        theme: '高频知识串联、错题重组与方法定型',
        timing: '闭卷回忆20分钟；高频专题串讲40分钟；选择冲刺30分钟；阅读程序45分钟；完善程序35分钟；总结10分钟',
        goals: '串联数据表示、数据结构、复杂度、搜索、贪心和 DP，固化阅读程序与完善程序的稳定解题流程。',
        knowledge: '阅读程序四步法；关键变量表；最小反例；复杂度；完善程序不变量；跨空验证；错题归因。',
        notes: '采用先独立作答、同伴解释、教师归纳；选择题说明排除理由，程序题留下变量表或最小反例。',
      },
      questions: {
        choice: ['2021-choice-5', '2021-choice-9', '2022-choice-2', '2022-choice-6', '2022-choice-7', '2023-choice-8', '2023-choice-10', '2024-choice-13', '2025-choice-4', '2025-choice-15'],
        reading: ['2021-reading-3', '2022-reading-2'],
        completion: ['2025-completion-2'],
      },
      afternoon: {
        theme: '分层结营测评与后续备赛衔接',
        timing: '真题回扣35分钟；测评说明10分钟；分层限时编程100分钟；讲评与代码复盘25分钟；个人后续计划10分钟',
        goals: '检验限时独立完成能力，形成读题、建模、编码、测试到提交的完整比赛流程，并制定赛前补弱计划。',
        knowledge: '限时策略；分层目标；测试设计；提交检查；错题复训；赛前训练计划。',
        notes: '基础题目标是完整通过；提高题目标是先获得稳定部分分，再完成正确贪心。',
      },
      programming: {
        basic: ['P8813'],
        advanced: ['P9749'],
      },
    },
  ],
};

// 高阶组仍与全班共用一套知识点和真题，但把练习拆成“通关线 + 提高线”。
const highLevelEnhancements = [
  {
    morningPractice: '顺序：15 分钟选择题热身 → 30 分钟共同讲解 → 35 分钟选择题分层练习 → 45 分钟阅读程序 → 25 分钟完善程序 → 10 分钟订正。通关线完成基础与中档题；提高线限时完成后补复杂度、改条件和最小反例。',
    afternoonPractice: '顺序：10 分钟模板检测 → 55 分钟通关编程 → 55 分钟提高线挑战 → 30 分钟真题迁移讲评 → 20 分钟共同过关测。提高线增加字符串解析、二维字符处理和边界测试；可用 LeetCode 125/344 做回文与反转迁移，优先采用东方博宜、洛谷现成题目。',
    choice: ['2019-choice-3', '2019-choice-4', '2020-choice-1', '2020-choice-2', '2024-choice-6', '2024-choice-7', '2024-choice-15', 'gesp-cpp3-2023-12-choice-3', 'gesp-cpp3-2023-12-choice-5', 'gesp-cpp3-2023-12-choice-7', 'csp-s-2019-choice-3', 'csp-s-2019-choice-5', 'csp-s-2019-choice-9'],
    reading: ['2023-reading-1', 'csp-s-2019-reading-1'],
    completion: ['2024-completion-1', 'csp-s-2019-completion-2'],
    basic: ['P1000', 'P1005', 'P1011', 'P1329', 'P1337', 'P1422'],
    advanced: ['P1336', 'P1339', 'P1476'],
  },
  {
    morningPractice: '顺序：20 分钟进制/位运算选择 → 25 分钟手算示范 → 40 分钟阅读程序（逐位记录）→ 30 分钟完善程序 → 35 分钟 GESP/CSP 选择题 → 20 分钟错因归类。提高线必须说明溢出、前导零和边界位。',
    afternoonPractice: '顺序：15 分钟质数与进制模板检测 → 50 分钟通关线枚举 → 60 分钟提高线优化 → 35 分钟 CSP-J 复赛程序题回放 → 20 分钟过关测。先完成原有洛谷题和普及-补充题，再完成 CSP 真题；东方博宜题用于同类模型的额外训练。',
    choice: ['2019-choice-2', '2020-choice-4', '2020-choice-9', '2021-choice-3', '2021-choice-7', '2022-choice-13', '2024-choice-1', '2024-choice-2', '2024-choice-4', '2024-choice-5', 'gesp-cpp3-2023-06-judgment-2', 'gesp-cpp3-2023-06-choice-10', 'gesp-cpp3-2024-09-choice-6', 'csp-s-2020-choice-2', 'csp-s-2020-choice-5', 'csp-s-2020-choice-10'],
    reading: ['2021-reading-1', '2022-reading-1', 'csp-s-2020-reading-1'],
    completion: ['2020-completion-1', 'csp-s-2020-completion-1'],
    basic: ['P1238', 'P1336'],
    advanced: ['P1358', 'P1379'],
  },
  {
    morningPractice: '顺序：15 分钟指针、链表、字符串选择 → 30 分钟下标与地址关系讲解 → 45 分钟阅读程序画状态表 → 30 分钟完善程序 → 30 分钟选择题纠错 → 30 分钟共同讲评。提高线增加链表改指针顺序和复杂度说明。',
    afternoonPractice: '顺序：10 分钟数组/字符串模板检测 → 55 分钟指针、链表与字符串基础题 → 60 分钟频次统计与综合模拟 → 35 分钟阅读代码改错 → 20 分钟过关测。STL 容器与算法统一留到 Day 6 系统讲解。',
    choice: ['2022-choice-3', '2022-choice-4', '2022-choice-11', '2022-choice-14', '2023-choice-3', '2023-choice-4', '2019-choice-6', 'csp-s-2021-choice-10', 'gesp-cpp4-2023-12-judgment-1', 'gesp-cpp4-2023-12-judgment-8', 'gesp-cpp4-2024-03-choice-11', 'csp-s-2021-choice-12'],
    reading: ['2020-reading-1', '2021-reading-2', 'csp-s-2021-reading-2'],
    completion: ['2019-completion-2', '2023-completion-2', 'csp-s-2021-completion-1'],
    basic: ['P1097', 'P1100', 'P1177'],
    advanced: ['P1101', 'P1233', 'P1399'],
  },
  {
    morningPractice: '顺序：20 分钟复杂度与排序选择 → 25 分钟二分不变量讲解 → 35 分钟阅读程序追踪区间 → 25 分钟完善程序 → 35 分钟前缀和与贪心真题 → 20 分钟边界复盘。提高线补充严格弱序、二维前缀和、重复值和答案二分。',
    afternoonPractice: '顺序：15 分钟排序/二分模板检测 → 45 分钟通关线排序与查找 → 40 分钟一维/二维前缀和 → 45 分钟等待时间与区间贪心 → 25 分钟真题讲评 → 10 分钟共同测。每题写明复杂度、前缀数组定义或贪心依据。',
    choice: ['2019-choice-5', '2020-choice-5', '2020-choice-6', '2021-choice-4', '2022-choice-12', '2024-choice-9', '2019-choice-11', '2021-choice-15', '2023-choice-6', 'gesp-cpp4-2023-12-choice-10', 'gesp-cpp4-2023-12-judgment-4', 'gesp-cpp4-2024-03-choice-10', 'csp-s-2022-choice-4', 'csp-s-2022-choice-10', 'csp-s-2022-choice-14'],
    reading: ['2019-reading-3', '2022-reading-3', '2019-reading-2', 'csp-s-2022-reading-1'],
    completion: ['2023-completion-1', '2020-completion-2', 'csp-s-2022-completion-2'],
    basic: ['P1010', 'P1178', 'P1221', 'P2060', 'P1560', 'P1326'],
    advanced: ['P1233', 'P1236', 'P1228', 'P1235', 'P1375'],
  },
  {
    morningPractice: '顺序：30 分钟加法/乘法原理与排列组合 → 20 分钟相邻、捆绑和“至少一个”模型 → 25 分钟递归调用树 → 35 分钟 DFS/回溯 → 35 分钟 BFS 分层与队列 → 35 分钟综合真题。提高线需同时给出计数公式与回溯搜索规模，并解释 BFS 第一次到达即为等权最短距离。',
    afternoonPractice: '顺序：10 分钟计数与枚举辨型 → 45 分钟排列、组合、子集和拆分回溯 → 30 分钟 N 皇后与剪枝 → 55 分钟 BFS 经典题（网格、棋盘、状态最短路）→ 25 分钟讲评 → 15 分钟过关测。',
    choice: [
      '2020-choice-6', '2021-choice-13', '2021-choice-14', '2022-choice-15',
      '2019-choice-7', '2019-choice-12', '2019-choice-13',
      '2020-choice-10', '2020-choice-14', '2020-choice-15',
      '2021-choice-10', '2021-choice-12', '2022-choice-14',
      '2023-choice-6', '2023-choice-14', '2024-choice-3', '2024-choice-14',
      '2025-choice-6', '2025-choice-11',
      'csp-s-2019-choice-6', 'csp-s-2019-choice-8', 'csp-s-2019-choice-9', 'csp-s-2019-choice-10',
      'csp-s-2020-choice-8', 'csp-s-2020-choice-13',
      'csp-s-2021-choice-7', 'csp-s-2021-choice-13', 'csp-s-2021-choice-14',
      'csp-s-2022-choice-9', 'csp-s-2022-choice-10', 'csp-s-2022-choice-11',
      'csp-s-2023-choice-2', 'csp-s-2024-choice-4', 'csp-s-2024-choice-12',
      'csp-s-2025-choice-1', 'csp-s-2025-choice-5', 'csp-s-2025-choice-13',
      'gesp-cpp8-2023-12-judgment-2', 'gesp-cpp8-2024-12-judgment-6',
      'gesp-cpp8-2024-09-choice-7', 'gesp-cpp8-2024-09-choice-8',
    ],
    reading: ['2024-reading-3', '2020-reading-3', 'csp-s-2023-reading-1'],
    completion: ['2024-completion-2', '2022-completion-2'],
    basic: ['P1145', 'P1238', 'P1586', 'P1751', 'P1430', 'P1432'],
    advanced: ['P1358', 'P1379', 'P1441', 'P1442', 'P1443', 'P1541'],
  },
  {
    morningPractice: '顺序：20 分钟 STL 容器与复杂度 → 25 分钟 stack/queue 状态追踪 → 45 分钟中缀、前缀、后缀转换与求值 → 35 分钟二叉树遍历和重建 → 25 分钟哈夫曼树 → 30 分钟真题订正。提高线补充表达式边界和 WPL 计算。',
    afternoonPractice: '顺序：20 分钟树与二叉树性质 → 30 分钟前中后序遍历 → 25 分钟哈夫曼编码 → 30 分钟图的度、连通性与存储 → 45 分钟图的 DFS/BFS → 30 分钟编程题。每题先注明树/图的结构、存储方式和遍历顺序。',
    choice: ['2021-choice-9', '2022-choice-6', '2023-choice-8', '2019-choice-14', '2021-choice-11', '2022-choice-7', '2023-choice-10', '2023-choice-11', '2020-choice-8', '2021-choice-6', '2022-choice-9', '2023-choice-12', '2024-choice-11', 'gesp-cpp6-2024-03-choice-1', 'gesp-cpp6-2024-03-choice-12', 'gesp-cpp7-2024-06-choice-10', 'csp-s-2020-choice-7', 'csp-s-2023-choice-12'],
    reading: [],
    completion: ['csp-s-2024-completion-2'],
    basic: ['P1499', 'P1504', 'P1751', 'P2052', 'P2053', 'P2164', 'P2182'],
    advanced: ['P1759', 'P2054', 'P2047', 'P2190', 'P2189'],
  },
  {
    morningPractice: '顺序：15 分钟递归与重复计算对比 → 30 分钟状态定义示范 → 35 分钟转移与边界训练 → 40 分钟阅读程序填写 dp 表 → 35 分钟编辑距离完善程序 → 25 分钟复盘。提高线需要说明状态依赖和计算顺序。',
    afternoonPractice: '顺序：15 分钟状态定义检测 → 40 分钟线性 DP → 50 分钟数字三角形与网格路径 → 45 分钟编辑距离或双序列基础题 → 20 分钟真题讲评 → 10 分钟过关测。先保证完整状态正确，再做滚动数组。',
    choice: ['csp-s-2019-choice-15', 'csp-s-2020-choice-6', 'gesp-cpp6-2024-12-choice-14', 'gesp-cpp6-2024-03-choice-7', 'gesp-cpp6-2024-03-choice-11', 'gesp-cpp6-2024-03-judgment-2', 'gesp-cpp6-2024-06-choice-12'],
    reading: ['2024-reading-2', '2023-reading-2'],
    completion: ['2023-completion-2'],
    basic: ['P1650', 'P1651', 'P1652', 'P1275'],
    advanced: ['P1653', 'P1778', 'P1779'],
  },
  {
    morningPractice: '顺序：15 分钟首日 DP 回顾 → 35 分钟 0/1、完全、分组背包对比 → 35 分钟容量循环方向实验 → 40 分钟 LIS/LCS 阅读程序 → 35 分钟进阶完善程序 → 20 分钟复盘。提高线增加状态压缩和复杂度优化分析。',
    afternoonPractice: '顺序：15 分钟背包模板检测 → 45 分钟 0/1 与完全背包 → 45 分钟 LIS/LCS → 45 分钟分组背包与综合变式 → 20 分钟真题讲评 → 10 分钟共同测。要求先写朴素转移，再解释一维优化。',
    choice: ['csp-s-2023-choice-7', 'csp-s-2025-choice-9', 'csp-s-2025-choice-14', 'gesp-cpp7-2023-12-choice-2', 'gesp-cpp7-2023-12-choice-3', 'gesp-cpp7-2023-12-choice-8', 'gesp-cpp7-2025-03-choice-10', 'gesp-cpp7-2025-03-choice-11', 'gesp-cpp7-2025-03-choice-13', 'gesp-cpp7-2025-03-choice-14'],
    reading: ['csp-s-2024-reading-2'],
    completion: ['csp-s-2020-completion-2', 'csp-s-2023-completion-1'],
    basic: ['P2072', 'P2073', 'P2074', 'P1216'],
    advanced: ['P1282', 'P1885', 'P1905'],
  },
  {
    morningPractice: '顺序：完整 CSP-J 第一轮模拟（选择 → 阅读程序 → 完善程序）→ 统一计时与自查 → 按错题类型讲评。通关线重点正确率与时间分配；提高线增加 CSP-S/GESP 相关选择、复杂度和改条件追问。',
    afternoonPractice: '顺序：30 分钟模拟错题归因 → 15 分钟模板抽查 → 45 分钟通关线编程 → 70 分钟提高线编程/部分分 → 20 分钟代码复盘。LeetCode 704/70/53 只作错题迁移，不新增转换任务。',
    choice: Array.from({ length: 15 }, (_, index) => `2025-choice-${index + 1}`),
    reading: ['2025-reading-1', '2025-reading-2', '2025-reading-3'],
    completion: ['2025-completion-1', '2025-completion-2'],
    basic: ['P1650', 'P1653'],
    advanced: ['P1778', 'P1780'],
  },
  {
    morningPractice: '顺序：20 分钟错题重组选择 → 30 分钟阅读程序四步法 → 35 分钟完善程序跨空验证 → 35 分钟 GESP/CSP-J/S 混合选择 → 30 分钟个人错题讲解 → 30 分钟赛前清单。提高线必须提交一个最小反例和复杂度说明。',
    afternoonPractice: '顺序：15 分钟随机模板检测 → 45 分钟通关线综合题 → 65 分钟提高线综合/迁移题 → 35 分钟结营测评讲评 → 20 分钟个人后续计划。经典 LeetCode 题只作为课后推荐，正式作业使用已有 OJ 链接。',
    choice: ['2021-choice-5', '2021-choice-9', '2022-choice-2', '2022-choice-6', '2022-choice-7', '2023-choice-8', '2023-choice-10', '2024-choice-13', '2025-choice-4', '2025-choice-15', 'gesp-cpp4-2025-12-choice-1', 'gesp-cpp4-2025-12-choice-6', 'gesp-cpp4-2025-12-choice-13', 'csp-s-2025-choice-2', 'csp-s-2025-choice-6', 'csp-s-2025-choice-10'],
    reading: ['2021-reading-3', '2022-reading-2', 'csp-s-2025-reading-3'],
    completion: ['2025-completion-2', 'csp-s-2025-completion-2'],
    basic: ['P1650', 'P1653'],
    advanced: ['P1778', 'P1780'],
  },
];

const highLevelLuoguPrograms = [
  { basic: ['P1000', 'P1046', 'P5710', 'P5727', 'P1089'], advanced: ['P1101', 'P1597', 'P1603'] },
  { basic: ['P5723'], popular: ['P1563', 'P1068', 'P2563'], advanced: ['P1149', 'P1865'], csp: ['P7071', 'P7909', 'P7072', 'P8814'] },
  { basic: ['P1428', 'P5730'], advanced: ['P1598', 'P1125'] },
  { basic: ['P1177', 'P2249', 'P8218', 'P1223'], advanced: ['P1102', 'P1873', 'P2004', 'P1803'] },
  { basic: ['P1706', 'P1157', 'P1605'], popular: ['P2404', 'P1746', 'P1443', 'P1162'], advanced: ['P1101', 'P1219', 'P1135', 'P2895'] },
  { basic: ['P1449', 'P1981', 'P1305', 'P4913'], popular: ['P1030', 'P1090', 'P5318'], advanced: ['P3916'] },
  { basic: ['P1216', 'P1002', 'P1115'], popular: ['P1048', 'P1049'], advanced: ['P1508'] },
  { basic: ['P1048', 'P1049'], popular: ['P1616', 'P1020', 'P1439'], advanced: ['P1757'] },
  { basic: ['P7071'], advanced: ['P7910'] },
  { basic: ['P8813'], advanced: ['P9749'] },
];

for (const [index, enhancement] of highLevelEnhancements.entries()) {
  const day = trainingCourseTemplate.days[index];
  day.morning.timing = index === 8
    ? '完整模拟120分钟；自查10分钟；集中讲评35分钟；个人复盘15分钟'
    : index === 9
      ? '错题重组20分钟；方法串联25分钟；选择35分钟；阅读40分钟；完善30分钟；赛前计划30分钟'
      : '选择热身15—20分钟；知识点微讲25分钟；选择题35分钟；阅读程序45分钟；完善程序30分钟；讲评25—30分钟';
  day.afternoon.timing = index === 8
    ? '模拟错题归因30分钟；模板抽查15分钟；通关编程45分钟；提高编程70分钟；代码复盘20分钟'
    : index === 9
      ? '模板抽查15分钟；通关编程45分钟；提高编程65分钟；结营讲评35分钟；后续计划20分钟'
      : '模板检测10—15分钟；通关线编程50—55分钟；提高线编程55—65分钟；真题迁移讲评35分钟；共同过关测20分钟';
  day.morning.practice = enhancement.morningPractice;
  day.afternoon.practice = enhancement.afternoonPractice;
  day.questions = {
    choice: [...new Set(enhancement.choice)],
    reading: [...new Set(enhancement.reading)],
    completion: [...new Set(enhancement.completion)],
  };
  day.programming = {
    basic: [...new Set(enhancement.basic)],
    advanced: [...new Set(enhancement.advanced)],
    luoguBasic: [...new Set(highLevelLuoguPrograms[index]?.basic || [])],
    luoguPopular: [...new Set(highLevelLuoguPrograms[index]?.popular || [])],
    luoguAdvanced: [...new Set(highLevelLuoguPrograms[index]?.advanced || [])],
    csp: [...new Set(highLevelLuoguPrograms[index]?.csp || [])],
  };
}

function cloneTrainingCourseTemplate() {
  return JSON.parse(JSON.stringify(trainingCourseTemplate));
}

module.exports = { trainingCourseTemplate, cloneTrainingCourseTemplate };
