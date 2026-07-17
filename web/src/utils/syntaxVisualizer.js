export const syntaxTopics = [
  { id: 'variables', icon: '🔢', label: '变量与表达式', group: '基础' },
  { id: 'input', icon: '⌨️', label: 'cin 与 getline', group: '字符串' },
  { id: 'common-functions', icon: '🧰', label: '常用函数', group: '函数' },
  { id: 'branch', icon: '🔀', label: '条件判断', group: '基础' },
  { id: 'for-loop', icon: '🔁', label: 'for 循环', group: '循环' },
  { id: 'while-loop', icon: '⏳', label: 'while / do-while', group: '循环' },
  { id: 'flow-control', icon: '⛔', label: 'break / continue', group: '循环' },
  { id: 'nested-loop', icon: '🧮', label: '嵌套循环', group: '循环' },
  { id: 'digits', icon: '🔟', label: '数位分离', group: '基础' },
  { id: 'array', icon: '🧱', label: '一维数组', group: '数组' },
  { id: 'array-move', icon: '↔️', label: '数组移动', group: '数组' },
  { id: 'matrix', icon: '▦', label: '二维数组', group: '数组' },
  { id: 'string', icon: '🔤', label: 'string 与字符数组', group: '字符串' },
  { id: 'vector', icon: '📦', label: 'vector', group: '组织' },
  { id: 'function', icon: '🧩', label: '函数传参', group: '函数' },
  { id: 'scope', icon: '🔎', label: '作用域', group: '函数' },
  { id: 'struct', icon: '🗂️', label: '结构体', group: '组织' },
  { id: 'pointer', icon: '👉', label: '指针与引用', group: '内存' },
];

const topic = (title, summary, visual, code, steps, takeaway, pitfall) => ({
  title,
  summary,
  visual,
  code,
  steps,
  takeaway,
  pitfall,
});

const variableSteps = [
  { title: '声明变量 a', message: '先为 a 准备一个箱子。此时还没有赋值，箱子里是不能直接使用的未定义值。', line: 1, variables: { a: '?' }, active: 'a' },
  { title: '声明变量 b', message: '再为 b 准备另一个箱子。a 和 b 各自拥有独立的存储位置。', line: 2, variables: { a: '?', b: '?' }, active: 'b' },
  { title: '给 a 赋值', message: '把 3 写进 a 的箱子，原来的未定义值被覆盖。', line: 3, variables: { a: 3, b: '?' }, active: 'a' },
  { title: '给 b 赋值', message: '把 5 写进 b 的箱子。现在两个变量都有了确定的值。', line: 4, variables: { a: 3, b: 5 }, active: 'b' },
  { title: '计算右侧表达式', message: '先从两个箱子读取 3 和 5，计算 a + b，得到临时结果 8。', line: 5, variables: { a: 3, b: 5, 'a + b': 8 }, active: 'a + b' },
  { title: '写回变量 a', message: '把 8 写回 a 的箱子，a 的旧值 3 被覆盖；b 仍是 5。', line: 5, variables: { a: 8, b: 5 }, active: 'a' },
  { title: '输出结果', message: 'cout 读取的是此刻 a 箱子里的值，所以输出 8。', line: 6, variables: { a: 8, b: 5 }, output: ['8'], active: 'a' },
];

function createBranchDemo(inputScore) {
  const score = Number.isFinite(Number(inputScore)) ? Math.round(Number(inputScore)) : 72;
  const passed = score >= 60;
  const result = passed ? 'pass' : 'retry';
  const branch = passed ? 'if' : 'else';
  const steps = [
    { title: '输入分数', message: `score 中存着 ${score}，程序从开始节点进入条件判断。`, line: 1, variables: { score }, active: 'score', flow: 'start' },
    { title: '判断条件', message: `比较 ${score} >= 60，结果为 ${passed ? 'true' : 'false'}，流程将沿“${passed ? '是' : '否'}”分支继续。`, line: 2, variables: { score, 'score >= 60': String(passed) }, branch, flow: 'decision' },
    { title: `执行 ${branch} 分支`, message: passed ? '条件成立，执行 if 内的输出；else 分支不会执行。' : '条件不成立，跳过 if，执行 else 内的输出。', line: passed ? 3 : 5, variables: { score }, output: [result], branch, flow: branch },
    { title: '流程结束', message: `本次判断输出 ${result}。if / else 永远只会走其中一条分支。`, line: 6, variables: { score }, output: [result], branch, flow: 'done' },
  ];
  return topic('条件判断', '程序根据条件结果，在两条分支中选一条。', 'branch', [`int score = ${score};`, 'if (score >= 60) {', '    cout << "pass";', '} else {', '    cout << "retry";', '}'], steps, '条件表达式只有 true 或 false，分支只走一边。', '条件中写成 = 会变成赋值，判断请使用 ==。');
}

