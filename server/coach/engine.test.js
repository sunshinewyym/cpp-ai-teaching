const assert = require('node:assert/strict');
const {
  analyzeProblem,
  buildLessonPlan,
  createSession,
  deleteSession,
  getSession,
  guardResponse,
  prefetchNext,
  submitProblem,
  submitTurn,
  validateCoachResponse,
  _sessions,
} = require('./engine');

const sequenceProblem = {
  title: '最长递增子序列',
  text: '给定一个长度为 n 的整数序列，求最长严格递增子序列的长度。',
  constraints: '1 <= n <= 100000',
  samples: [{ input: '4\n3 1 2 4', output: '3' }],
};

const graphProblem = {
  title: '迷宫出口',
  text: '给定一个网格迷宫，从起点出发，求是否可以到达终点。',
  constraints: '1 <= n, m <= 500',
};

const basicProblem = {
  title: '两数求和',
  text: '输入两个整数，输出它们的和。',
  constraints: '-100 <= a, b <= 100',
};

const queenProblem = {
  title: '八皇后问题',
  text: '在 8 × 8 棋盘上放置 8 个皇后，使任意两个皇后都不能处于同一行、同一列或同一条对角线上。',
  constraints: '棋盘大小为 8 × 8',
};

const palindromePrimeProblem = {
  title: '1942 - 回文质数 Prime Palindromes',
  text: '151 既是质数又是回文数。找出范围 [a, b] 之间的所有回文质数。',
  constraints: '5 <= a < b <= 100000000',
  samples: [{ input: '5 500', output: '5\n7\n11\n101\n131\n151\n181\n191\n313\n353\n373\n383' }],
};

const jumpStoneProblem = {
  title: '1909 - 跳石头',
  text: '比赛在一条笔直的河道中进行，起点和终点之间有 N 块岩石。选手每一步跳向相邻岩石。组委会至多移走 M 块岩石，希望最短跳跃距离尽可能长。',
  constraints: '0 <= N <= 50000，0 <= M <= N，河道长度 L <= 1000000000',
};

async function makeSession(problem = sequenceProblem, model = null) {
  const created = createSession({ known_topics: ['循环', '数组', '函数'] });
  const first = await submitProblem(created.session_id, problem, { model });
  return { id: created.session_id, first };
}

async function withSession(test, problem = sequenceProblem) {
  const { id, first } = await makeSession(problem);
  try {
    await test(id, first);
  } finally {
    deleteSession(id);
  }
}

async function finishCoach(id, first) {
  const responses = [first.response];
  while (responses.at(-1).stage !== 'COMPLETE') {
    const current = responses.at(-1);
    const input = current.choices.length ? { selected_choice_id: current.choices[0].id } : { action: 'continue' };
    responses.push((await submitTurn(id, input, { model: null })).response);
    assert.ok(responses.length <= 10, '提示路线不应无限延长');
  }
  return responses;
}

function visibleText(response) {
  return [
    response.focus,
    response.key_hint,
    response.coach_message,
    response.question,
    ...response.choices.map((choice) => choice.text),
  ].join('\n');
}

