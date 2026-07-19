const assert = require('node:assert/strict');
const {
  SECTION_KINDS,
  composeMessages,
  generateGuide,
  guardGuide,
  normalizeGuide,
  parseJsonCandidate,
  validateGuide,
} = require('./guide');
const { analyzeProblem } = require('./engine');

const problem = {
  title: '1909 - 跳石头',
  text: '河道起点和终点之间有 N 块岩石。至多移走 M 块岩石，使选手经过相邻岩石时的最短跳跃距离尽可能长。',
  constraints: '0 <= N <= 50000，0 <= M <= N，河道长度 L <= 1000000000',
  samples: [{ input: '25 5 2\n2\n11\n14\n17\n21', output: '4' }],
};

const sectionContent = {
  problem_picture: '把每块岩石按离起点的距离排在一条线上。移走一些岩石以后，选手只能落在留下的岩石上，因此相邻两次落脚之间会形成新的跳跃距离。题目不是让某一次跳得最远，而是让整条路线中最短的那一跳尽可能长。这个“照顾最短一跳”的目标，是后面判断方法的出发点。',
  first_attempt: '最直接的做法是枚举要移走的岩石组合，再逐个计算留下岩石之间的距离，并记录其中的最小值。问题在于 N 最多有 50000，组合数量会急剧增长。即使只枚举连续移走的位置，也会反复计算大量相同区间，所以真正的瓶颈不是求一次最小值，而是候选方案太多。',
  key_insight: '不要直接猜哪些岩石该被移走，改为猜一个最短跳跃距离 d。若要求每一跳都至少为 d，可以从起点向终点扫描：当前岩石离上一个保留岩石不足 d 时就移走，否则保留。因为越小的 d 越容易满足，越大的 d 越难满足，所以答案具有明确的单调边界，可以二分寻找最大的可行 d。',
  method: '先把起点、所有岩石和终点按位置连成一条有序路线。二分一个候选距离 d，并用一次从左到右的扫描统计至少需要移走多少块岩石。如果移走数量不超过 M，说明 d 仍然可行，可以继续尝试更大距离；否则 d 太大，需要缩小。最终保留最大的可行距离。',
  walkthrough: '用河道长度 25、岩石位置 2、11、14、17、21、最多移走 2 块来推演。候选距离取 4 时，位置 2 离起点太近，先移走；11 可以保留；14 离 11 只有 3，再移走；17、21 和终点都满足至少 4。总共正好移走 2 块，因此 4 可行。继续测试更大距离，就能确定它是否已经到达可行区间的右边界。',
  implementation: '实现时只需记录有序位置、二分的左右边界、当前候选距离、上一个保留岩石的位置和本次扫描的移除数量。判断函数只回答“候选距离是否可行”，不要在里面寻找最终答案。扫描结束还必须检查最后一块保留岩石到终点的距离，避免漏掉路线末端。',
  review: '每次判断只扫描一遍 N 块岩石，二分次数与河道长度 L 的二进制位数同阶，总复杂度为 O(N log L)。边界要检查 M 为 0、可以移走全部中间岩石、相邻岩石位置很近以及终点前最后一段不足候选距离。遇到“最大化最小值”且可行性随答案单调变化的题目，也可以迁移这套答案二分方法。',
  implementation_review: '实现时记录有序位置、二分边界、候选距离、上一个保留岩石和移除数量。每次判断扫描 N 块岩石，总复杂度为 O(N log L)。要检查 M 为 0、移走全部中间岩石和终点前最后一段。遇到“最大化最小值”且可行性单调的题目，也能迁移这套答案二分方法。',
};

function makeGuide() {
  return {
    headline: '把“移哪些岩石”改成“这个距离能不能做到”',
    lead: '这道题最容易卡在组合选择上。真正的突破口是先固定最短跳跃距离，再用一次扫描判断需要移走多少块岩石。',
    core: '候选距离越大越难满足，因此可以二分最短跳跃距离，并用贪心扫描判断它是否可行。',
    sections: SECTION_KINDS.map((kind, index) => ({
      kind,
      title: ['先看清比赛目标与直观瓶颈', '把选择题变成判断题', '二分与扫描怎样配合', '用样例走一遍', '把思路落到实现与迁移'][index],
      summary: kind === 'problem_picture'
        ? `${sectionContent.problem_picture}\n${sectionContent.first_attempt}`
        : sectionContent[kind],
      steps: kind === 'method' ? [
        { title: '确定候选距离', detail: '在 1 到河道长度之间取中间值 d。' },
        { title: '扫描并计数', detail: '不足 d 的岩石移走，满足 d 的岩石成为新的落脚点。' },
        { title: '收缩答案区间', detail: '移走数量不超过 M 就向更大距离搜索，否则缩小距离。' },
      ] : [],
      example: kind === 'walkthrough' ? {
        label: '候选距离 d = 4',
        input: 'L = 25，岩石为 2、11、14、17、21，M = 2',
        walkthrough: [
          '从起点 0 出发，岩石 2 的距离不足 4，移走 2。',
          '岩石 11 距起点足够远，保留 11；岩石 14 距 11 只有 3，移走 14。',
          '17、21 和终点 25 依次满足距离要求，总移除数为 2。',
        ],
        result: '候选距离 4 可行，下一步应尝试更大的候选距离。',
      } : null,
      snippet: kind === 'implementation_review'
        ? '检查(d)：\n  上次保留位置 = 起点\n  从左到右扫描岩石\n  若间距小于 d：移除数加 1\n  否则：更新上次保留位置\n  返回 移除数不超过 M'
        : '',
      note: `第 ${index + 1} 节只围绕跳石头题目的具体目标和操作展开。`,
    })),
    checkpoint: {
      question: '候选距离 d 可行时，二分下一步应该怎样移动？',
      choices: [
        { id: 'A', text: '尝试更大的距离，寻找最大的可行值' },
        { id: 'B', text: '尝试更小的距离，寻找最容易满足的值' },
        { id: 'C', text: '固定 d，重新枚举所有移除组合' },
      ],
      answer: 'A',
      explanation: '题目要最大化最短跳跃距离。d 已经可行时，答案至少是 d，因此应继续向更大的候选距离搜索。',
    },
  };
}

async function run() {
  const guide = normalizeGuide(makeGuide());
  assert.deepEqual(validateGuide(guide), []);
  assert.equal(guardGuide(guide, analyzeProblem(problem)).pass, true);

  const messages = composeMessages(problem, analyzeProblem(problem));
  assert.match(messages[1].content, /1909 - 跳石头/);
  assert.match(messages[1].content, /problem_picture/);

  const repaired = parseJsonCandidate('{"sections":[{"kind":"problem_picture"} {"kind":"first_attempt",}],}');
  assert.equal(repaired.sections.length, 2);
  assert.equal(repaired.sections[1].kind, 'first_attempt');

  const generated = await generateGuide(problem, {
    model: async () => JSON.stringify(makeGuide()),
  });
  assert.equal(generated.guide.sections.length, 5);
  assert.equal(generated.guide.checkpoint.choices.length, 3);

  const generic = normalizeGuide(makeGuide());
  generic.sections[0].summary = '先观察关系，拆成小问题，再复用旧结果，最后检查条件。'.repeat(12);
  assert.equal(guardGuide(generic, analyzeProblem(problem)).pass, false);

  const fullCode = normalizeGuide(makeGuide());
  fullCode.sections[4].snippet = '#include <iostream>\nint main() { return 0; }';
  assert.equal(guardGuide(fullCode, analyzeProblem(problem)).pass, false);

  console.log('Algorithm coach guide tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