const forSteps = [
  { title: '初始化 i', message: '只在进入循环时执行一次：把 i 设为 1。', line: 1, variables: { i: 1 }, loop: { phase: 'init', current: 1, condition: '1 <= 3', result: null, visited: [] } },
  { title: '第 1 次判断', message: '1 <= 3 成立，程序可以进入循环体。', line: 1, variables: { i: 1, 'i <= 3': 'true' }, loop: { phase: 'check', current: 1, condition: '1 <= 3', result: true, visited: [] } },
  { title: '输出 1', message: '执行循环体，把当前 i 的值放进输出序列。', line: 2, variables: { i: 1 }, loop: { phase: 'body', current: 1, condition: '1 <= 3', result: true, visited: [1] }, output: ['1'] },
  { title: '更新到 i = 2', message: '循环体结束后执行 i++，再回到条件判断。', line: 1, variables: { i: 2 }, loop: { phase: 'update', current: 2, condition: '2 <= 3', result: null, visited: [1] }, output: ['1'] },
  { title: '第 2 次循环', message: '2 <= 3 成立，执行循环体并输出 2。', line: 2, variables: { i: 2 }, loop: { phase: 'body', current: 2, condition: '2 <= 3', result: true, visited: [1, 2] }, output: ['1', '2'] },
  { title: '第 3 次循环', message: '更新后 i = 3，条件仍成立，继续输出 3。', line: 2, variables: { i: 3 }, loop: { phase: 'body', current: 3, condition: '3 <= 3', result: true, visited: [1, 2, 3] }, output: ['1', '2', '3'] },
  { title: '判断失败，循环结束', message: '再次更新得到 i = 4；4 <= 3 不成立，循环体不再执行。', line: 1, variables: { i: 4, 'i <= 3': 'false' }, loop: { phase: 'done', current: 4, condition: '4 <= 3', result: false, visited: [1, 2, 3] }, output: ['1', '2', '3'] },
];

const whileSteps = [
  { title: '准备比较', message: '两种循环都从 x = 3 开始，条件都是 x < 3。', line: 1, variables: { x: 3 }, whileCompare: { phase: 'ready', x: 3, whileRuns: 0, doRuns: 0 } },
  { title: 'while 先检查', message: 'while 先判断 3 < 3，结果为 false，因此直接绕过循环体。', line: 1, variables: { x: 3, '3 < 3': 'false' }, whileCompare: { phase: 'while-check', x: 3, result: false, whileRuns: 0, doRuns: 0 } },
  { title: 'do-while 先执行', message: 'do-while 暂时不看条件，先输出 3，再把 x 增加到 4。', line: 6, variables: { x: 4 }, whileCompare: { phase: 'do-body', x: 4, result: null, whileRuns: 0, doRuns: 1 }, output: ['3'] },
  { title: 'do-while 后检查', message: '循环体执行后才判断 4 < 3，结果为 false，于是停止。', line: 8, variables: { x: 4, '4 < 3': 'false' }, whileCompare: { phase: 'do-check', x: 4, result: false, whileRuns: 0, doRuns: 1 }, output: ['3'] },
];

const nestedLoopSteps = [
  { title: '填入第 1 个星号', message: '外层 i = 1，内层 j = 1，只填充第 1 行第 1 格。', line: 3, variables: { i: 1, j: 1 }, nested: { rows: 2, cols: 3, active: [0, 0], visited: [], value: '★' }, output: ['*'] },
  { title: '填入第 2 个星号', message: 'i 保持为 1，j 增加到 2，接着填充第 1 行第 2 格。', line: 3, variables: { i: 1, j: 2 }, nested: { rows: 2, cols: 3, active: [0, 1], visited: [[0, 0]], value: '★' }, output: ['**'] },
  { title: '填入第 3 个星号', message: 'i 仍然是 1，j 增加到 3，第 1 行填充完成。', line: 3, variables: { i: 1, j: 3 }, nested: { rows: 2, cols: 3, active: [0, 2], visited: [[0, 0], [0, 1]], value: '★' }, output: ['***'] },
  { title: '换行并填入第 4 个星号', message: '外层 i 增加到 2，内层 j 重新从 1 开始，只填充第 2 行第 1 格。', line: 3, variables: { i: 2, j: 1 }, nested: { rows: 2, cols: 3, active: [1, 0], visited: [[0, 0], [0, 1], [0, 2]], value: '★' }, output: ['***', '*'] },
  { title: '填入第 5 个星号', message: 'i 保持为 2，j 增加到 2，填充第 2 行第 2 格。', line: 3, variables: { i: 2, j: 2 }, nested: { rows: 2, cols: 3, active: [1, 1], visited: [[0, 0], [0, 1], [0, 2], [1, 0]], value: '★' }, output: ['***', '**'] },
  { title: '填入第 6 个星号', message: 'i = 2、j = 3，最后一格填充完成，嵌套循环结束。', line: 3, variables: { i: 2, j: 3 }, nested: { rows: 2, cols: 3, active: [1, 2], visited: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1]], value: '★' }, output: ['***', '***'] },
];