function assertSafe(response) {
  assert.deepEqual(validateCoachResponse(response), []);
  const text = visibleText(response);
  assert.doesNotMatch(text, /#include|\bmain\s*\(|\bcin\s*>>|\bcout\s*<<|```cpp/);
  assert.doesNotMatch(text, /请稍候|正在加载题目|我准备好了|我需要更多时间|重看一遍/);
  assert.doesNotMatch(text, /最小数据|跟着样例手算|确定下一步怎么验证|准备先判断什么/);
  if (response.mode === 'CHECKPOINT') {
    assert.ok(response.choices.length >= 2 && response.choices.length <= 3);
    assert.ok(response.question.trim());
  } else {
    assert.equal(response.choices.length, 0);
    assert.equal(response.question, '');
  }
}

function modelCandidate(overrides = {}) {
  const mode = overrides.mode || 'GUIDE';
  const checkpoint = mode === 'CHECKPOINT';
  return JSON.stringify({
    stage: overrides.stage || 'EXPLORE',
    mode,
    focus: overrides.focus || '抓住关键结构',
    key_hint: overrides.key_hint || '先观察当前位置与前面结果之间的关系。',
    coach_message: overrides.coach_message || '遇到序列问题，先把整体答案拆成每个位置的局部结果。',
    question: checkpoint ? (overrides.question || '哪类信息最值得保存？') : '',
    choices: checkpoint ? (overrides.choices || [
      { id: 'A', text: '每个位置的局部结果', intent: 'local_state' },
      { id: 'B', text: '只保存当前元素', intent: 'current_only' },
    ]) : [],
    hint_level: 3,
    progress: {
      goal_understood: true,
      sample_understood: false,
      candidate_method_found: false,
      method_validated: false,
      ready_for_reflection: false,
    },
    state_patch: {
      primary_blocker: 'no_starting_point',
      last_strategy: 'structure_hint',
      student_evidence: [],
      revealed_insights: [],
    },
  });
}

const tests = [];
function test(name, fn) {
  tests.push([name, fn]);
}

test('P01 首轮直接给关键提示，不先提问', async () => {
  await withSession(async (id, first) => {
    const response = first.response;
    assert.equal(response.stage, 'EXPLORE');
    assert.equal(response.mode, 'GUIDE');
    assert.match(response.key_hint, /位置|局部结果|复用/);
    assert.doesNotMatch(visibleText(response), /题目要求什么|准备好|复述题意/);
    assertSafe(response);
    assert.equal(getSession(id).turn_index, 1);
  });
});

test('P02 提示长度随题目难度变化，并保持单向完成', async () => {
  await withSession(async (id, first) => {
    const responses = await finishCoach(id, first);
    assert.deepEqual(responses.map((item) => item.stage), ['EXPLORE', 'MODEL', 'VALIDATE', 'PLAN', 'PLAN', 'COMPLETE']);
    assert.deepEqual(responses.map((item) => item.mode), ['GUIDE', 'GUIDE', 'CHECKPOINT', 'GUIDE', 'GUIDE', 'SUMMARY']);
    responses.forEach(assertSafe);
    assert.equal(getSession(id).turn_index, 6);
  });

  await withSession(async (id, first) => {
    const responses = await finishCoach(id, first);
    assert.equal(responses.length, 3);
    assert.deepEqual(responses.map((item) => item.mode), ['GUIDE', 'GUIDE', 'SUMMARY']);
  }, basicProblem);
});

test('P03 整条路线最多一次例子检验，简单题可以没有问题', async () => {
  await withSession(async (id, first) => {
    const responses = await finishCoach(id, first);
    assert.equal(responses.filter((item) => item.question).length, 1);
    assert.equal(responses.filter((item) => item.choices.length).length, 1);
  });

  await withSession(async (id, first) => {
    const responses = await finishCoach(id, first);
    assert.equal(responses.filter((item) => item.question).length, 0);
  }, basicProblem);
});

test('P04 每一轮焦点不同，不重复旧问题', async () => {
  await withSession(async (id, first) => {
    const responses = await finishCoach(id, first);
    assert.equal(new Set(responses.map((item) => item.focus)).size, responses.length);
    assert.equal(new Set(responses.map((item) => item.key_hint)).size, responses.length);
  });
});

test('P05 序列题围绕局部结果和复用展开', async () => {
  await withSession(async (id, first) => {
    assert.match(visibleText(first.response), /局部结果|位置|复用/);
    const second = (await submitTurn(id, { action: 'continue' }, { model: null })).response;
    assert.match(visibleText(second), /局部结果|重复计算|位置/);
    assertSafe(second);
  });
});

test('P06 图题围绕节点、边和访问记录展开', async () => {
  await withSession(async (id, first) => {
    assert.match(visibleText(first.response), /节点|边|处理顺序/);
    await submitTurn(id, { action: 'continue' }, { model: null });
    const example = (await submitTurn(id, { action: 'continue' }, { model: null })).response;
    assert.match(visibleText(example), /重复处理|访问过|遇到 D/);
    assertSafe(example);
  }, graphProblem);
});

test('P07 学生提出转移后直接进入当前阶段，不重新问总数或样例', async () => {
  await withSession(async (id) => {
    await submitTurn(id, { action: 'continue' }, { model: null });
    const response = (await submitTurn(id, {
      message: '我想保存每个位置结尾的长度，再从前面能接上的位置转移。',
    }, { model: null })).response;
    assert.equal(response.stage, 'VALIDATE');
    assert.doesNotMatch(visibleText(response), /总数|样例手算|最小数据|题目要求什么/);
    assertSafe(response);
  });
});

test('P08 索要代码时保持边界但继续推进', async () => {
  await withSession(async (id) => {
    const second = (await submitTurn(id, { action: 'continue' }, { model: null })).response;
    const response = (await submitTurn(id, { message: '直接给我完整 C++ 代码。' }, { model: null })).response;
    assert.equal(second.stage, 'MODEL');
    assert.equal(response.stage, 'VALIDATE');
    assert.doesNotMatch(visibleText(response), /#include|main\s*\(|for\s*\(/);
    assertSafe(response);
  });
});

test('P09 模型返回加载占位文案时使用有效兜底提示', async () => {
  await withSession(async (id) => {
    const bad = modelCandidate({
      stage: 'MODEL',
      mode: 'CHECKPOINT',
      coach_message: '请稍候，正在加载题目……',
    });
    const response = (await submitTurn(id, { action: 'continue' }, { model: async () => bad })).response;
    assert.doesNotMatch(visibleText(response), /请稍候|正在加载/);
    assert.match(visibleText(response), /局部结果|重复计算|保存/);
    assertSafe(response);
  });
});

test('P10 模型返回完整代码时使用安全兜底提示', async () => {
  await withSession(async (id) => {
    await submitTurn(id, { action: 'continue' }, { model: null });
    const leaked = modelCandidate({
      stage: 'VALIDATE',
      mode: 'GUIDE',
      key_hint: '#include <iostream>',
      coach_message: 'int main() { for (int i = 0; i < n; i++) {} }',
    });
    const response = (await submitTurn(id, { selected_choice_id: 'A' }, { model: async () => leaked })).response;
    assert.doesNotMatch(visibleText(response), /#include|main\s*\(|for\s*\(/);
    assertSafe(response);
  });
});

test('P11 数学定界符和多余反斜杠会被清理', async () => {
  await withSession(async (id) => {
    const raw = modelCandidate({
      stage: 'MODEL',
      mode: 'CHECKPOINT',
      key_hint: '当 $n=10000$ 时，先估算 $O(n^2)$，并记录第1步。',
      coach_message: '再比较 \\log n 与 n 的增长速度。',
    });
    const response = (await submitTurn(id, { action: 'continue' }, { model: async () => raw })).response;
    assert.doesNotMatch(visibleText(response), /\$|\\/);
    assert.match(visibleText(response), /O\(n\^2\)|log n/);
    assert.match(visibleText(response), /第 1 步/);
    assertSafe(response);
  });
});

test('P12 模型 JSON 不合法时直接兜底，不进行第二次模型请求', async () => {
  await withSession(async (id) => {
    let calls = 0;
    const response = (await submitTurn(id, { action: 'continue' }, {
      model: async () => {
        calls += 1;
        return '不是 JSON';
      },
    })).response;
    assert.equal(calls, 1);
    assertSafe(response);
  });
});

test('P13 CHECKPOINT 强制只有 2～3 个选项', async () => {
  await withSession(async (id) => {
    await submitTurn(id, { action: 'continue' }, { model: null });
    const tooMany = modelCandidate({
      stage: 'MODEL',
      mode: 'CHECKPOINT',
      choices: [
        { id: 'A', text: '选项一', intent: 'one' },
        { id: 'B', text: '选项二', intent: 'two' },
        { id: 'C', text: '选项三', intent: 'three' },
        { id: 'D', text: '选项四', intent: 'four' },
      ],
    });
    const response = (await submitTurn(id, { action: 'continue' }, { model: async () => tooMany })).response;
    assert.ok(response.choices.length >= 2 && response.choices.length <= 3);
    assertSafe(response);
  });
});

test('P14 非 CHECKPOINT 阶段不会保留模型问题', async () => {
  const created = createSession({});
  try {
    const invalidGuide = modelCandidate({
      mode: 'CHECKPOINT',
      question: '你准备好了吗？',
    });
    const { response } = await submitProblem(created.session_id, sequenceProblem, { model: async () => invalidGuide });
    assert.equal(response.mode, 'GUIDE');
    assert.equal(response.question, '');
    assert.equal(response.choices.length, 0);
    assertSafe(response);
  } finally {
    deleteSession(created.session_id);
  }
});

test('P15 完成后不再继续生成新问题', async () => {
  await withSession(async (id, first) => {
    const responses = await finishCoach(id, first);
    const final = responses.at(-1);
    assert.equal(final.stage, 'COMPLETE');
    await assert.rejects(
      () => submitTurn(id, { action: 'continue' }, { model: null }),
      /已经完成/,
    );
  });
});

test('P16 样例冲突时只核对信息，不进入错误推导', async () => {
  const problem = { ...sequenceProblem, sampleConflict: true };
  await withSession(async (id, first) => {
    assert.equal(first.response.stage, 'INGEST');
    assert.equal(first.response.mode, 'CHECKPOINT');
    assert.match(visibleText(first.response), /不一致|核对/);
    assertSafe(first.response);
  }, problem);
});

test('P17 首轮模型给出完整算法摘要时改用结构提示', async () => {
  const created = createSession({});
  try {
    const leaked = modelCandidate({
      stage: 'EXPLORE',
      mode: 'GUIDE',
      key_hint: '维护数组 d，d[i] 表示长度为 i 的递增子序列的最小结尾值。',
      coach_message: '遍历每个数，二分找到第一个大于等于它的位置并更新，最终 d 的长度就是答案。',
    });
    const { response } = await submitProblem(created.session_id, sequenceProblem, { model: async () => leaked });
    assert.doesNotMatch(visibleText(response), /数组 d|d\[i\]|二分|最终.*答案/);
    assert.match(visibleText(response), /局部结果|复用|位置/);
    assertSafe(response);
  } finally {
    deleteSession(created.session_id);
  }
});

test('P18 第二轮选项泄露算法和实现细节时改用概念选项', async () => {
  await withSession(async (id) => {
    const leaked = modelCandidate({
      stage: 'MODEL',
      mode: 'CHECKPOINT',
      key_hint: '维护一个能快速查找的数据结构。',
      coach_message: '可以使用二分查找或线段树优化。',
      question: '你选择哪一种？',
      choices: [
        { id: 'A', text: '维护 tails 数组并二分第一个大于等于当前元素的位置', intent: 'binary' },
        { id: 'B', text: '使用线段树维护前缀最大值', intent: 'segment_tree' },
      ],
    });
    const response = (await submitTurn(id, { action: 'continue' }, { model: async () => leaked })).response;
    assert.doesNotMatch(visibleText(response), /tails|LIS|二分|线段树|树状数组|最小结尾值/i);
    assert.match(visibleText(response), /局部结果|保存|重复计算/);
    assertSafe(response);
  });
});

test('P19 预取不推进轮次，点击后直接使用缓存', async () => {
  const created = createSession({ known_topics: ['循环', '数组'] });
  let calls = 0;
  const model = async () => {
    calls += 1;
    return modelCandidate({ stage: 'MODEL', mode: 'CHECKPOINT' });
  };
  try {
    await submitProblem(created.session_id, sequenceProblem, { model: null });
    const before = getSession(created.session_id);
    const prefetched = await prefetchNext(created.session_id, { model });
    assert.deepEqual(prefetched.ready_keys, ['continue']);
    assert.equal(getSession(created.session_id).turn_index, before.turn_index);
    assert.equal(calls, 1);

    const next = await submitTurn(created.session_id, { action: 'continue' }, { model });
    assert.equal(next.prefetched, true);
    assert.equal(next.response.stage, 'MODEL');
    assert.equal(getSession(created.session_id).turn_index, before.turn_index + 1);
    assert.equal(calls, 1);
  } finally {
    deleteSession(created.session_id);
  }
});

test('P20 选择层会预取全部分支，任意选项都不重复调用模型', async () => {
  const created = createSession({ known_topics: ['循环', '数组'] });
  let calls = 0;
  const model = async () => {
    calls += 1;
    return modelCandidate({ stage: 'VALIDATE', mode: 'GUIDE' });
  };
  try {
    await submitProblem(created.session_id, sequenceProblem, { model: null });
    await submitTurn(created.session_id, { action: 'continue' }, { model: null });
    await submitTurn(created.session_id, { action: 'continue' }, { model: null });
    const before = getSession(created.session_id);
    const prefetched = await prefetchNext(created.session_id, { model });
    assert.deepEqual(prefetched.ready_keys, ['choice:A', 'choice:B', 'choice:C']);
    assert.equal(getSession(created.session_id).turn_index, before.turn_index);
    assert.equal(calls, 3);

    const next = await submitTurn(created.session_id, { selected_choice_id: 'B' }, { model });
    assert.equal(next.prefetched, true);
    assert.equal(next.response.stage, 'PLAN');
    assert.equal(getSession(created.session_id).turn_index, before.turn_index + 1);
    assert.equal(calls, 3);
  } finally {
    deleteSession(created.session_id);
  }
});

test('P21 教学路线由题目画像决定，不包含固定轮次上限', () => {
  const basicAnalysis = analyzeProblem(basicProblem);
  const advancedAnalysis = analyzeProblem(sequenceProblem);
  const basicPlan = buildLessonPlan(basicAnalysis);
  const advancedPlan = buildLessonPlan(advancedAnalysis);
  assert.equal(basicAnalysis.difficulty, 'basic');
  assert.equal(advancedAnalysis.difficulty, 'advanced');
  assert.ok(basicPlan.length < advancedPlan.length);
  assert.equal(basicPlan.filter((phase) => phase.mode === 'CHECKPOINT').length, 0);
  assert.equal(advancedPlan.filter((phase) => phase.mode === 'CHECKPOINT').length, 1);
  assert.equal(advancedPlan.at(-1).stage, 'COMPLETE');
});

test('P22 八皇后首层先建立画面，再讲清冲突和回溯抓手', async () => {
  await withSession(async (id, first) => {
    assert.ok(first.response.key_hint.length >= 80);
    assert.ok(first.response.coach_message.length >= 160);
    assert.match(visibleText(first.response), /按行|城堡|同列|对角线|回溯/);
    const second = (await submitTurn(id, { action: 'continue' }, { model: null })).response;
    assert.match(visibleText(second), /r - c|r \+ c|占用账本/);
    assertSafe(first.response);
    assertSafe(second);
  }, queenProblem);
});

test('P23 LIS 首层用具体接龙例子解释局部账本', async () => {
  await withSession(async (id, first) => {
    assert.ok(first.response.key_hint.length >= 80);
    assert.ok(first.response.coach_message.length >= 160);
    assert.match(visibleText(first.response), /递增接龙|3、18、7|小账本|前面/);
    const responses = await finishCoach(id, first);
    assert.match(visibleText(responses[1]), /dp\[i\]|局部结果|保存|复用/);
    assert.match(responses.map(visibleText).join('\n'), /O\(n\^2\)|O\(n log n\)|严格递增/);
    responses.forEach(assertSafe);
  });
});

test('P24 回文质数先构造候选，再利用整除性质和质数判断筛选', async () => {
  const analysis = analyzeProblem(palindromePrimeProblem);
  assert.equal(analysis.topic, 'palindrome_prime');
  assert.equal(analysis.family, 'number_theory');
  assert.equal(analysis.difficulty, 'advanced');

  await withSession(async (id, first) => {
    assert.match(visibleText(first.response), /先直接生成回文数|偶数位回文数|11|奇数位/);
    const responses = await finishCoach(id, first);
    const route = responses.map(visibleText).join('\n');
    assert.match(route, /12321|镜像|平方根|9999|构造候选/);
    assert.doesNotMatch(route, /先找局部结果|确认这项信息能否由已经处理过的结果得到/);
    responses.forEach(assertSafe);
  }, palindromePrimeProblem);
});

test('P25 回文质数会拦截与题目无关的通用空话', async () => {
  const created = createSession({ known_topics: ['循环', '函数', '数组'] });
  const vague = modelCandidate({
    key_hint: '先写出最直接的做法，再圈出其中反复完成的工作。真正的优化通常来自少做重复工作。',
    coach_message: '先找局部结果，再找旧结果与新结果之间的关系，最后用边界和复杂度验证。',
  });
  try {
    const { response } = await submitProblem(created.session_id, palindromePrimeProblem, { model: async () => vague });
    const text = visibleText(response);
    assert.match(text, /生成回文数|偶数位回文数|11|奇数位/);
    assert.doesNotMatch(text, /先写出最直接的做法|先找局部结果/);
    assertSafe(response);
  } finally {
    deleteSession(created.session_id);
  }
});

test('P26 所有题型都从题面提取锚点并拒绝可复制的空话', async () => {
  const analysis = analyzeProblem(jumpStoneProblem);
  assert.ok(analysis.grounding_anchors.includes('跳石头'));
  assert.ok(analysis.grounding_anchors.some((item) => /河道|岩石|跳跃|距离/.test(item)));

  const created = createSession({});
  try {
    await submitProblem(created.session_id, jumpStoneProblem, { model: null });
    const vague = JSON.parse(modelCandidate({
      key_hint: '先找规模更小但结构相同的子问题，再决定保存什么信息。',
      coach_message: '当前结果应该由更小规模的结果得到，然后再检查复杂度。',
    }));
    const guard = guardResponse(_sessions.get(created.session_id), vague);
    assert.equal(guard.pass, false);
    assert.ok(guard.risk_types.includes('not_grounded_in_problem'));
  } finally {
    deleteSession(created.session_id);
  }
});

test('P27 题面相关的动态提示可通过通用锚点检查', async () => {
  const created = createSession({});
  let requestPayload;
  const grounded = modelCandidate({
    key_hint: '河道中的岩石位置固定，移走至多 M 块岩石后，要让相邻落脚点之间的最短跳跃距离尽可能长。关键是把“求最大值”改成“给定距离能否做到”。',
    coach_message: '先猜一个跳跃距离，再从起点向终点扫描岩石：间距不足的岩石需要移走。若移走数量不超过 M，这个距离可行；否则距离过大。猜测距离越小越容易做到，越大越难做到，因此答案范围里存在一条清晰分界。这样就能利用可行性随距离单向变化的性质，而不必枚举每一种移石方案。',
  });
  try {
    const { response } = await submitProblem(created.session_id, jumpStoneProblem, {
      model: async (messages) => {
        requestPayload = JSON.parse(messages[1].content);
        return grounded;
      },
      allowStaticFallback: false,
    });
    assert.ok(requestPayload.grounding_contract.problem_terms.includes('跳石头'));
    assert.match(requestPayload.grounding_contract.requirement, /至少 2 个.*关键词/);
    assert.ok(requestPayload.fact_contract.immutable_facts.some((item) => /移走.*M.*岩石/.test(item)));
    assert.ok(requestPayload.fact_contract.immutable_facts.some((item) => /最短跳跃距离.*尽可能长/.test(item)));
    assert.match(visibleText(response), /河道|岩石|M|最短跳跃距离|单向变化/);
    assertSafe(response);
  } finally {
    deleteSession(created.session_id);
  }
});

test('P28 上游不可用时明确报错，不再返回静态模板', async () => {
  const created = createSession({});
  try {
    const providerError = new Error('payment required');
    providerError.response = { status: 402 };
    await assert.rejects(
      () => submitProblem(created.session_id, jumpStoneProblem, {
        model: async () => { throw providerError; },
        allowStaticFallback: false,
      }),
      /余额不足.*没有生成提示/,
    );
    assert.equal(getSession(created.session_id).turn_index, 0);
  } finally {
    deleteSession(created.session_id);
  }
});

test('P29 空泛模型输出会重试，仍不合格则拒绝显示', async () => {
  const created = createSession({});
  let calls = 0;
  const vague = modelCandidate({
    key_hint: '先找规模更小但结构相同的子问题。',
    coach_message: '保存足以支持下一步判断的结果，再连接成完整思路。',
  });
  try {
    await assert.rejects(
      () => submitProblem(created.session_id, jumpStoneProblem, {
        model: async () => { calls += 1; return vague; },
        allowStaticFallback: false,
      }),
      /与当前题目充分相关.*通用模板/,
    );
    assert.equal(calls, 2);
    assert.equal(getSession(created.session_id).turn_index, 0);
  } finally {
    deleteSession(created.session_id);
  }
});

test('P30 题面操作和数量角色被偷换时拒绝显示', async () => {
  const created = createSession({});
  try {
    await submitProblem(created.session_id, jumpStoneProblem, { model: null });
    const wrong = JSON.parse(modelCandidate({
      key_hint: '河道里有 N 块岩石，需要选出 M 个位置，让这些位置之间的最短跳跃距离尽可能长。',
      coach_message: '可以从起点开始安排 M 个落脚点，再比较相邻位置的距离。这样既利用了岩石位置，也直接围绕最短跳跃距离展开。',
    }));
    const guard = guardResponse(_sessions.get(created.session_id), wrong);
    assert.equal(guard.pass, false);
    assert.ok(guard.risk_types.includes('fact_conflict'));
  } finally {
    deleteSession(created.session_id);
  }
});

(async () => {
  for (const [name, fn] of tests) {
    await fn();
    console.log(`PASS ${name}`);
  }
  console.log(`Algorithm Coach P0: ${tests.length}/${tests.length} passed`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
