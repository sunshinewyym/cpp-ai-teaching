export const whileCourseware = {
  lessonId: 'cpp-basic-10-while',
  topicId: 'while-loop',
  title: 'C++基础篇第10课：while循环',
  version: 'v1',
  card: {
    eyebrow: '算法速懂卡 · v1',
    title: 'while 循环',
    oneSentence: '只要条件还成立，就重复做同一件事；每轮都要让条件朝结束方向变化。',
    elements: [
      { label: '初始值', text: '循环开始前，先给控制变量一个确定的起点。' },
      { label: '循环条件', text: '条件为真才进入循环；第一次检查在循环体之前。' },
      { label: '更新', text: '循环体中改变控制变量，否则可能一直循环。' },
    ],
    syntax: 'while (条件) {\n    重复执行的语句;\n    更新控制变量;\n}',
    order: ['检查条件', '条件为真：执行循环体', '更新控制变量', '回到条件处再次检查', '条件为假：结束循环'],
    whileVsIf: 'if 只判断一次；while 会在每一轮结束后回到条件处，直到条件变为假。',
    template: 'int i = 1;\nwhile (i <= n) {\n    // 处理第 i 个数据\n    i++;\n}',
    infiniteLoop: ['忘记更新控制变量', '更新方向与结束条件相反', '条件本身永远为真', '把更新写在永远不会执行的分支里'],
    example: '从 1 加到 n：用 sum 保存当前总和，每轮把 i 加入 sum，再让 i 增加 1。',
  },
  lessonSummary: {
    eyebrow: '课堂总结 · v1',
    title: '写 while 循环前先问自己六个问题',
    points: [
      ['适合解决什么问题', '当同一段操作需要重复执行，而且重复次数由条件决定时，优先考虑 while。'],
      ['循环初始值', '控制变量第一次取什么值？它是否已经覆盖题目要求的起点？'],
      ['循环条件', '条件为真时继续，还是条件为真时停止？把“继续条件”写清楚再动手。'],
      ['循环变量更新', '每一轮谁在变化、怎样变化？更新后是否一定更接近终止条件？'],
      ['如何避免死循环', '检查条件能否变假，并用最小值、边界值手算一轮。'],
      ['推荐检查顺序', '先看初始值，再看第一次条件，再看循环体，最后看更新和结束。'],
    ],
  },
  problem1004: {
    id: '1004',
    title: '编程求 1×2×3×…×n',
    summary: [
      '题目要求不断进行累乘，结果变量要保存“目前已经乘到哪里”。',
      '用循环变量表示当前要乘的数，循环范围覆盖 1 到 n。',
      '每一轮把当前数乘入结果，再进入下一轮。',
      '结果变量的初始值必须适合乘法；先想清楚“还没有开始乘”时应保存什么。',
    ],
    templateId: 'while-product-basic',
  },
  practice: {
    defaultCount: 5,
    allowedCounts: [3, 5, 10],
  },
  debugTemplate: '// 在这里填写你的 while 循环代码\n',
};

export const coursewareModules = new Set([
  'card',
  'summary',
  'practice',
  'problem-summary',
  'coach',
  'debug',
  'edge-case',
]);