const flowSteps = [
  { title: 'i = 1：正常输出', message: '既没有遇到 break，也没有遇到 continue，输出 1。', line: 4, variables: { i: 1 }, control: { current: 1, action: 'output', states: ['output', 'waiting', 'waiting', 'waiting', 'waiting', 'waiting'] }, output: ['1'] },
  { title: 'i = 2：continue', message: '2 是偶数，continue 跳过本轮剩余代码，2 不会输出。', line: 3, variables: { i: 2 }, control: { current: 2, action: 'continue', states: ['output', 'continue', 'waiting', 'waiting', 'waiting', 'waiting'] }, output: ['1'] },
  { title: 'i = 3：正常输出', message: '下一轮从 i = 3 继续，输出 3。', line: 4, variables: { i: 3 }, control: { current: 3, action: 'output', states: ['output', 'continue', 'output', 'waiting', 'waiting', 'waiting'] }, output: ['1', '3'] },
  { title: 'i = 4：再次 continue', message: '4 是偶数，本轮被跳过；continue 不会结束整个循环。', line: 3, variables: { i: 4 }, control: { current: 4, action: 'continue', states: ['output', 'continue', 'output', 'continue', 'waiting', 'waiting'] }, output: ['1', '3'] },
  { title: 'i = 5：break', message: 'i 等于 5，break 立即结束整个循环，后面的 i = 6 不会执行。', line: 2, variables: { i: 5 }, control: { current: 5, action: 'break', states: ['output', 'continue', 'output', 'continue', 'break', 'blocked'] }, output: ['1', '3'] },
];

const arraySteps = [
  { title: '数组有 4 个格子', message: '下标从 0 开始，最后一个元素的下标是 3。', line: 1, variables: { 'a.size()': 4 }, cells: { values: [10, 20, 30, 40], active: 0 } },
  { title: '读取 a[2]', message: '下标 2 对应第 3 个格子，读到的值是 30。', line: 2, variables: { 'a[2]': 30 }, cells: { values: [10, 20, 30, 40], active: 2 }, output: ['30'] },
  { title: '修改 a[1]', message: '把下标 1 的格子从 20 改为 99，其他格子不会改变。', line: 3, variables: { 'a[1]': 99 }, cells: { values: [10, 99, 30, 40], active: 1 } },
  { title: '注意边界', message: 'a[4] 已经越过最后一个格子。合法下标范围始终是 0 到 size - 1。', line: 4, variables: { '合法下标': '0 ~ 3' }, cells: { values: [10, 99, 30, 40], active: 4, error: true } },
];

const moveSteps = [
  { title: '准备在下标 2 插入', message: '原数组有 4 个元素。为了空出下标 2，后面的元素要从右往左搬。', line: 1, variables: { n: 4, pos: 2, value: 99 }, cells: { values: [10, 20, 30, 40, ''], active: 3, shift: [3] } },
  { title: '先搬最后一个', message: '把 a[3] 的 40 搬到 a[4]，先照顾右边，才不会覆盖数据。', line: 2, variables: { i: 3 }, cells: { values: [10, 20, 30, 40, 40], active: 4, shift: [3, 4] } },
  { title: '继续右移', message: '把 a[2] 的 30 搬到 a[3]，下标 2 就空出来了。', line: 2, variables: { i: 2 }, cells: { values: [10, 20, 30, 30, 40], active: 3, shift: [2, 3] } },
  { title: '写入新元素', message: '最后把 99 写到 a[2]，数组长度加 1。', line: 4, variables: { n: 5 }, cells: { values: [10, 20, 99, 30, 40], active: 2 } },
];

