// 面向刚学完 C++ 基础、准备 GESP 3—4 级和 CSP-J 初赛的进阶组模板。
const session = (theme, knowledge, practice, goals) => ({
  theme,
  timing: '知识讲授45分钟；针对性练习45分钟；讲评与订正30分钟；迁移练习30分钟；总结10分钟',
  goals,
  knowledge,
  practice,
  notes: '练习先独立完成，再用错题归因表记录“概念、边界、读题、实现”中的主要问题。',
});

const trainingCourseProgressTemplate = {
  title: 'C++ 算法集训十日 · 进阶组',
  summary: '适合刚学完 C++ 基础的学生，围绕 GESP 3—4 级与 CSP-J/S 初赛基础能力，上午夯实知识与真题分析，下午进行东方博宜 OJ 编程实战和迁移训练。',
  days: [
    {
      day: 1, date: '2026-08-03',
      morning: session('std::string 专题与字符处理', 'std::string 常用函数；ASCII 码；大小写与数字字符转换；字符统计与子串边界。', 'GESP C++3级字符串专项：gesp-cpp3-2023-12-choice-3、5、7；CSP-J 真题：2020-choice-3、2022-choice-14；阅读 2020-reading-1；完善 2019-completion-2。', '能用 string 完成查找、截取、替换和统计，并能在阅读程序时跟踪字符串下标。'),
      questions: { choice: ['gesp-cpp3-2023-12-choice-3', 'gesp-cpp3-2023-12-choice-5', 'gesp-cpp3-2023-12-choice-7', '2020-choice-3', '2022-choice-14', 'csp-s-2019-choice-3'], reading: ['2020-reading-1', 'csp-s-2019-reading-1'], completion: ['2019-completion-2', 'csp-s-2019-completion-2'] },
      afternoon: session('字符串综合编程与双指针', '回文判断；字符频次；双指针遍历；输入中空格与换行的处理。', '东方博宜 OJ：P1097、P1100（基础）；P1131、P1336（提高）。先完成字符统计，再完成回文与子串综合题。', '能够把字符串题拆成读取、扫描、统计、输出四个模块，并设计空串、重复字符和大小写边界样例。'),
      programming: { basic: ['P1097', 'P1100'], advanced: ['P1131', 'P1336'] },
    },
    {
      day: 2, date: '2026-08-04',
      morning: session('进制转换与位运算基础', 'N 进制与十进制互转；短除法与按权展开；按位与、或、异或、左移、右移；补码直觉。', 'GESP C++3级专项：gesp-cpp3-2023-06-judgment-2、gesp-cpp3-2023-06-choice-10、gesp-cpp3-2024-09-choice-6；CSP-J 真题：2021-choice-7、2022-choice-13；阅读 2021-reading-1；完善 2020-completion-1。', '能手算并编程完成常见进制转换，理解位运算在取位、清零、判断奇偶中的作用。'),
      questions: { choice: ['gesp-cpp3-2023-06-judgment-2', 'gesp-cpp3-2023-06-choice-10', 'gesp-cpp3-2024-09-choice-6', '2021-choice-7', '2022-choice-13', 'csp-s-2020-choice-5'], reading: ['2021-reading-1', 'csp-s-2020-reading-1'], completion: ['2020-completion-1', 'csp-s-2020-completion-1'] },
      afternoon: session('进制转换与位运算编程', '十进制转任意进制；十六进制字符处理；掩码、移位和二进制位提取。', '洛谷 CSP-J 复赛：P7071、P7909（第一题）；P7072、P8814（第二题）。先完成位运算与区间取模，再完成计数和质因数分解。', '掌握“除基取余”和“按位取位”两类模板，避免边界位、前导零和字符映射错误。'),
      programming: { basic: [], advanced: [] },
    },
    {
      day: 3, date: '2026-08-05',
      morning: session('三大基础排序与 std::sort', '冒泡、选择、插入排序；稳定性；std::sort 与自定义 cmp；多关键字排序。', 'GESP C++4级专项：gesp-cpp4-2023-12-judgment-1、8、gesp-cpp4-2024-03-choice-11；CSP-J 真题：2022-choice-12、2023-choice-10；阅读 2022-reading-3；完善 2023-completion-1。', '能手算排序过程，判断稳定性与复杂度，并能读懂比较函数和排序后的相对位置。'),
      questions: { choice: ['gesp-cpp4-2023-12-judgment-1', 'gesp-cpp4-2023-12-judgment-8', 'gesp-cpp4-2024-03-choice-11', '2022-choice-12', '2023-choice-10', 'csp-s-2021-choice-8'], reading: ['2022-reading-3', 'csp-s-2021-reading-2'], completion: ['2023-completion-1', 'csp-s-2021-completion-1'] },
      afternoon: session('排序实战与规则排序', '整数、字符串和结构化数据排序；排序后去重；按多个关键字稳定输出。', '东方博宜 OJ：P1010、P1178（基础）；P1233、P1236（提高）。基础题重正确性，提高题补充复杂度和稳定性说明。', '能根据题目要求设计 cmp，处理相等关键字、逆序和空数据等边界。'),
      programming: { basic: ['P1010', 'P1178'], advanced: ['P1233', 'P1236'] },
    },
    {
      day: 4, date: '2026-08-06',
      morning: session('C++ 与 STL 常用容器', 'vector 操作与迭代器；pair；set 去重排序；map 映射与频次统计；常见复杂度。', 'GESP C++4级专项：gesp-cpp4-2023-12-choice-10、gesp-cpp4-2023-12-judgment-4、gesp-cpp4-2024-03-choice-10；CSP-J 真题：2020-choice-11、2022-choice-4；阅读 2021-reading-2；完善 2019-completion-2。', '能选用合适容器解决去重、映射和频次问题，并能从操作方式判断大致复杂度。'),
      questions: { choice: ['gesp-cpp4-2023-12-choice-10', 'gesp-cpp4-2023-12-judgment-4', 'gesp-cpp4-2024-03-choice-10', '2020-choice-11', '2022-choice-4', 'csp-s-2022-choice-10'], reading: ['2021-reading-2', 'csp-s-2022-reading-1'], completion: ['2019-completion-2', 'csp-s-2022-completion-2'] },
      afternoon: session('STL 容器综合编程', 'set 去重计数；map 统计词频；vector 排序与遍历；容器嵌套的读写。', '东方博宜 OJ：P1486、P1490（基础）；P1487、P1759（提高）。要求写出每个容器的键、值和遍历方式。', '能把“出现次数、映射关系、排序输出”转化为 STL 代码，减少重复造轮子。'),
      programming: { basic: ['P1486', 'P1490'], advanced: ['P1487', 'P1759'] },
    },
    {
      day: 5, date: '2026-08-07',
      morning: session('递归思想与分治入门', '递归两大要素；阶乘、斐波那契、汉诺塔模型；递归与二分查找；调用栈和边界。', 'GESP C++4级专项：gesp-cpp4-2023-06-judgment-2、gesp-cpp4-2024-12-choice-9、gesp-cpp4-2024-12-judgment-5；CSP-J 真题：2021-choice-13、2022-choice-15；阅读 2020-reading-3；完善 2024-completion-2。', '能写出有出口、有缩小规模过程的递归函数，并能画调用树分析返回值。'),
      questions: { choice: ['gesp-cpp4-2023-06-judgment-2', 'gesp-cpp4-2024-12-choice-9', 'gesp-cpp4-2024-12-judgment-5', '2021-choice-13', '2022-choice-15', 'csp-s-2023-choice-12'], reading: ['2020-reading-3', 'csp-s-2023-reading-1'], completion: ['2024-completion-2', 'csp-s-2023-completion-1'] },
      afternoon: session('递归、二分与分治编程', '递归求解；二分查找；递归边界；递归深度与复杂度；从递归到迭代。', '东方博宜 OJ：P1145、P1238（基础）；P1307、P1367（提高）。先手写递归调用树，再完成代码和边界测试。', '理解递归不是“自动循环”，能够判断出口缺失、参数不变和栈溢出的风险。'),
      programming: { basic: ['P1145', 'P1238'], advanced: ['P1307', 'P1367'] },
    },
    {
      day: 6, date: '2026-08-10',
      morning: session('栈与队列及表达式求值', 'stack 后进先出；queue 先进先出；括号匹配；中缀、后缀表达式转换与求值。', 'GESP C++6级专项：gesp-cpp6-2024-12-choice-4、11、12；CSP-J 真题：2020-choice-11、2022-choice-6；阅读 2022-reading-1；完善 2022-completion-2。', '能根据出入顺序判断栈队列状态，掌握括号匹配和后缀表达式求值的基本流程。'),
      questions: { choice: ['gesp-cpp6-2024-12-choice-4', 'gesp-cpp6-2024-12-choice-11', 'gesp-cpp6-2024-12-choice-12', '2020-choice-11', '2022-choice-6', 'csp-s-2024-choice-6'], reading: ['2022-reading-1', 'csp-s-2024-reading-2'], completion: ['2022-completion-2', 'csp-s-2024-completion-2'] },
      afternoon: session('栈队列综合编程', '单调处理的直觉；括号匹配；表达式扫描；队列模拟与状态维护。', '东方博宜 OJ：P1499、P1504（基础）；P1507、P1569（提高）。程序阅读重点记录每次入栈、出栈、入队和出队后的状态。', '能够用栈或队列准确模拟过程，并处理空栈、连续括号和多位数字。'),
      programming: { basic: ['P1499', 'P1504'], advanced: ['P1507', 'P1569'] },
    },
    {
      day: 7, date: '2026-08-11',
      morning: session('深度优先搜索（DFS）与回溯', 'DFS 搜索树；访问标记；选择—递归—撤销；排列组合；剪枝与搜索顺序。', 'GESP C++5级专项：gesp-cpp5-2023-12-choice-2、5、12；CSP-J 真题：2021-choice-14、2024-choice-13；阅读 2024-reading-3；完善 2024-completion-1。', '能写出排列、组合和简单网格 DFS，明确状态变量和回溯恢复位置。'),
      questions: { choice: ['gesp-cpp5-2023-12-choice-2', 'gesp-cpp5-2023-12-choice-5', 'gesp-cpp5-2023-12-choice-12', '2021-choice-14', '2024-choice-13', 'csp-s-2025-choice-9'], reading: ['2024-reading-3', 'csp-s-2025-reading-1'], completion: ['2024-completion-1', 'csp-s-2025-completion-1'] },
      afternoon: session('排列组合与搜索树', '全排列；组合生成；搜索树节点数；visited 数组；路径恢复和基础剪枝。', '东方博宜 OJ：P1586、P1308（基础）；P1360、P1430（提高）。提高题要求先估算搜索规模，再选择剪枝点。', '掌握 DFS 模板的变量含义，能够定位重复访问、忘记撤销和出口错误。'),
      programming: { basic: ['P1586', 'P1308'], advanced: ['P1360', 'P1430'] },
    },
    {
      day: 8, date: '2026-08-12',
      morning: session('DFS 在网格图中的应用', '方向数组；边界检查；连通块；网格遍历；标记与恢复；二维状态。', 'GESP C++5级专项：gesp-cpp5-2023-12-choice-7、15、judgment-1；CSP-J 真题：2021-choice-6、2022-choice-8；阅读 2020-reading-3；完善 2022-completion-2。', '能把迷宫、岛屿、连通块问题抽象为网格 DFS，并正确处理边界与访问标记。'),
      questions: { choice: ['gesp-cpp5-2023-12-choice-7', 'gesp-cpp5-2023-12-choice-15', 'gesp-cpp5-2023-12-judgment-1', '2021-choice-6', '2022-choice-8', 'csp-s-2023-choice-4'], reading: ['2020-reading-3', 'csp-s-2023-reading-2'], completion: ['2022-completion-2', 'csp-s-2023-completion-2'] },
      afternoon: session('网格图遍历与连通块', '迷宫寻路；连通块数量与大小；方向数组；不可达判断；递归深度。', '东方博宜 OJ：P1430、P1432（基础）；P1433、P1443（提高）。要求绘制网格、标记访问顺序，并验证四条边界。', '能够从图形题提取坐标状态，避免越界、重复计数和错误回溯。'),
      programming: { basic: ['P1430', 'P1432'], advanced: ['P1433', 'P1443'] },
    },
    {
      day: 9, date: '2026-08-13',
      morning: session('广度优先搜索（BFS）与层序遍历', 'queue 实现 BFS；分层扩展；距离数组；无权图最短路；DFS 与 BFS 的适用区别。', 'GESP C++5级专项：gesp-cpp5-2023-12-choice-11、gesp-cpp5-2024-12-choice-15、gesp-cpp5-2024-03-choice-7；CSP-J 真题：2021-choice-6、2022-choice-9；阅读 2023-reading-1；完善 2025-completion-1。', '能识别最少步数、层序遍历和无权最短路模型，掌握入队时标记和距离更新。'),
      questions: { choice: ['gesp-cpp5-2023-12-choice-11', 'gesp-cpp5-2024-12-choice-15', 'gesp-cpp5-2024-03-choice-7', '2021-choice-6', '2022-choice-9', 'csp-s-2024-choice-12'], reading: ['2023-reading-1', 'csp-s-2024-reading-3'], completion: ['2025-completion-1', 'csp-s-2024-completion-1'] },
      afternoon: session('BFS 最短路与综合搜索', '迷宫最短路；状态转移；层数统计；不可达处理；搜索算法复杂度比较。', '东方博宜 OJ：P1751、P1443（基础）；P1380、P1541（提高）。基础题先实现最短步数，提高题增加状态和路径恢复。', '能够根据“最少次数/最短距离”选择 BFS，并用距离数组证明第一次到达的层数。'),
      programming: { basic: ['P1751', 'P1443'], advanced: ['P1380', 'P1541'] },
    },
    {
      day: 10, date: '2026-08-14',
      morning: session('全真模拟与冲刺复盘', '综合回顾 string、进制、排序、STL、递归、栈队列、DFS、BFS；选择题审题与排除；程序阅读四步法。', 'GESP C++4级冲刺：gesp-cpp4-2025-12-choice-1、6、13；CSP-J 真题：2025-choice-1、5、10；阅读 2025-reading-1；完善 2025-completion-1。', '完成一轮小型模拟，检验知识迁移、时间分配和阅读程序的稳定性，形成个人赛前补弱清单。'),
      questions: { choice: ['gesp-cpp4-2025-12-choice-1', 'gesp-cpp4-2025-12-choice-6', 'gesp-cpp4-2025-12-choice-13', '2025-choice-1', '2025-choice-5', '2025-choice-10', 'csp-s-2025-choice-15'], reading: ['2025-reading-1', 'csp-s-2025-reading-3'], completion: ['2025-completion-1', 'csp-s-2025-completion-2'] },
      afternoon: session('综合编程测评与结营复盘', '读题建模；样例验证；复杂度预估；分步实现；自测与提交；错题归因和后续学习计划。', '东方博宜 OJ：P1650、P1653（基础）；P1778、P1780（提高）。限时完成一题基础题和一题迁移题，结尾集中复盘。', '完成从读题、建模、编码、测试到提交的完整流程，知道下一阶段应继续补哪一类题。'),
      programming: { basic: ['P1650', 'P1653'], advanced: ['P1778', 'P1780'] },
    },
  ],
};

