import assert from 'node:assert/strict';
import { gespPapers, listGespQuestions } from '../src/data/gespPapers.js';

const paper = gespPapers['GESP-2']?.['2026-06'];
assert.ok(paper, '缺少 GESP C++ 二级 2026-06 试卷');
assert.deepEqual(Object.keys(paper.sections).sort(), ['choice', 'judgment']);

const choice = paper.sections.choice.questions;
const judgment = paper.sections.judgment.questions;
assert.equal(choice.length, 15, '单选题必须为 15 道');
assert.equal(judgment.length, 10, '判断题必须为 10 道');
assert.equal(choice.map(q => q.answer).join(''), 'CBDCBBAAADABDBA', '单选题官方答案不一致');
assert.equal(judgment.map(q => q.answer).join(''), 'AAAABBBAAA', '判断题官方答案不一致');

const questions = [...choice, ...judgment];
assert.equal(new Set(questions.map(q => q.id)).size, questions.length, '题目 ID 必须唯一');
const indexedQuestions = listGespQuestions();
const sourceQuestionCount = Object.values(gespPapers).reduce((levelTotal, sessions) =>
  levelTotal + Object.values(sessions).reduce((sessionTotal, item) =>
    sessionTotal + Object.values(item.sections).reduce((total, section) =>
      total + section.questions.length, 0), 0), 0);
assert.equal(indexedQuestions.length, sourceQuestionCount, '全题库索引必须覆盖所有级别、考期和题型');
assert.deepEqual(
  [...new Set(indexedQuestions.filter(q => q.tags.includes('分支与循环'))
    .map(q => q.source.questionType))].sort(),
  ['choice', 'judgment'],
  '知识点筛选必须能够跨题型匹配'
);
assert.ok(indexedQuestions.every(q => q.source.level && q.source.session && q.source.questionType));
for (const question of questions) {
  assert.ok(question.question.trim(), `${question.id} 缺少题干`);
  assert.ok(question.options[question.answer], `${question.id} 的答案不在选项中`);
  assert.ok(question.tags?.length, `${question.id} 缺少知识点标签`);
  assert.match(question.explanation, /\*\*详细解析：\*\*/u, `${question.id} 缺少详细解析`);
  assert.match(question.explanation, /\*\*解题技巧：\*\*/u, `${question.id} 缺少解题技巧`);
  assert.match(question.explanation, /\*\*易错点：\*\*/u, `${question.id} 缺少易错点`);
}

assert.equal(new Set(indexedQuestions.map(q => q.id)).size, indexedQuestions.length, '全题库题目 ID 必须唯一');
const questionById = new Map(indexedQuestions.map(q => [q.id, q]));
const tagMinimumLevels = {
  动态规划: 6,
  图论: 7,
  树与二叉树: 6,
  哈希表: 7,
  栈与队列: 6,
  面向对象: 6,
  链表: 5,
  高精度: 5,
  二分查找: 5,
  贪心算法: 5,
  分治算法: 5,
  搜索与递归: 5,
  组合数学: 8,
  几何与代数: 8,
  算法优化: 8,
  数学与数论: 5,
  排序算法: 4,
  复杂度分析: 4,
  文件操作: 4,
  异常处理: 4,
  结构体: 4,
  指针与引用: 4,
  函数: 4,
  递推: 4,
  数组: 3,
  字符串: 3,
  位运算: 3,
  枚举与模拟: 3,
  流程图: 2,
  进制与编码: 2,
  数学函数: 2,
  多层循环语句: 2,
};
for (const question of indexedQuestions) {
  const level = Number(String(question.source.level).replace(/\D/gu, ''));
  for (const tag of question.tags) {
    const minimumLevel = tagMinimumLevels[tag];
    if (minimumLevel) {
      assert.ok(
        level >= minimumLevel,
        `${question.id} 的“${tag}”标签低于 GESP 大纲 ${minimumLevel} 级范围`,
      );
    }
  }
}

const tcpQuestion = questionById.get('gesp-cpp5-2023-09-judgment-1');
assert.ok(tcpQuestion?.tags.includes('计算机基础'), 'TCP/IP 题应标记为计算机基础');
assert.ok(!tcpQuestion?.tags.includes('动态规划'), 'UDP 不得误匹配为 DP/动态规划');