const matrixSteps = [
  { title: '二维数组像表格', message: 'a[行][列]：先选第几行，再选这一行中的第几列。', line: 1, variables: { '行数': 2, '列数': 3 }, grid: { rows: 2, cols: 3, values: [[1, 2, 3], [4, 5, 6]], active: [0, 0], visited: [] } },
  { title: '访问第 1 行', message: 'i = 0 时，j 从 0 到 2，依次访问 1、2、3。', line: 2, variables: { i: 0, j: 2 }, grid: { rows: 2, cols: 3, values: [[1, 2, 3], [4, 5, 6]], active: [0, 2], visited: [[0, 0], [0, 1], [0, 2]] }, output: ['1 2 3'] },
  { title: '换到第 2 行', message: 'j 循环结束后 i++，j 又从 0 重新开始。', line: 2, variables: { i: 1, j: 0 }, grid: { rows: 2, cols: 3, values: [[1, 2, 3], [4, 5, 6]], active: [1, 0], visited: [[0, 0], [0, 1], [0, 2]] }, output: ['1 2 3'] },
  { title: '完成表格扫描', message: '两层循环分别控制行和列，所以每个格子恰好访问一次。', line: 3, variables: { i: 1, j: 2 }, grid: { rows: 2, cols: 3, values: [[1, 2, 3], [4, 5, 6]], active: [1, 2], visited: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]] }, output: ['1 2 3', '4 5 6'] },
];

const stringSteps = [
  { title: '创建字符串', message: 'string 把每个字符按顺序放进连续位置，并自动记录长度。', line: 1, variables: { 's.size()': 5 }, stringOp: { operation: '初始化', before: '', after: 'Hello', resultName: 's' } },
  { title: '插入字符', message: 'insert(5, "!") 在下标 5 前插入感叹号，原字符串向右扩展。', line: 2, variables: { 's.size()': 6 }, stringOp: { operation: 'insert(5, "!")', before: 'Hello', after: 'Hello!', resultName: 's', active: [5] } },
  { title: '删除一段字符', message: 'erase(1, 2) 从下标 1 开始删除 2 个字符，后面的字符向左补位。', line: 3, variables: { 's.size()': 4 }, stringOp: { operation: 'erase(1, 2)', before: 'Hello!', after: 'Hlo!', resultName: 's', removed: [1, 2] } },
  { title: '替换字符', message: 'replace(0, 1, "Y") 把下标 0 开始的 1 个字符替换成 Y。', line: 4, variables: { s: 'Ylo!' }, stringOp: { operation: 'replace(0, 1, "Y")', before: 'Hlo!', after: 'Ylo!', resultName: 's', active: [0] } },
  { title: '截取子串', message: 'substr(0, 3) 复制从下标 0 开始的 3 个字符；原字符串 s 不会改变。', line: 5, variables: { s: 'Ylo!', part: 'Ylo' }, stringOp: { operation: 'substr(0, 3)', before: 'Ylo!', after: 'Ylo', resultName: 'part', active: [0, 1, 2] }, output: ['Ylo'] },
  { title: '字符数组的结束符', message: 'char 数组会额外保存 \\0，程序据此判断字符序列在哪里结束。', line: 6, variables: { 'word 长度': 2, '数组容量': 3 }, stringOp: { operation: 'char word[] = "Hi"', before: '', after: ['H', 'i', '\\0'], resultName: 'word' } },
];

const inputSteps = [
  { title: '输入缓冲区', message: '输入中有 Hello World 和一个换行符。', line: 1, variables: { '输入缓冲区': 'Hello World\\n' }, input: { buffer: 'Hello World↵', cin: '', getline: '', phase: '准备读取' } },
  { title: 'cin 读到空格前', message: 'cin >> word 遇到空格就停止，所以只读走 Hello。', line: 2, variables: { word: 'Hello' }, input: { buffer: ' World↵', cin: 'Hello', getline: '', phase: 'cin 停在空格前' } },
  { title: 'getline 读完整行', message: 'getline 会一直读到换行符，适合读取包含空格的一整行。', line: 5, variables: { line: 'Hello World' }, input: { buffer: '', cin: 'Hello', getline: 'Hello World', phase: 'getline 读整行' } },
];

