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
        theme: '数组、字符串、指针与 STL 基础',
        timing: '错题回顾20分钟；概念讲授50分钟；选择真题30分钟；阅读程序45分钟；完善程序25分钟；复盘10分钟',
        goals: '掌握数组下标、字符串长度和字符编码，理解指针保存地址的含义，熟悉常用 STL 工具。',
        knowledge: '数组下标；字符编码；指针与地址；vector；string；sort；unique；频次数组和映射表。',
        notes: '阅读字符串程序时画“下标—字符—当前状态”表，重点检查越界、字符与整数混用以及 size() 的类型。',
      },
      questions: {
        choice: ['2022-choice-3', '2022-choice-4', '2022-choice-10', '2022-choice-11', '2022-choice-14', '2023-choice-3', '2023-choice-4'],
        reading: ['2020-reading-1', '2021-reading-2'],
        completion: ['2019-completion-2'],
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
        choice: ['2019-choice-5', '2020-choice-5', '2020-choice-6', '2021-choice-4', '2022-choice-12', '2024-choice-9'],
        reading: ['2019-reading-3', '2022-reading-3'],
        completion: ['2023-completion-1'],
      },
      afternoon: {
        theme: '排序、查找与答案二分',
        timing: '上午真题回扣35分钟；模型讲解25分钟；独立编程90分钟；调试复盘20分钟；小测与作业10分钟',
        goals: '熟练处理排序、重复元素和二分边界，能够根据数据范围选择暴力、排序或二分方案。',
        knowledge: '标准排序；lower_bound 思想；数对计数；二分答案；复杂度比较。',
        notes: '提高题必须说明单调性，并设计答案在最左、最右及不存在的测试样例。',
      },
      programming: {
        basic: ['P1177', 'P2249'],
        advanced: ['P1102', 'P1873'],
      },
    },
    {
      day: 5,
      date: '2026-08-07',
      morning: {
        theme: '递归、DFS、回溯与阶段检测',
        timing: '知识回顾15分钟；递归与搜索讲授45分钟；阶段检测75分钟；讲评35分钟；个人总结10分钟',
        goals: '理解递归出口、参数和返回过程，掌握 DFS 的“选择—递归—撤销”结构，并通过检测确认第一阶段漏洞。',
        knowledge: '递归出口；调用栈；DFS；访问标记；搜索边界；回溯恢复；基础剪枝。',
        notes: '阶段检测按正确率、用时和错误类型分层，重点检查无出口、状态未恢复和 visited 标记时机。',
      },
      questions: {
        choice: ['2020-choice-6', '2021-choice-13', '2021-choice-14', '2022-choice-15'],
        reading: ['2024-reading-3', '2020-reading-3'],
        completion: ['2024-completion-2'],
      },
      afternoon: {
        theme: 'DFS、迷宫与排列组合搜索',
        timing: '上午真题回扣35分钟；搜索模板讲解25分钟；独立编程90分钟；调试复盘20分钟；阶段作业10分钟',
        goals: '独立写出网格 DFS 和全排列回溯，理解全局答案、路径状态、可行性判断和搜索顺序。',
        knowledge: '网格搜索；方向数组；全排列；组合选择；路径状态；搜索树与剪枝。',
        notes: '先画搜索树再写代码；提高题分析搜索顺序、剪枝效果和最坏复杂度。',
      },
      programming: {
        basic: ['P1706', 'P1605'],
        advanced: ['P1101', 'P1219'],
      },
    },
    {
      day: 6,
      date: '2026-08-10',
      morning: {
        theme: '知识恢复、队列、BFS 与图树基础',
        timing: '间隔回忆测验25分钟；图树与队列讲授45分钟；选择真题30分钟；阅读程序40分钟；完善程序30分钟；复盘10分钟',
        goals: '恢复第一阶段知识，理解队列、图和树的基础性质，掌握 BFS 分层扩展和最短步数模型。',
        knowledge: '队列先进先出；图的点和边；树的基本性质；BFS 分层；最短步数；DFS 与 BFS 对比。',
        notes: '重点检查入队时标记、重复访问、起点距离和边界判断；边权相同时才能直接用 BFS 求最短路。',
      },
      questions: {
        choice: ['2020-choice-8', '2020-choice-11', '2021-choice-6', '2021-choice-14', '2022-choice-8', '2022-choice-9', '2024-choice-11'],
        reading: ['2020-reading-3'],
        completion: ['2022-completion-2'],
      },
      afternoon: {
        theme: 'BFS 最短路与连通块',
        timing: '上午真题回扣35分钟；BFS 模型讲解25分钟；独立编程90分钟；调试复盘20分钟；小测与作业10分钟',
        goals: '用队列保存待扩展状态，掌握网格最短路、层数记录和连通块搜索，处理多种状态转换。',
        knowledge: '队列状态；距离数组；连通块；多方向移动；入队标记；不可达状态。',
        notes: '提高题必须解释入队时标记为什么能避免重复，防止把 DFS 的第一次到达误当成最短路。',
      },
      programming: {
        basic: ['P1746', 'P1443'],
        advanced: ['P1135', 'P1162'],
      },
    },
    {
      day: 7,
      date: '2026-08-11',
      morning: {
        theme: '贪心、前缀和与区间处理',
        timing: '错题回顾20分钟；概念讲授50分钟；选择真题30分钟；阅读程序45分钟；完善程序25分钟；复盘10分钟',
        goals: '理解局部最优选择的论证方法，掌握排序后贪心、一维和二维前缀和以及区间处理。',
        knowledge: '交换论证；反例；区间选择；哈夫曼合并；一维前缀和；二维前缀和；双指针。',
        notes: '贪心题写清每次选什么以及为什么不会更差；前缀和题先定义下标和区间含义。',
      },
      questions: {
        choice: ['2019-choice-11', '2021-choice-11', '2021-choice-15', '2023-choice-6'],
        reading: ['2019-reading-2'],
        completion: ['2020-completion-2'],
      },
      afternoon: {
        theme: '区间统计与贪心建模',
        timing: '上午真题回扣35分钟；模型讲解25分钟；独立编程90分钟；调试复盘20分钟；小测与作业10分钟',
        goals: '把重复区间求和优化为前缀和，掌握典型排序贪心，并能说明贪心选择的正确性。',
        knowledge: '区间和；二维容斥；等待时间排序；活动选择；覆盖区间；反例构造。',
        notes: '提高题提交复杂度分析与正确性解释，重点检查前缀数组偏移、容斥符号和排序关键字。',
      },
      programming: {
        basic: ['P8218', 'P1223'],
        advanced: ['P2004', 'P1803'],
      },
    },
    {
      day: 8,
      date: '2026-08-12',
      morning: {
        theme: '动态规划：状态、转移与边界',
        timing: '错题回顾20分钟；概念讲授50分钟；选择真题25分钟；阅读程序50分钟；完善程序25分钟；复盘10分钟',
        goals: '理解动态规划的状态定义、转移来源、初始边界和计算顺序，从递归与重复子问题过渡到 DP。',
        knowledge: '状态定义；转移方程；初始边界；计算顺序；线性 DP；网格 DP；LCS；编辑距离。',
        notes: '所有 DP 题先用中文写清 dp 含义再写转移，重点排查不可达初值、边界和计算顺序。',
      },
      questions: {
        choice: ['2019-choice-7', '2020-choice-6', '2021-choice-13', '2022-choice-15', '2023-choice-6'],
        reading: ['2024-reading-2', '2023-reading-2'],
        completion: ['2023-completion-2'],
      },
      afternoon: {
        theme: '线性、网格与背包动态规划',
        timing: '上午真题回扣35分钟；状态设计示范25分钟；独立编程90分钟；调试复盘20分钟；小测与作业10分钟',
        goals: '从最后一步推导转移，掌握数字三角形、棋盘路径和 0/1 背包基础模型，并进行模型迁移。',
        knowledge: '数字三角形；棋盘路径；0/1 背包；二维状态；滚动数组；一维空间优化。',
        notes: '基础题先保证二维状态正确；提高题再考虑空间优化，不以技巧替代正确建模。',
      },
      programming: {
        basic: ['P1216', 'P1002'],
        advanced: ['P1048', 'P1508'],
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
    morningPractice: '顺序：15 分钟字符串/数组选择 → 30 分钟下标与 STL 快速讲解 → 45 分钟阅读程序画状态表 → 30 分钟完善程序 → 30 分钟选择题纠错 → 30 分钟共同讲评。提高线增加比较函数合法性和复杂度说明。',
    afternoonPractice: '顺序：10 分钟 sort/vector 模板检测 → 55 分钟统计与字符串基础题 → 60 分钟多关键字与去重挑战 → 35 分钟阅读代码改错 → 20 分钟过关测。可选 LeetCode 26/88，优先使用 OJ 中的排序与数组题。',
    choice: ['2022-choice-3', '2022-choice-4', '2022-choice-10', '2022-choice-11', '2022-choice-14', '2023-choice-3', '2023-choice-4', 'gesp-cpp4-2023-12-judgment-1', 'gesp-cpp4-2023-12-judgment-8', 'gesp-cpp4-2024-03-choice-11', 'csp-s-2021-choice-3', 'csp-s-2021-choice-8', 'csp-s-2021-choice-12'],
    reading: ['2020-reading-1', '2021-reading-2', 'csp-s-2021-reading-2'],
    completion: ['2019-completion-2', 'csp-s-2021-completion-1'],
    basic: ['P1097', 'P1100', 'P1177'],
    advanced: ['P1101', 'P1233', 'P1399'],
  },
  {
    morningPractice: '顺序：20 分钟复杂度与排序选择 → 25 分钟二分不变量讲解 → 40 分钟阅读程序追踪区间 → 30 分钟完善程序 → 35 分钟真题选择 → 20 分钟边界复盘。提高线补充严格弱序、重复值和答案二分。',
    afternoonPractice: '顺序：15 分钟排序/二分模板检测 → 50 分钟通关线排序题 → 60 分钟提高线查找与贪心迁移 → 35 分钟真题讲评 → 20 分钟共同测。LeetCode 704/34 只作为概念迁移，统一用 OJ 题提交。',
    choice: ['2019-choice-5', '2020-choice-5', '2020-choice-6', '2021-choice-4', '2022-choice-12', '2024-choice-9', 'gesp-cpp4-2023-12-choice-10', 'gesp-cpp4-2023-12-judgment-4', 'gesp-cpp4-2024-03-choice-10', 'csp-s-2022-choice-4', 'csp-s-2022-choice-10', 'csp-s-2022-choice-14'],
    reading: ['2019-reading-3', '2022-reading-3', 'csp-s-2022-reading-1'],
    completion: ['2023-completion-1', 'csp-s-2022-completion-2'],
    basic: ['P1010', 'P1178', 'P1221'],
    advanced: ['P1233', 'P1236', 'P1326'],
  },
  {
    morningPractice: '顺序：15 分钟递归选择 → 30 分钟调用树示范 → 45 分钟阅读程序手画调用栈 → 30 分钟完善程序补出口 → 35 分钟 DFS 选择 → 25 分钟错题归因。提高线需估算搜索规模并给出剪枝理由。',
    afternoonPractice: '顺序：10 分钟 DFS 模板检测 → 50 分钟排列/组合通关题 → 65 分钟剪枝与迷宫提高题 → 35 分钟搜索真题讲评 → 20 分钟过关测。可用 LeetCode 78/46 作排列组合迁移，系统内优先做 OJ 等价题。',
    choice: ['2020-choice-6', '2021-choice-13', '2021-choice-14', '2022-choice-15', 'gesp-cpp4-2023-06-judgment-2', 'gesp-cpp4-2024-12-choice-9', 'gesp-cpp4-2024-12-judgment-5', 'csp-s-2023-choice-2', 'csp-s-2023-choice-7', 'csp-s-2023-choice-12'],
    reading: ['2024-reading-3', '2020-reading-3', 'csp-s-2023-reading-1'],
    completion: ['2024-completion-2', 'csp-s-2023-completion-1'],
    basic: ['P1145', 'P1238', 'P1307'],
    advanced: ['P1367', 'P1358', 'P1379'],
  },
  {
    morningPractice: '顺序：20 分钟栈队列选择 → 25 分钟状态变化示范 → 45 分钟阅读程序逐步记录入出栈 → 30 分钟完善程序 → 30 分钟图/BFS 选择 → 30 分钟讲评。提高线补充单调结构和复杂度比较。',
    afternoonPractice: '顺序：15 分钟 stack/queue 模板检测 → 50 分钟括号与队列通关题 → 60 分钟表达式或状态模拟提高题 → 35 分钟程序题复盘 → 20 分钟过关测。LeetCode 20/150 可作为表达式迁移，优先采用 OJ 题。',
    choice: ['2020-choice-8', '2020-choice-11', '2021-choice-6', '2021-choice-14', '2022-choice-8', '2022-choice-9', '2024-choice-11', 'gesp-cpp6-2024-12-choice-4', 'gesp-cpp6-2024-12-choice-11', 'gesp-cpp6-2024-12-choice-12', 'csp-s-2024-choice-3', 'csp-s-2024-choice-6', 'csp-s-2024-choice-10'],
    reading: ['2020-reading-3', 'csp-s-2024-reading-2'],
    completion: ['2022-completion-2', 'csp-s-2024-completion-2'],
    basic: ['P1499', 'P1504', 'P1751'],
    advanced: ['P1507', 'P1569', 'P1443'],
  },
  {
    morningPractice: '顺序：15 分钟前缀和/贪心选择 → 25 分钟反例示范 → 40 分钟阅读程序检查排序与累计量 → 30 分钟完善程序 → 35 分钟真题选择 → 25 分钟讲评。提高线必须写出贪心依据或反例。',
    afternoonPractice: '顺序：10 分钟前缀和/排序模板检测 → 50 分钟区间统计通关题 → 65 分钟贪心与前缀和综合题 → 35 分钟部分分策略讲评 → 20 分钟过关测。可参考 LeetCode 435/560，尽量使用 OJ 等价题。',
    choice: ['2019-choice-11', '2021-choice-11', '2021-choice-15', '2023-choice-6', 'gesp-cpp5-2023-12-choice-2', 'gesp-cpp5-2023-12-choice-5', 'gesp-cpp5-2023-12-choice-12', 'csp-s-2025-choice-4', 'csp-s-2025-choice-9', 'csp-s-2025-choice-13'],
    reading: ['2019-reading-2', 'csp-s-2025-reading-1'],
    completion: ['2020-completion-2', 'csp-s-2025-completion-1'],
    basic: ['P2060', 'P1560', 'P1326'],
    advanced: ['P1228', 'P1235', 'P1375'],
  },
  {
    morningPractice: '顺序：20 分钟 DP 选择 → 30 分钟状态定义示范 → 45 分钟阅读程序填写 dp 表 → 30 分钟完善程序补转移 → 30 分钟模型辨析 → 25 分钟复盘。提高线增加状态变化、空间优化和数据范围分析。',
    afternoonPractice: '顺序：15 分钟二维 DP 模板检测 → 50 分钟通关线数字三角形/背包 → 60 分钟提高线网格与状态变式 → 35 分钟真题讲评 → 20 分钟共同测。LeetCode 70/53 作为热身，正式训练使用 OJ 题。',
    choice: ['2019-choice-7', '2020-choice-6', '2021-choice-13', '2022-choice-15', '2023-choice-6', 'gesp-cpp5-2023-12-choice-7', 'gesp-cpp5-2023-12-choice-15', 'gesp-cpp5-2023-12-judgment-1', 'csp-s-2023-choice-4', 'csp-s-2023-choice-8', 'csp-s-2023-choice-12'],
    reading: ['2024-reading-2', '2023-reading-2', 'csp-s-2023-reading-2'],
    completion: ['2023-completion-2', 'csp-s-2023-completion-1'],
    basic: ['P1216', 'P1002', 'P1650'],
    advanced: ['P1779', 'P1282', 'P1546'],
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
  { basic: ['P1177', 'P2249'], advanced: ['P1102', 'P1873'] },
  { basic: ['P1706', 'P1605'], advanced: ['P1101', 'P1219'] },
  { basic: ['P1746', 'P1443'], advanced: ['P1135', 'P1162'] },
  { basic: ['P8218', 'P1223'], advanced: ['P2004', 'P1803'] },
  { basic: ['P1216', 'P1002'], advanced: ['P1048', 'P1508'] },
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