const mergeSortQuestion = questionById.get('gesp-cpp5-2024-03-choice-12');
assert.ok(mergeSortQuestion?.tags.includes('排序算法'), '归并排序题应标记为排序算法');
assert.ok(mergeSortQuestion?.tags.includes('分治算法'), '归并排序题应标记为分治算法');
assert.ok(!mergeSortQuestion?.tags.includes('动态规划'), '错误选项不得污染归并排序题标签');
assert.ok(!mergeSortQuestion?.tags.includes('搜索与递归'), '错误选项不得污染归并排序题标签');

const pageNoise = /第\s*\d+\s*页\s*\/\s*共\s*\d+\s*页|题号(?:\s+\d+){3,}|答案(?:\s+[A-D×√]){3,}/u;

for (const question of indexedQuestions) {
  const fields = [question.question, ...Object.values(question.options)];
  for (const field of fields) {
    assert.doesNotMatch(field, pageNoise, `${question.id} 混入页码、题号表或答案表`);
    assert.equal((field.match(/```/gu) ?? []).length % 2, 0, `${question.id} 的代码块没有闭合`);
  }
}

for (const id of [
  'gesp-cpp3-2026-03-choice-11',
  'gesp-cpp3-2026-03-choice-12',
  'gesp-cpp3-2026-03-choice-15',
  'gesp-cpp2-2023-09-choice-9',
  'gesp-cpp2-2023-12-choice-10',
  'gesp-cpp4-2023-12-judgment-5',
]) {
  assert.match(questionById.get(id)?.question ?? '', /```cpp/u, `${id} 缺少 C++ 代码块`);
}

const compatibilityRadical = /[\u2F00-\u2FD5]/u;
for (const question of indexedQuestions) {
  for (const field of [question.question, ...Object.values(question.options)]) {
    assert.doesNotMatch(field, compatibilityRadical, `${question.id} 仍含会触发备用字体的兼容部首`);
  }
}
assert.match(
  questionById.get('gesp-cpp2-2024-12-choice-10')?.question ?? '',
  /\n {2,}for \(j=0;/u,
  'PDF 行号移除后必须保留代码层级缩进'
);

const matrixQuestion = questionById.get('gesp-cpp2-2026-06-choice-12')?.question ?? '';
assert.match(matrixQuestion, /```text\n1 1 1 1 1 1 1 1 1 1/u, '2026-06 二级第 12 题缺少数字图形');
assert.match(matrixQuestion, /```cpp\nint N;/u, '2026-06 二级第 12 题缺少 C++ 代码');
assert.doesNotMatch(matrixQuestion, /3\s*\/\s*10/u, '2026-06 二级第 12 题混入 PDF 页码');

for (const question of indexedQuestions) {
  for (const [key, value] of Object.entries(question.options)) {
    assert.doesNotMatch(
      value,
      /```/u,
      `${question.id} 的选项 ${key} 不应使用代码块`,
    );
  }
}

const multilineOption = questionById.get('gesp-cpp2-2026-06-choice-15')?.options.D ?? '';
assert.match(
  multilineOption,
  /可修改如下:\n\nint total = [^\n]+;\ntotal_score = total;/u,
  '选项移除代码块后必须保留代码换行',
);


const gesp8RecoveredIds = [
  'gesp-cpp8-2023-12-choice-4',
  'gesp-cpp8-2023-12-choice-6',
  'gesp-cpp8-2023-12-choice-8',
  'gesp-cpp8-2023-12-choice-9',
  'gesp-cpp8-2023-12-choice-10',
  'gesp-cpp8-2023-12-choice-11',
  'gesp-cpp8-2023-12-choice-12',
  'gesp-cpp8-2024-03-choice-5',
  'gesp-cpp8-2024-03-choice-10',
  'gesp-cpp8-2024-03-choice-11',
  'gesp-cpp8-2024-03-choice-12',
  'gesp-cpp8-2024-06-choice-4',
  'gesp-cpp8-2024-06-choice-5',
  'gesp-cpp8-2024-06-choice-13',
  'gesp-cpp8-2024-06-choice-14',
  'gesp-cpp8-2024-09-choice-2',
  'gesp-cpp8-2024-09-choice-5',
  'gesp-cpp8-2024-09-choice-6',
  'gesp-cpp8-2024-09-choice-14',
  'gesp-cpp8-2024-09-choice-15',
  'gesp-cpp8-2024-12-choice-4',
  'gesp-cpp8-2024-12-choice-13',
  'gesp-cpp8-2024-12-choice-15',
  'gesp-cpp8-2025-03-choice-7',
  'gesp-cpp8-2025-03-choice-10',
  'gesp-cpp8-2025-03-choice-13',
  'gesp-cpp8-2025-03-choice-15',
  'gesp-cpp8-2025-06-choice-5',
  'gesp-cpp8-2025-06-choice-7',
  'gesp-cpp8-2025-06-choice-9',
  'gesp-cpp8-2025-06-choice-11',
  'gesp-cpp8-2025-06-choice-14',
  'gesp-cpp8-2025-09-choice-5',
  'gesp-cpp8-2025-09-choice-7',
  'gesp-cpp8-2025-09-choice-10',
  'gesp-cpp8-2025-09-choice-11',
  'gesp-cpp8-2025-09-choice-12',
  'gesp-cpp8-2025-12-choice-9',
  'gesp-cpp8-2026-03-choice-3',
  'gesp-cpp8-2026-03-choice-6',
  'gesp-cpp8-2026-03-choice-7',
];
for (const id of gesp8RecoveredIds) {
  const question = questionById.get(id);
  assert.ok(question, `${id} 必须存在`);
  for (const value of Object.values(question.options)) {
    assert.doesNotMatch(value, /PDF 中的图示或代码未提取/u, `${id} 仍含占位选项`);
  }
}
assert.doesNotMatch(JSON.stringify(gespPapers), /PDF 中的图示或代码未提取/u, '完整 GESP 题库不得再包含 PDF 提取占位符');
const gesp8GraphQuestion = questionById.get('gesp-cpp8-2023-12-choice-12');
assert.match(gesp8GraphQuestion?.question ?? '', /Edge e\[5\][\s\S]*Node n\[4\]/u, '八级 2023-12 第 12 题代码必须完整');
for (const key of 'ABCD') {
  assert.match(gesp8GraphQuestion?.options[key] ?? '', new RegExp(`/gesp-assets/gesp-cpp8-2023-12/choice-12/${key}\\.png`), `八级图论题选项 ${key} 缺少图片`);
}

const gesp7RecoveredIds = [
  'gesp-cpp7-2023-12-choice-13', 'gesp-cpp7-2024-03-choice-11', 'gesp-cpp7-2024-03-choice-12', 'gesp-cpp7-2024-03-choice-13',
  'gesp-cpp7-2024-06-choice-11', 'gesp-cpp7-2024-06-choice-12', 'gesp-cpp7-2024-06-choice-14', 'gesp-cpp7-2024-09-choice-13',
  'gesp-cpp7-2024-09-choice-14', 'gesp-cpp7-2024-12-choice-13', 'gesp-cpp7-2024-12-choice-14', 'gesp-cpp7-2025-03-choice-11',
  'gesp-cpp7-2025-06-choice-5', 'gesp-cpp7-2025-06-choice-12', 'gesp-cpp7-2025-06-choice-13', 'gesp-cpp7-2025-06-choice-14',
  'gesp-cpp7-2025-09-choice-8', 'gesp-cpp7-2025-09-choice-12', 'gesp-cpp7-2025-09-choice-13', 'gesp-cpp7-2025-09-choice-14',
  'gesp-cpp7-2025-12-choice-3', 'gesp-cpp7-2025-12-choice-8', 'gesp-cpp7-2025-12-choice-13',
  'gesp-cpp7-2026-03-choice-1', 'gesp-cpp7-2026-03-choice-4', 'gesp-cpp7-2026-03-choice-8',
];
for (const id of gesp7RecoveredIds) {
  const question = questionById.get(id);
  assert.ok(question, `${id} 必须存在`);
  for (const value of Object.values(question.options)) assert.doesNotMatch(value, /PDF 中的图示或代码未提取/u, `${id} 仍含占位选项`);
}
assert.match(questionById.get('gesp-cpp7-2025-12-choice-3')?.question ?? '', /h\(x\) = \(x² \+ x\) mod 11/u);
assert.match(questionById.get('gesp-cpp7-2025-12-choice-13')?.question ?? '', /T\(n\) = 8T\(n\/4\) \+ n√n/u);

const gesp6RecoveredOptions = new Map([
  ['gesp-cpp6-2023-09-choice-12', { A: 'O(1)', B: 'O(N)', C: 'O(log N)', D: 'O(N²)' }],
  ['gesp-cpp6-2023-09-choice-14', { A: 'O(1)', B: 'O(N)', C: 'O(log N)', D: 'O(N²)' }],
  ['gesp-cpp6-2023-12-choice-4', { A: '上述 C++ 代码适用于构造各种二叉树', B: '代码 struct BiNode 用于构造二叉树的节点', C: '代码 BiTree(){root=Creat();} 用于构造二叉树', D: '析构函数不可以省略' }],
  ['gesp-cpp6-2024-09-choice-13', { A: '5 3 7 2 4 6 8', B: '2 3 4 5 6 7 8', C: '2 4 3 6 8 7 5', D: '2 4 3 5 6 7 8' }],
  ['gesp-cpp6-2024-12-choice-5', { A: 'O(1)', B: 'O(N)', C: 'O(log N)', D: 'O(N³)' }],
  ['gesp-cpp6-2024-12-choice-10', { A: '5 3 7', B: '5 7', C: '2 3 4 5 6 7', D: '8 7' }],
  ['gesp-cpp6-2024-12-choice-13', { A: '1 2 8 9 4 5 3 6 7', B: '1 2 3 4 5 6 7 8 9', C: '1 2 3 8 9 6 4 5 7', D: '8 4 5 9 2 1 3 6 7' }],
  ['gesp-cpp6-2025-06-choice-7', { A: '(i − 1) / 2', B: 'i + 1', C: 'i × 2', D: '2 × i + 1' }],
  ['gesp-cpp6-2025-09-choice-12', { A: 'O(n)', B: 'O(log n)', C: 'O(n²)', D: 'O(2ⁿ)' }],
]);
for (const [id, expected] of gesp6RecoveredOptions) {
  assert.deepEqual(questionById.get(id)?.options, expected, `${id} 的选项必须与官方 PDF 一致`);
}
assert.match(questionById.get('gesp-cpp6-2023-12-choice-4')?.question ?? '', /struct BiNode[\s\S]*~BiTree\(\)[\s\S]*Release\(root\);/u);

const gesp5RecoveredOptions = new Map([
  ['gesp-cpp5-2023-12-choice-10', { A: 'O(N)', B: 'O(log N)', C: 'O(N log N)', D: 'O(N²)' }],
  ['gesp-cpp5-2024-03-choice-6', { A: 'O(1)', B: 'O(n)', C: 'O(2ⁿ)', D: 'O(log n)' }],
  ['gesp-cpp5-2024-03-choice-11', { A: 'O(n)', B: 'O(n log log n)', C: 'O(n log n)', D: 'O(n²)' }],
  ['gesp-cpp5-2024-06-choice-3', { A: 'O(1)', B: 'O(n)', C: 'O(log n)', D: 'O(n²)' }],
  ['gesp-cpp5-2024-06-choice-8', { A: 'O(n²)', B: 'O(n log n)', C: 'O(n log log n)', D: 'O(n)' }],
  ['gesp-cpp5-2024-06-choice-13', { A: 'n²', B: 'n log n', C: '2n − 1', D: 'n' }],
  ['gesp-cpp5-2024-09-choice-7', { A: 'O(n²)', B: 'O(n log n)', C: 'O(√n log n)', D: 'O(n)' }],
  ['gesp-cpp5-2024-09-choice-8', { A: 'O(n)', B: 'O(n²)', C: 'O(log n)', D: 'O(n log n)' }],
  ['gesp-cpp5-2024-09-choice-10', { A: 'O(1)', B: 'O(n)', C: 'O(log n)', D: 'O(n log n)' }],
  ['gesp-cpp5-2025-12-choice-10', { A: 'O(n)', B: 'O(log n)', C: 'O(n²)', D: 'O(n log n)' }],
  ['gesp-cpp5-2026-03-choice-11', { A: 'O(n²)', B: 'O(n log n)', C: 'O(log n)', D: 'O(n)' }],
  ['gesp-cpp5-2026-03-choice-13', { A: 'O(n)', B: 'O(n log n)', C: 'O(n²)', D: 'O(log n)' }],
]);
for (const [id, expected] of gesp5RecoveredOptions) {
  assert.deepEqual(questionById.get(id)?.options, expected, `${id} 的选项必须与官方 PDF 一致`);
}

const gesp4ComplexityOptions = new Map([
  ['gesp-cpp4-2023-09-choice-3', { A: 'O(n)', B: 'O(n log n)', C: 'O(n²)', D: '以上都不正确' }],
  ['gesp-cpp4-2024-03-choice-9', { A: 'O(1)', B: 'O(N/2)', C: 'O(N)', D: 'O(N²)' }],
  ['gesp-cpp4-2024-09-choice-12', { A: 'O(n²)', B: 'O(2ⁿ)', C: 'O(1)', D: 'O(n)' }],
  ['gesp-cpp4-2024-12-choice-12', { A: 'O(n²)', B: 'O(2ⁿ)', C: 'O(1)', D: 'O(n)' }],
  ['gesp-cpp4-2025-03-choice-11', { A: 'O(n²)', B: 'O(n × 2ⁿ)', C: 'O(1)', D: 'O(n³)' }],
  ['gesp-cpp4-2025-06-choice-11', { A: 'O(n)', B: 'O(n²)', C: 'O(n³)', D: 'O(2ⁿ)' }],
  ['gesp-cpp4-2025-06-choice-12', { A: 'O(n)', B: 'O(n²)', C: 'O(n³)', D: 'O(2ⁿ)' }],
  ['gesp-cpp4-2025-09-choice-14', { A: 'O(n)', B: 'O(n²)', C: 'O(n³)', D: 'O(2ⁿ)' }],
  ['gesp-cpp4-2025-12-choice-13', { A: 'O(n)', B: 'O(n²)', C: 'O(n³)', D: 'O(2ⁿ)' }],
  ['gesp-cpp4-2026-03-choice-12', { A: 'O(n)', B: 'O(n log n)', C: 'O(n²)', D: 'O(2ⁿ)' }],
]);
for (const [id, expected] of gesp4ComplexityOptions) {
  assert.deepEqual(questionById.get(id)?.options, expected, `${id} 的复杂度选项必须与官方 PDF 一致`);
}

const matrixOptions = questionById.get('gesp-cpp4-2023-12-choice-4')?.options ?? {};
assert.deepEqual(
  matrixOptions,
  {
    A: '1 2 3\n4 5 6\n7 8 9',
    B: '1 2 3 4 5 6 7 8 9',
    C: '3 2 1\n6 5 4\n9 8 7',
    D: '9 8 7 6 5 4 3 2 1',
  },
  'GESP-4 2023-12 第 4 题必须使用可复制的文字选项并保留矩阵换行',
);



for (const [id, required] of [
  ['gesp-cpp2-2023-12-choice-3', /cin >> N;[\s\S]*cout << i << " ";/u],
  ['gesp-cpp2-2023-12-choice-6', /N = 4;[\s\S]*if \(i \* j % 2 == 0\)/u],
  ['gesp-cpp2-2023-12-choice-8', /N = 100;[\s\S]*if \(N % 2\)[\s\S]*cout << N;/u],
  ['gesp-cpp4-2023-12-choice-3', /int fun1\(int \*n\)[\s\S]*cout << arr\[1\] << endl;/u],
  ['gesp-cpp4-2023-12-choice-5', /p = arr;[\s\S]*p\+\+;[\s\S]*cout << \*p << endl;/u],
  ['gesp-cpp4-2024-06-choice-8', /int n, a\[10001\];[\s\S]*if \(a\[j\] > a\[j \+ 1\]\)/u],
  ['gesp-cpp2-2025-12-judgment-10', /```text\n  1  2  3[\s\S]*  9 18 27 36 45 54 63 72 81[\s\S]*```cpp/u],
]) {
  assert.match(questionById.get(id)?.question ?? '', required, `${id} 仍未修正明显 OCR/混排问题`);
}

for (const [id, corrupted] of [
  ['gesp-cpp2-2023-12-choice-3', /\bNj\b|cout << 1 << " "/u],
  ['gesp-cpp2-2023-12-choice-4', /\bNj\b/u],
  ['gesp-cpp2-2023-12-choice-5', /\bNj\b|质数癨/u],
  ['gesp-cpp2-2023-12-choice-6', /1 < N|i\* J/u],
  ['gesp-cpp2-2023-12-choice-8', /NS 2|Ny/u],
  ['gesp-cpp4-2023-12-choice-2', /\bnt\s+arr|\btring\s+strArr|\bout<</u],
  ['gesp-cpp4-2023-12-choice-3', /\bnt funl|arr\[l\]|芦<endl/u],
  ['gesp-cpp4-2023-12-choice-5', /\)=arr|鈥|攐ut/u],
  ['gesp-cpp4-2023-12-choice-6', /p=8&x|ptt/u],
  ['gesp-cpp4-2024-06-choice-8', /qn\s+main|i1i|af\[|aliDali|iz1/u],
  ['gesp-cpp2-2025-12-judgment-10', /\)\s*1 1 2 3 4 5 6 7 8 9/u],
]) {
  assert.doesNotMatch(questionById.get(id)?.question ?? '', corrupted, `${id} 仍含明显 OCR/混排残留`);
}

for (const [id, required] of [
  ['gesp-cpp2-2023-12-choice-12', /```text\n0\n01\n012[\s\S]*```cpp\nint N, i, j, nowNum;[\s\S]*cout << nowNum/u],
  ['gesp-cpp2-2024-06-choice-13', /```text\n1\n2 4\n3 6 9[\s\S]*```cpp\nfor \(int i = 1; i < 6; i\+\+\)/u],
  ['gesp-cpp2-2024-09-choice-11', /```text\n7\n1\n2 3[\s\S]*7 8 9 10 11 12 13[\s\S]*```cpp\n\/{10,}/u],
]) {
  assert.match(questionById.get(id)?.question ?? '', required, `${id} 输出图示和代码块未按原卷拆分`);
}

for (const [id, corrupted] of [
  ['gesp-cpp2-2023-12-choice-12', /cin >> Nj|i\+l/u],
  ['gesp-cpp2-2024-06-choice-13', /```\w*\n\}\s+6 9|```\w*\nL\s+8 12 16|```\w*\ny\s+10 15/u],
  ['gesp-cpp2-2024-09-choice-11', /题是（ ）\.?\s*1 7 2 1 3|功能，横线处应填入代码是（ ）\s*1 7/u],
]) {
  assert.doesNotMatch(questionById.get(id)?.question ?? '', corrupted, `${id} 仍含输出图示 OCR 混排`);
}

for (const [id, required] of [
  ['gesp-cpp5-2023-12-choice-1', /int last2 = 1, last1 = 1;[\s\S]*nowVal = last1 \+ last2;/u],
  ['gesp-cpp5-2023-12-choice-2', /void mergeSort\(int SList\[\], int TList\[\], int s, int t, int len\)[\s\S]*merge\(T2, SList, s, m, t\);/u],
  ['gesp-cpp5-2023-12-choice-4', /void swap\(int &a, int &b\)[\s\S]*void sortA\(int lstA\[\], int n\)/u],
  ['gesp-cpp5-2023-12-choice-9', /int _binarySearch\(vector<int> lst, int Low, int High, int Target\)[\s\S]*return _binarySearch\(lst, 0, lst\.size\(\), Val\);/u],
]) {
  assert.match(questionById.get(id)?.question ?? '', required, `${id} 代码块未按官方 PDF 修正`);
}

for (const [id, corrupted] of [
  ['gesp-cpp5-2023-12-choice-1', /lastl/u],
  ['gesp-cpp5-2023-12-choice-2', /»id|禄id|SList\(\[s\]|mr t/u],
  ['gesp-cpp5-2023-12-choice-4', /\nL\n|\broid\b|\brold\b|1lstA|int 1/u],
  ['gesp-cpp5-2023-12-choice-9', /'t binarySearch|涓.bSearch|vector<int>1lst|lst \[Mid\]/u],
]) {
  assert.doesNotMatch(questionById.get(id)?.question ?? '', corrupted, `${id} 仍含 2023-12 5级 OCR 错字`);
}

for (const [id, corrupted] of [
  ['gesp-cpp3-2023-06-choice-13', /a\s*=a"|return 9/u],
  ['gesp-cpp3-2023-06-choice-14', /int 1|©/u],
  ['gesp-cpp4-2023-06-choice-13', /\*\s*%|\*ys/u],
  ['gesp-cpp5-2023-09-choice-12', /int 1|©|\bJ\+\+/u],
  ['gesp-cpp8-2023-12-choice-9', /81int|LC\}/u],
]) {
  assert.doesNotMatch(questionById.get(id)?.question ?? '', corrupted, `${id} 仍含 OCR 乱码`);
}

assert.equal(
  choice.length * paper.sections.choice.scorePerQuestion
    + judgment.length * paper.sections.judgment.scorePerQuestion,
  50,
  '客观题总分必须为 50 分'
);

console.log('GESP practice verified: 15 choices, 10 judgments, official answers, tags and explanations passed');