const functionSteps = [
  { title: '主函数准备数据', message: 'main 中 x 的值是 5，调用 addOne(x)。', line: 5, variables: { 'main::x': 5 }, frames: [{ name: 'main', values: { x: 5 } }] },
  { title: '值传递复制一份', message: '形参 n 得到 x 的副本。修改 n 不会影响 main 中的 x。', line: 1, variables: { 'main::x': 5, 'addOne::n': 5 }, frames: [{ name: 'main', values: { x: 5 } }, { name: 'addOne', values: { n: 5 } }] },
  { title: '函数内部修改', message: 'n++ 后 n 变为 6；x 仍然是 5。', line: 2, variables: { 'main::x': 5, 'addOne::n': 6 }, frames: [{ name: 'main', values: { x: 5 } }, { name: 'addOne', values: { n: 6 } }] },
  { title: '函数返回', message: '函数结束后 n 消失，main 里的 x 保持 5。若想改 x，要用引用参数 int& n。', line: 6, variables: { 'main::x': 5 }, frames: [{ name: 'main', values: { x: 5 } }] },
];

const scopeSteps = [
  { title: '外层变量', message: 'main 中的 x 在整个 main 代码块内可见。', line: 1, variables: { '外层 x': 10 }, scopes: [{ name: 'main', values: ['x = 10'], active: true }] },
  { title: '进入代码块', message: 'if 内又声明了一个 x = 20，它和外层 x 是两个不同的变量。', line: 3, variables: { '外层 x': 10, '内层 x': 20 }, scopes: [{ name: 'main', values: ['x = 10'], active: false }, { name: 'if 代码块', values: ['x = 20'], active: true }] },
  { title: '就近原则', message: '在 if 内使用 x，会优先找到最近的内层 x，因此输出 20。', line: 4, variables: { '使用的 x': 20 }, scopes: [{ name: 'main', values: ['x = 10'], active: false }, { name: 'if 代码块', values: ['x = 20'], active: true }], output: ['20'] },
  { title: '离开代码块', message: '内层 x 生命周期结束；回到 main 后 x 又代表外层的 10。', line: 6, variables: { '外层 x': 10 }, scopes: [{ name: 'main', values: ['x = 10'], active: true }], output: ['20', '10'] },
];

const pointerSteps = [
  { title: '变量有地址', message: 'x 存在一个内存位置，例如 0x100；它的值是 7。', line: 1, variables: { x: 7, '&x': '0x100' }, memory: { value: 7, pointer: '未指向', reference: '未绑定' } },
  { title: '指针保存地址', message: 'p 保存 x 的地址。*p 表示沿着地址找到 x 这块内存。', line: 2, variables: { p: '0x100', '*p': 7 }, memory: { value: 7, pointer: 'p', reference: '未绑定' } },
  { title: '通过指针修改', message: '*p = 9 实际改的是 x 所在位置，所以 x 也变成 9。', line: 3, variables: { x: 9, '*p': 9 }, memory: { value: 9, pointer: 'p', reference: '未绑定' } },
  { title: '引用是别名', message: 'int& r = x 不保存新地址；r 只是 x 的另一个名字。', line: 5, variables: { x: 9, r: 9 }, memory: { value: 9, pointer: 'p', reference: 'r' } },
];

const digitSteps = [
  { title: '准备原数 583', message: '数位分离总是从个位开始。先把 583 放进变量 n。', line: 1, variables: { n: 583 }, digits: { number: 583, before: 583, digit: null, extracted: [], action: 'ready' } },
  { title: '取出个位 3', message: '583 % 10 的余数是 3，因此先取出个位数字 3。', line: 3, variables: { n: 583, digit: 3 }, digits: { number: 583, before: 583, digit: 3, extracted: [3], action: 'extract' } },
  { title: '去掉个位', message: '整数除法 583 / 10 得到 58，原来的个位已经被去掉。', line: 5, variables: { n: 58, digit: 3 }, digits: { number: 58, before: 583, digit: 3, extracted: [3], action: 'divide' } },
  { title: '取出十位 8', message: '现在计算 58 % 10，得到下一位数字 8。', line: 3, variables: { n: 58, digit: 8 }, digits: { number: 58, before: 58, digit: 8, extracted: [3, 8], action: 'extract' } },
  { title: '再次去掉个位', message: '58 / 10 得到 5，变量 n 中只剩下最高位。', line: 5, variables: { n: 5, digit: 8 }, digits: { number: 5, before: 58, digit: 8, extracted: [3, 8], action: 'divide' } },
  { title: '取出百位 5', message: '5 % 10 得到最后一位数字 5。', line: 3, variables: { n: 5, digit: 5 }, digits: { number: 5, before: 5, digit: 5, extracted: [3, 8, 5], action: 'extract' } },
  { title: '分离完成', message: '5 / 10 得到 0，循环结束。取出顺序是 3、8、5，也就是从低位到高位。', line: 5, variables: { n: 0 }, digits: { number: 0, before: 5, digit: 5, extracted: [3, 8, 5], action: 'done' }, output: ['3 8 5'] },
];