const progressLuoguPrograms = [
  { basic: ['P1000', 'P1046', 'P5710'], advanced: ['P5727', 'P1089'] },
  { basic: ['P7071', 'P7909'], advanced: ['P7072', 'P8814'] },
  { basic: ['P1428', 'P5730'], advanced: ['P1598', 'P1125'] },
  { basic: ['P1177', 'P2249'], advanced: ['P1102', 'P1873'] },
  { basic: ['P1706', 'P1605'], advanced: ['P1101', 'P1219'] },
  { basic: ['P1746', 'P1443'], advanced: ['P1135', 'P1162'] },
  { basic: ['P8218', 'P1223'], advanced: ['P2004', 'P1803'] },
  { basic: ['P1216', 'P1002'], advanced: ['P1048', 'P1508'] },
  { basic: ['P7071'], advanced: ['P7910'] },
  { basic: ['P8813'], advanced: ['P9749'] },
];

for (const [index, day] of trainingCourseProgressTemplate.days.entries()) {
  const luogu = progressLuoguPrograms[index] || { basic: [], advanced: [] };
  day.programming.luoguBasic = [...luogu.basic];
  day.programming.luoguAdvanced = [...luogu.advanced];
}

function cloneTrainingCourseProgressTemplate() {
  return JSON.parse(JSON.stringify(trainingCourseProgressTemplate));
}

module.exports = { trainingCourseProgressTemplate, cloneTrainingCourseProgressTemplate };
