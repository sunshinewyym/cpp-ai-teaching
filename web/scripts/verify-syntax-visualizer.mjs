import assert from 'node:assert/strict';
import { getSyntaxDemo, syntaxTopics, validateSyntaxDemos } from '../src/utils/syntaxVisualizer.js';

assert.equal(validateSyntaxDemos(), true, '每个语法标签都应具备可播放步骤');
assert.equal(syntaxTopics.length, 18, '语法可视化应覆盖约定的 18 个知识点');
assert.deepEqual(syntaxTopics.map(({ id }) => id), ['variables', 'input', 'common-functions', 'branch', 'for-loop', 'while-loop', 'flow-control', 'nested-loop', 'digits', 'array', 'array-move', 'matrix', 'string', 'vector', 'function', 'scope', 'struct', 'pointer'], '语法标签应按学习顺序排列');

for (const { id } of syntaxTopics) {
  const demo = getSyntaxDemo(id);
  assert.ok(demo.code.length > 0, `${id} 缺少代码`);
  assert.ok(demo.steps.length >= 3, `${id} 的步骤不足`);
  assert.ok(demo.steps.every((step) => Number.isInteger(step.line) && step.line >= 1), `${id} 存在无效高亮行`);
}

const nested = getSyntaxDemo('nested-loop');
assert.ok(nested.steps.every((step) => step.nested?.value === '★'), '嵌套循环的每一步都应提供可见填充字符');
assert.equal(nested.steps.length, 6, '2×3 嵌套循环应拆成 6 次单格填充');
assert.deepEqual(nested.steps.map((step) => step.nested.visited.length + 1), [1, 2, 3, 4, 5, 6], '嵌套循环每一步只能新增一个已填充格子');

const matrix = getSyntaxDemo('matrix');
assert.deepEqual(matrix.steps[0].grid.values.flat(), [1, 2, 3, 4, 5, 6], '二维数组应完整显示所有元素');

const stringDemo = getSyntaxDemo('string');
assert.ok(stringDemo.steps.some((step) => step.stringOp.operation.startsWith('insert')), 'string 应包含插入演示');
assert.ok(stringDemo.steps.some((step) => step.stringOp.operation.startsWith('erase')), 'string 应包含删除演示');
assert.ok(stringDemo.steps.some((step) => step.stringOp.operation.startsWith('replace')), 'string 应包含替换演示');
assert.ok(stringDemo.steps.some((step) => step.stringOp.operation.startsWith('substr')), 'string 应包含取子串演示');

const structDemo = getSyntaxDemo('struct');
assert.deepEqual(structDemo.steps.map((step) => step.line), [1, 6, 7, 8], '结构体运行状态必须与代码执行行同步');
assert.deepEqual(structDemo.steps.map((step) => [step.record.name, step.record.score]), [
  ['string', 'int'],
  ['未初始化', '未初始化'],
  ['Tom', '未初始化'],
  ['Tom', 95],
], '结构体成员只能在对应赋值语句执行后更新');

const digitDemo = getSyntaxDemo('digits');
assert.deepEqual(digitDemo.steps.filter((step) => step.digits.action === 'extract').map((step) => step.digits.digit), [3, 8, 5], '数位分离应从个位到最高位逐个取出');
assert.deepEqual(digitDemo.steps.at(-1).digits, { number: 0, before: 5, digit: 5, extracted: [3, 8, 5], action: 'done' }, '数位分离结束时 n 应变为 0');

const commonFunctionsDemo = getSyntaxDemo('common-functions');
assert.deepEqual(commonFunctionsDemo.steps.map((step) => step.commonFunctions.active), ['ceil', 'floor', 'round', 'sqrt', 'pow', 'abs', 'setw'], '常用函数应逐项演示');
assert.equal(commonFunctionsDemo.steps.at(-1).commonFunctions.cards.find((card) => card.id === 'setw').result, '···42', 'setw(5) 应为 42 补足三个空格');

const vectorDemo = getSyntaxDemo('vector');
assert.deepEqual(vectorDemo.steps.map((step) => step.cells.values), [[], [10], [10, 20], [10, 20, 30], [10, 20]], 'vector 状态必须逐行对应 push_back 和 pop_back');
assert.deepEqual(vectorDemo.steps.map((step) => step.line), [1, 2, 3, 4, 5], 'vector 每一步必须高亮实际执行的代码行');

for (const id of ['for-loop', 'while-loop', 'nested-loop', 'flow-control']) {
  const demo = getSyntaxDemo(id);
  assert.ok(new Set(demo.steps.map((step) => JSON.stringify(step.loop || step.whileCompare || step.nested || step.control))).size === demo.steps.length, `${id} 每一步都应产生不同的可视状态`);
}

const failedBranch = getSyntaxDemo('branch', { score: 45 });
assert.equal(failedBranch.steps[2].branch, 'else', '低分应进入 else 分支');
assert.deepEqual(failedBranch.steps[2].output, ['retry'], 'else 分支应输出 retry');

console.log(`语法可视化校验通过：${syntaxTopics.length} 个知识点、${syntaxTopics.reduce((sum, item) => sum + getSyntaxDemo(item.id).steps.length, 0)} 个演示步骤。`);