const commonFunctionCards = [
  { id: 'ceil', expression: 'ceil(3.7)', meaning: '向上取整' },
  { id: 'floor', expression: 'floor(3.7)', meaning: '向下取整' },
  { id: 'round', expression: 'round(3.7)', meaning: '四舍五入' },
  { id: 'sqrt', expression: 'sqrt(16)', meaning: '平方根' },
  { id: 'pow', expression: 'pow(2, 3)', meaning: '2 的 3 次方' },
  { id: 'abs', expression: 'abs(-6)', meaning: '绝对值' },
  { id: 'setw', expression: 'setw(5) << 42', meaning: '设置输出宽度' },
];

function commonFunctionStep(active, results, line, title, message) {
  return {
    title,
    message,
    line,
    variables: { 当前函数: active },
    commonFunctions: {
      active,
      cards: commonFunctionCards.map((card) => ({ ...card, result: results[card.id] ?? '等待执行' })),
    },
    output: Object.values(results).map(String),
  };
}

const commonFunctionSteps = [
  commonFunctionStep('ceil', { ceil: 4 }, 1, 'ceil：向上取整', 'ceil 返回不小于原数的最小整数，ceil(3.7) 得到 4。'),
  commonFunctionStep('floor', { ceil: 4, floor: 3 }, 2, 'floor：向下取整', 'floor 返回不大于原数的最大整数，floor(3.7) 得到 3。'),
  commonFunctionStep('round', { ceil: 4, floor: 3, round: 4 }, 3, 'round：四舍五入', 'round 按照四舍五入取最近的整数，round(3.7) 得到 4。'),
  commonFunctionStep('sqrt', { ceil: 4, floor: 3, round: 4, sqrt: 4 }, 4, 'sqrt：计算平方根', '因为 4 × 4 = 16，所以 sqrt(16) 得到 4。'),
  commonFunctionStep('pow', { ceil: 4, floor: 3, round: 4, sqrt: 4, pow: 8 }, 5, 'pow：计算次方', 'pow(2, 3) 表示 2 的 3 次方，结果是 8。'),
  commonFunctionStep('abs', { ceil: 4, floor: 3, round: 4, sqrt: 4, pow: 8, abs: 6 }, 6, 'abs：计算绝对值', 'abs 去掉数值的正负方向，abs(-6) 得到 6。'),
  commonFunctionStep('setw', { ceil: 4, floor: 3, round: 4, sqrt: 4, pow: 8, abs: 6, setw: '···42' }, 7, 'setw：设置字段宽度', 'setw(5) 让 42 占 5 个字符宽度，默认在左边补 3 个空格。图中用 · 表示空格。'),
];

const structSteps = [
  { title: '定义学生信息模板', message: 'struct 先规定 Student 中包含 name 和 score 两个成员。', line: 1, variables: { Student: 'name, score' }, record: { name: 'string', score: 'int', active: 'definition' } },
  { title: '创建结构体变量', message: '执行 Student tom;，内存中出现一个 tom 对象，此时还没有写入姓名和分数。', line: 6, variables: { tom: '已创建' }, record: { name: '未初始化', score: '未初始化', active: 'object' } },
  { title: '填写姓名', message: '执行 tom.name = "Tom" 后，name 成员才变为 Tom。', line: 7, variables: { 'tom.name': 'Tom' }, record: { name: 'Tom', score: '未初始化', active: 'name' } },
  { title: '填写分数', message: '执行 tom.score = 95 后，score 成员才变为 95。', line: 8, variables: { tom: '{ name: "Tom", score: 95 }' }, record: { name: 'Tom', score: 95, active: 'score' } },
];

const vectorSteps = [
  { title: '空 vector', message: 'vector 像能自动变长的数组，一开始没有元素。', line: 1, variables: { 'v.size()': 0 }, cells: { values: [], active: -1, labels: 'vector 下标' } },
  { title: 'push_back 追加', message: 'push_back(10) 把 10 放到尾部，长度变为 1。', line: 2, variables: { 'v.size()': 1 }, cells: { values: [10], active: 0, labels: 'vector 下标' } },
  { title: '继续追加 20', message: 'push_back(20) 把 20 接在 10 后面，长度变为 2。', line: 3, variables: { 'v.size()': 2 }, cells: { values: [10, 20], active: 1, labels: 'vector 下标' } },
  { title: '继续追加 30', message: 'push_back(30) 把 30 接在尾部，长度变为 3。', line: 4, variables: { 'v.size()': 3 }, cells: { values: [10, 20, 30], active: 2, labels: 'vector 下标' } },
  { title: 'pop_back 删除尾部', message: 'pop_back 删除最后一个元素 30，长度又变为 2。', line: 5, variables: { 'v.size()': 2 }, cells: { values: [10, 20], active: 1, labels: 'vector 下标' } },
];

const catalog = {
  variables: topic('变量与表达式', '看清赋值号右边先计算，再写回左边变量。', 'variables', ['int a;', 'int b;', 'a = 3;', 'b = 5;', 'a = a + b;', 'cout << a;'], variableSteps, '表达式先算右边，赋值最后发生。', '声明后必须先赋值再使用；未初始化值不可预测。'),
  digits: topic('数位分离', '用 % 10 取出末位，再用 / 10 去掉末位。', 'digit-separation', ['int n = 583;', 'while (n > 0) {', '    int digit = n % 10;', '    cout << digit << " ";', '    n /= 10;', '}'], digitSteps, '取位和去位要成对出现：n % 10 取个位，n / 10 去个位。', '分离顺序默认从个位到最高位；需要原顺序时可以倒序保存或使用位权。'),
  'for-loop': topic('for 循环', '让 i 沿轨道移动，看清“判断、执行、更新”的循环。', 'for-loop', ['for (int i = 1; i <= 3; i++) {', '    cout << i << " ";', '}'], forSteps, '循环顺序：初始化 → 判断 → 循环体 → 更新 → 再判断。', 'i <= n 和 i < n 的次数不同，先明确边界。'),
  'while-loop': topic('while 和 do-while', '并排比较“先判断”和“先执行”的区别。', 'while-compare', ['int x = 3;', 'while (x < 3) {', '    cout << x++;', '}', '', 'do {', '    cout << x++;', '} while (x < 3);'], whileSteps, '选择哪种循环，关键看循环体是否必须至少运行一次。', 'while 条件变量没有变化，循环会停不下来。'),
  'nested-loop': topic('嵌套循环', '外层选择行，内层在当前行逐格移动。', 'nested-loop', ['for (int i = 1; i <= 2; i++) {', '    for (int j = 1; j <= 3; j++) {', '        cout << "*";', '    }', '    cout << "\\n";', '}'], nestedLoopSteps, '总次数通常是外层次数乘以内层次数。', '每次外层进入新一轮时，内层变量会重新初始化。'),
  'flow-control': topic('break 和 continue', '观察每一轮是输出、跳过，还是让整个循环停止。', 'flow-control', ['for (int i = 1; i <= 6; i++) {', '    if (i == 5) break;', '    if (i % 2 == 0) continue;', '    cout << i << " ";', '}'], flowSteps, 'continue 是“跳到下一轮”，break 是“循环到此为止”。', 'continue 后面的语句不会执行，更新语句的位置要特别留意。'),
  array: topic('一维数组', '数组是一排连续格子，用下标定位每个元素。', 'cells', ['int a[4] = {10, 20, 30, 40};', 'cout << a[2];', 'a[1] = 99;', '// a[4] 是越界访问'], arraySteps, '长度为 n 的数组，合法下标范围是 0 到 n - 1。', '越界访问不会可靠报错，却可能造成很难找的 Bug。'),
  'array-move': topic('数组移动', '插入时从右往左搬；删除时从左往右补。', 'cells', ['for (int i = n - 1; i >= pos; i--) {', '    a[i + 1] = a[i];', '}', 'a[pos] = value;', 'n++;'], moveSteps, '移动方向要避开覆盖：右移从右往左，左移从左往右。', '先移动再写入新值，并确认数组还有空位。'),
  matrix: topic('二维数组', '二维数组是行列组成的表格，两层循环负责扫描。', 'grid', ['int a[2][3] = {{1, 2, 3}, {4, 5, 6}};', 'for (int i = 0; i < 2; i++) {', '    for (int j = 0; j < 3; j++) {', '        cout << a[i][j] << " ";', '    }', '}'], matrixSteps, 'a[i][j] 中 i 是行号，j 是列号。', '循环边界要分别对应行数和列数，别把它们写反。'),
  string: topic('string 常用操作', '对照操作前后，理解插入、删除、替换和取子串。', 'string-ops', ['string s = "Hello";', 's.insert(5, "!");', 's.erase(1, 2);', 's.replace(0, 1, "Y");', 'string part = s.substr(0, 3);', 'char word[] = "Hi";'], stringSteps, 'string 操作会移动字符；substr 返回新字符串，不改变原串。', '删除和替换的第二个参数是长度，不是结束下标。'),
  input: topic('cin 与 getline', 'cin 读一个单词，getline 读到换行前的整行内容。', 'input', ['string word, line;', 'cin >> word;', '', '// 读取整行时使用', 'getline(cin, line);'], inputSteps, '输入中有空格时，优先考虑 getline。', 'cin 后立刻 getline 会读到残留换行，先处理换行符。'),
  function: topic('函数传参', '值传递会复制；引用传递可以直接修改原变量。', 'frames', ['void addOne(int n) {', '    n++;', '}', '', 'int x = 5;', 'addOne(x);'], functionSteps, '函数参数默认是副本；需要改原变量时写成 int& n。', '形参和实参名字相同也不是同一个变量。'),
  'common-functions': topic('常用函数', '对照输入与结果，认识数学函数和格式控制函数。', 'common-functions', ['cout << ceil(3.7) << "\\n";', 'cout << floor(3.7) << "\\n";', 'cout << round(3.7) << "\\n";', 'cout << sqrt(16) << "\\n";', 'cout << pow(2, 3) << "\\n";', 'cout << abs(-6) << "\\n";', 'cout << setw(5) << 42;'], commonFunctionSteps, 'ceil、floor、round、sqrt、pow 来自 <cmath>，setw 来自 <iomanip>。', 'setw 只影响紧跟在后面的一项输出，不会永久改变宽度。'),
  scope: topic('作用域', '变量在哪对花括号中声明，就在哪段范围内可见。', 'scopes', ['int x = 10;', 'if (true) {', '    int x = 20;', '    cout << x;', '}', 'cout << x;'], scopeSteps, '同名变量遵循“就近原则”，离开代码块后内层变量失效。', '避免在嵌套代码块中复用同名变量，阅读成本很高。'),
  pointer: topic('指针与引用', '指针保存地址；引用是已有变量的别名。', 'memory', ['int x = 7;', 'int* p = &x;', '*p = 9;', '', 'int& r = x;'], pointerSteps, 'p 保存地址，*p 才是该地址上的值。', '使用指针前先保证它指向有效对象，不要解引用空指针。'),
  struct: topic('结构体', '结构体把属于同一对象的多个字段组织在一起。', 'record', ['struct Student {', '    string name;', '    int score;', '};', '', 'Student tom;', 'tom.name = "Tom";', 'tom.score = 95;'], structSteps, '用点号访问成员，让数据的含义更清晰。', '结构体变量声明后，基础类型成员不会自动得到有意义的值。'),
  vector: topic('vector', 'vector 是能自动扩容的数组，常用尾部添加和删除。', 'cells', ['vector<int> v;', 'v.push_back(10);', 'v.push_back(20);', 'v.push_back(30);', 'v.pop_back();'], vectorSteps, '用 size() 获取元素个数，下标范围仍是 0 到 size() - 1。', '空 vector 不能调用 pop_back，也不能访问 v[0]。'),
};

export function getSyntaxDemo(id, options = {}) {
  if (id === 'branch') return createBranchDemo(options.score);
  return catalog[id] || catalog.variables;
}

export function validateSyntaxDemos() {
  const payloadByVisual = {
    variables: (step) => step.variables,
    branch: (step) => step.flow,
    'for-loop': (step) => step.loop?.condition && step.loop?.phase,
    'while-compare': (step) => step.whileCompare?.phase,
    'nested-loop': (step) => step.nested?.value && step.nested?.rows && step.nested?.cols,
    'flow-control': (step) => step.control?.states?.length === 6,
    grid: (step) => step.grid?.values?.flat().every((value) => value !== '' && value !== undefined),
    cells: (step) => Array.isArray(step.cells?.values),
    'string-ops': (step) => step.stringOp?.operation && step.stringOp?.resultName
      && (Array.isArray(step.stringOp?.after) || typeof step.stringOp?.after === 'string'),
    input: (step) => step.input,
    frames: (step) => step.frames?.length,
    scopes: (step) => step.scopes?.length,
    memory: (step) => step.memory,
    record: (step) => step.record,
    'digit-separation': (step) => step.digits,
    'common-functions': (step) => step.commonFunctions?.cards?.length,
  };
  return syntaxTopics.every(({ id }) => {
    const demo = getSyntaxDemo(id);
    const hasPayload = payloadByVisual[demo?.visual];
    return demo && demo.code.length && demo.steps.length >= 3 && hasPayload
      && demo.steps.every((step) => step.title && step.message && hasPayload(step));
  });
}
