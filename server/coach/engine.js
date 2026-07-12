const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chat } = require('../services/deepseek');
const schema = require('./coach_response.schema.json');

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'algorithmCoach.md'),
  'utf8',
);
const STAGES = schema.properties.stage.enum;
const sessions = new Map();

function envNumber(name, fallback, minimum = 0) {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isFinite(value) && value >= minimum ? value : fallback;
}

const config = {
  maxRounds: envNumber('COACH_MAX_ROUNDS', 16, 5),
  timeoutMs: envNumber('COACH_TIMEOUT_MS', 90000, 1000),
  retries: envNumber('COACH_MODEL_RETRIES', 1, 0),
};

function freshProgress() {
  return {
    goal_understood: false,
    sample_understood: false,
    candidate_method_found: false,
    method_validated: false,
    ready_for_reflection: false,
  };
}

function normalizeStudent(student = {}) {
  const grade = Number(student.grade);
  const gradeBand = grade >= 5 && grade <= 6
    ? 'primary_5_6'
    : (grade >= 7 && grade <= 18 ? 'middle_school' : 'unknown');
  return {
    grade: Number.isFinite(grade) ? grade : null,
    grade_band: gradeBand,
    known_topics: Array.isArray(student.known_topics)
      ? student.known_topics.map(String).slice(0, 20)
      : [],
    preferred_representation: String(student.preferred_style || 'example'),
    current_confidence: 'unknown',
    persistence_state: 'engaged',
    reasoning_evidence: [],
  };
}

function createSession(student = {}) {
  const now = new Date().toISOString();
  const session = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    stage: 'INGEST',
    turnIndex: 0,
    problem: null,
    problemAnalysis: null,
    studentModel: normalizeStudent(student),
    primaryBlocker: 'goal_unknown',
    progress: freshProgress(),
    history: [],
    hintHistory: [],
    strategyHistory: [],
    revealedInsights: [],
    stalledTurns: 0,
    lastResponse: null,
  };
  sessions.set(session.id, session);
  console.info(`[Coach] session created ${session.id}`);
  return publicSession(session);
}

function getSessionOrThrow(id) {
  const session = sessions.get(id);
  if (!session) {
    const error = new Error('教练会话不存在或已结束。');
    error.status = 404;
    throw error;
  }
  return session;
}

function publicSession(session) {
  return {
    session_id: session.id,
    stage: session.stage,
    turn_index: session.turnIndex,
    max_rounds: config.maxRounds,
    problem: session.problem ? { title: session.problem.title, submitted: true } : null,
    student: {
      grade: session.studentModel.grade,
      grade_band: session.studentModel.grade_band,
      known_topics: session.studentModel.known_topics,
    },
    progress: { ...session.progress },
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  };
}

function normalizeProblem(input = {}) {
  const problem = input.problem && typeof input.problem === 'object' ? input.problem : input;
  const text = String(problem.text || problem.description || '').trim().slice(0, 30000);
  if (!text) {
    const error = new Error('请先提供完整题目描述。');
    error.status = 400;
    throw error;
  }
  return {
    title: String(problem.title || '未命名题目').trim().slice(0, 160),
    text,
    constraints: String(problem.constraints || '').trim().slice(0, 4000),
    samples: Array.isArray(problem.samples)
      ? problem.samples.slice(0, 8).map((sample) => ({
        input: String(sample.input || '').slice(0, 3000),
        output: String(sample.output || '').slice(0, 3000),
      }))
      : [],
    sampleConflict: Boolean(problem.sampleConflict),
  };
}

function analyzeProblem(problem) {
  const source = `${problem.title}\n${problem.text}\n${problem.constraints}`;
  const families = [];
  const add = (type, pattern) => pattern.test(source) && families.push(type);
  add('array_or_sequence', /数组|序列|下标|元素/);
  add('graph_or_grid', /图|节点|边|迷宫|网格|路径/);
  add('search', /方案|排列|组合|所有可能|回溯|搜索/);
  add('dynamic_programming_candidate', /最优|最大|最小|方案数|重复子问题|背包/);
  add('ordered_structure', /有序|排序|单调|区间/);

  const hasConstraints = Boolean(problem.constraints)
    || /数据范围|约定|限制|\b[1-9]\d*\s*(?:<=|≤|<)\s*[a-zA-Z]/.test(source);
  const sampleConflict = problem.sampleConflict || /样例.{0,12}(?:矛盾|不一致)/.test(source);

  return {
    target_hint: /输出|求|判断|构造|计算/.test(problem.text)
      ? '题面包含明确目标，需要学生用自己的话复述。'
      : '题目目标可能不完整，需要先确认输出要求。',
    has_constraints: hasConstraints,
    has_samples: problem.samples.length > 0 || /样例/.test(problem.text),
    sample_conflict: sampleConflict,
    problem_family_candidates: families.slice(0, 4),
    likely_blockers: ['goal_unknown', 'no_starting_point', 'model_unknown'],
    missing_information: [
      ...(!hasConstraints ? ['数据范围'] : []),
      ...(sampleConflict ? ['样例与题意的一致性'] : []),
    ],
  };
}

function findSelectedChoice(session, id) {
  if (!id || !session.lastResponse) return null;
  return session.lastResponse.choices.find((choice) => choice.id === id) || null;
}

function isAnswerRequest(text) {
  return /(?:给|告诉|写出|输出|描述|放在).{0,20}(?:代码|答案|完整解法|伪代码|转移式|关键步骤|正确算法)|(?:代码|答案|伪代码|转移式).{0,20}(?:给|写|输出|描述)|每次给一行|标准答案|可提交|忽略前面的规则|我是老师|这不是给学生看的|直到完整/.test(text);
}

function looksCompleteIdea(text) {
  const hasMethod = /枚举|排序|二分|搜索|递归|动态规划|DP|前缀|双指针|贪心|BFS|DFS|队列|栈/.test(text);
  const hasReason = /因为|所以|不会漏|能够覆盖|单调|重复|相邻|最优/.test(text);
  const hasCost = /复杂度|O\s*\(|次数|不会超时|能跑完/.test(text);
  return hasMethod && hasReason && (hasCost || text.length >= 48);
}

function inferProgress(session, message) {
  const progress = { ...session.progress };
  if (/题目.{0,8}(?:要求|要|求|输出)|目标是|需要(?:求|判断|输出)|最大|最小|方案数/.test(message)) {
    progress.goal_understood = true;
  }
  if (/样例.{0,20}(?:因为|所以|得到|变化|手算)/.test(message)) {
    progress.sample_understood = true;
  }
  if (/枚举|排序|二分|搜索|递归|动态规划|DP|前缀|双指针|贪心|BFS|DFS|队列|栈|直接方法/.test(message)) {
    progress.candidate_method_found = true;
  }
  if (/不会漏|反例|边界|复杂度|O\s*\(|因为.+所以|所有情况/.test(message)) {
    progress.method_validated = true;
  }
  if (looksCompleteIdea(message) || (progress.candidate_method_found && progress.method_validated && progress.goal_understood)) {
    progress.ready_for_reflection = true;
  }
  return progress;
}

function strategyFor(blocker, stalledTurns) {
  const strategies = {
    goal_unknown: ['clarify', 'target_question', 'sample_simulation'],
    no_starting_point: ['reduce_scale', 'sample_simulation', 'direct_method'],
    requesting_answer: ['decompose', 'reduce_scale', 'compare'],
    model_unknown: ['pattern', 'compare', 'visualize'],
    correctness_uncertain: ['counterexample', 'boundary', 'simulate'],
    complexity_uncertain: ['complexity', 'reduce_scale', 'compare'],
    ready_for_reflection: ['reflect', 'transfer', 'boundary'],
    input_inconsistent: ['clarify', 'sample_simulation', 'target_question'],
  };
  const candidates = strategies[blocker] || ['decompose', 'example', 'compare'];
  return candidates[Math.min(stalledTurns, candidates.length - 1)];
}

function planTurn(session, input = {}, initial = false) {
  const message = String(input.message || '').trim().slice(0, 2000);
  const selected = findSelectedChoice(session, input.selected_choice_id);
  const intent = selected?.intent || '';
  const signal = `${message} ${intent} ${selected?.text || ''}`;
  const progress = inferProgress(session, message);
  let stage = session.stage === 'INGEST' ? 'DIAGNOSE' : session.stage;
  let blocker = session.primaryBlocker;
  let hintLevel = session.lastResponse?.hint_level ?? 0;

  if (session.problemAnalysis?.sample_conflict) {
    stage = 'INGEST';
    blocker = 'input_inconsistent';
    hintLevel = 0;
  } else if (initial) {
    stage = 'DIAGNOSE';
    blocker = 'no_starting_point';
    hintLevel = 0;
  } else if (isAnswerRequest(signal)) {
    stage = session.progress.goal_understood ? 'EXPLORE' : 'DIAGNOSE';
    blocker = 'requesting_answer';
    hintLevel = Math.min(2, hintLevel + 1);
  } else if (session.stage === 'REFLECT' && message.length >= 6) {
    stage = 'COMPLETE';
    blocker = 'ready_for_reflection';
    hintLevel = 1;
  } else if (progress.ready_for_reflection || looksCompleteIdea(message)) {
    stage = 'REFLECT';
    blocker = 'ready_for_reflection';
    hintLevel = Math.max(1, Math.min(3, hintLevel));
  } else if (/看不懂|没看懂|题意不清|不知道.*(?:求|输出)|goal_unknown/.test(signal)) {
    stage = 'UNDERSTAND';
    blocker = 'goal_unknown';
    hintLevel = Math.min(1, hintLevel + 1);
  } else if (/完全没思路|不知道.*(?:开始|第一步)|no_starting_point|先看小例子|sample/.test(signal)) {
    stage = 'EXPLORE';
    blocker = 'no_starting_point';
    hintLevel = Math.min(2, hintLevel + 1);
  } else if (/claims understanding|goal_understood|题意懂|我知道要|找.{0,12}(?:最大|最小|长度|数量|是否)/i.test(signal)) {
    stage = 'EXPLORE';
    blocker = 'no_starting_point';
    hintLevel = Math.max(1, hintLevel);
  } else if (/是不是.*二分|二分/.test(signal)) {
    stage = 'MODEL';
    blocker = 'model_unknown';
    hintLevel = Math.max(3, hintLevel);
  } else if (/每次.*(?:最大|最小)|贪心|greedy/.test(signal)) {
    stage = 'VALIDATE';
    blocker = 'correctness_uncertain';
    hintLevel = Math.max(2, hintLevel);
  } else if (/复杂度|会不会超时|快不快|次数|O\s*\(/.test(message)) {
    stage = 'VALIDATE';
    blocker = 'complexity_uncertain';
    hintLevel = Math.max(2, hintLevel);
  } else if (progress.goal_understood && !progress.candidate_method_found) {
    stage = 'EXPLORE';
    blocker = 'no_starting_point';
    hintLevel = Math.max(1, hintLevel);
  } else if (progress.candidate_method_found) {
    stage = 'VALIDATE';
    blocker = 'correctness_uncertain';
    hintLevel = Math.max(2, hintLevel);
  }

  const strategy = strategyFor(blocker, session.stalledTurns);
  return { message, selected, intent, progress, stage, blocker, hintLevel, strategy, initial };
}

function makeChoices(items) {
  return items.map(([text, intent], index) => ({
    id: String.fromCharCode(65 + index),
    text,
    intent,
  }));
}

function choicesFor(decision) {
  const sets = {
    input_inconsistent: [
      ['先核对题目目标', 'check_goal'],
      ['先核对样例过程', 'check_sample'],
      ['我可以补充缺少的信息', 'supply_missing'],
      ['我想说明哪里矛盾', 'free_expression'],
    ],
    requesting_answer: [
      ['我还没有想到方法', 'no_starting_point'],
      ['我有方法，想先验证', 'validate_idea'],
      ['我主要卡在边界情况', 'check_boundary'],
      ['我想自己说说思路', 'free_expression'],
    ],
    goal_unknown: [
      ['我不清楚最后要输出什么', 'goal_unknown'],
      ['我看不懂一个关键条件', 'condition_misread'],
      ['我想先照着样例算一步', 'sample'],
      ['我想用自己的话复述题意', 'free_expression'],
    ],
    no_starting_point: [
      ['先试一组最小数据', 'reduce_scale'],
      ['先跟着样例手算一步', 'sample'],
      ['先想最直接的检查方法', 'direct_method'],
      ['我想自己提出一个办法', 'free_expression'],
    ],
    model_unknown: [
      ['先观察判断结果怎样变化', 'observe_change'],
      ['先写出可能的答案范围', 'identify_range'],
      ['我还不确定这个想法是否适用', 'need_validation'],
      ['我想解释为什么想到它', 'free_expression'],
    ],
    correctness_uncertain: [
      ['找一个最小反例试试', 'counterexample'],
      ['先把选择规则说清楚', 'clarify_rule'],
      ['检查最小值和重复值', 'check_boundary'],
      ['我想自己验证这个想法', 'free_expression'],
    ],
    complexity_uncertain: [
      ['先估算执行次数', 'estimate_complexity'],
      ['先确认数据范围', 'check_constraints'],
      ['先找重复或无效工作', 'find_repetition'],
      ['我想说说自己的估算', 'free_expression'],
    ],
    ready_for_reflection: [
      ['总结最关键的观察', 'reflect_key_turn'],
      ['说明直接方法慢在哪里', 'reflect_complexity'],
      ['再检查一个边界情况', 'reflect_boundary'],
      ['我想用自己的话总结', 'free_expression'],
    ],
  };
  return makeChoices(sets[decision.blocker] || sets.no_starting_point);
}

function ensureFreeExpressionChoice(response, decision) {
  if (decision.initial || decision.stage === 'DIAGNOSE') {
    response.choices = choicesFor(decision);
    return;
  }
  const hasFreeExpression = response.choices.some((choice) => (
    choice.intent === 'free_expression' || /自己|说说|补充|这些都不是|我的想法/.test(choice.text)
  ));
  if (!hasFreeExpression) {
    response.choices[response.choices.length - 1] = {
      id: response.choices[response.choices.length - 1].id,
      text: '我想自己说说思路',
      intent: 'free_expression',
    };
  }
}

function fallbackMessage(session, decision) {
  const primary = session.studentModel.grade_band === 'primary_5_6';
  const missingRange = !session.problemAnalysis?.has_constraints;
  const messages = {
    input_inconsistent: '题目条件和样例似乎有不一致。先不猜解法，这一轮只核对：样例中的输出是否真的符合题目目标？',
    requesting_answer: '我不会直接给代码或完整答案。我们只做一件事：先确定你是没有方法，还是已经有方法但不会验证。',
    goal_unknown: primary
      ? '先不想算法。请用一句话说：题目最后要你得到什么？'
      : '先不讨论算法。请只确认题目的最终目标：要计算、判断，还是构造什么结果？',
    no_starting_point: primary
      ? '先把题目变小。取一组最小合法数据，只手算第一步会发生什么。'
      : '先不追求最快方法。取一组最小合法数据，只手算第一步，看看需要检查哪些情况。',
    model_unknown: '先不急着确认算法名称。只检查一个条件：候选值变大时，题目的判断结果会不会始终只朝一个方向变化？',
    correctness_uncertain: '先不判断这个选择规则对不对。请构造一个最小例子：当前看起来最好的选择，会不会挡住后面两个可以同时选择的方案？',
    complexity_uncertain: missingRange
      ? '题面没有给出数据范围，现在不能判断方法是否会超时。先只确认：你的方法会检查多少种情况？'
      : '这一轮只估算工作量：把数据规模代入你想到的方法，大约会执行多少次检查？',
    ready_for_reflection: decision.stage === 'COMPLETE'
      ? '你已经完成了本题的思路梳理。最后记住这次真正有效的方法：先用小数据验证，再用条件和复杂度检查自己的想法。'
      : '你已经说出了方法和理由。先不补实现，请只总结：这题最关键的观察是什么？',
  };
  return messages[decision.blocker] || messages.no_starting_point;
}

function safeFallback(session, decision, guarded = false) {
  const prefix = guarded ? '刚才的回答给得太多，我把提示收窄。' : '';
  return {
    stage: decision.stage,
    coach_message: `${prefix}${fallbackMessage(session, decision)}`,
    focus: {
      input_inconsistent: '核对题意与样例',
      requesting_answer: '定位当前真正卡点',
      goal_unknown: '说清题目目标',
      no_starting_point: '从最小数据开始',
      model_unknown: '验证结构是否成立',
      correctness_uncertain: '用小例子检验猜想',
      complexity_uncertain: '估算方法工作量',
      ready_for_reflection: decision.stage === 'COMPLETE' ? '完成本题复盘' : '总结关键转折',
    }[decision.blocker] || '完成下一小步',
    choices: choicesFor(decision),
    hint_level: decision.hintLevel,
    progress: decision.progress,
    state_patch: {
      primary_blocker: decision.blocker,
      last_strategy: decision.strategy,
      student_evidence: [],
      revealed_insights: [],
    },
  };
}

function parseJsonCandidate(raw) {
  let text = String(raw || '').trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (error) {
    return null;
  }
}

function validateCoachResponse(value) {
  const errors = [];
  const allowedKeys = Object.keys(schema.properties);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['响应必须是 JSON 对象'];
  for (const key of schema.required) if (!(key in value)) errors.push(`缺少字段 ${key}`);
  for (const key of Object.keys(value)) if (!allowedKeys.includes(key)) errors.push(`不允许字段 ${key}`);
  if (!STAGES.includes(value.stage)) errors.push('stage 无效');
  if (typeof value.coach_message !== 'string' || !value.coach_message.trim() || value.coach_message.length > 600) errors.push('coach_message 无效');
  if (typeof value.focus !== 'string' || !value.focus.trim() || value.focus.length > 100) errors.push('focus 无效');
  if (!Number.isInteger(value.hint_level) || value.hint_level < 0 || value.hint_level > 5) errors.push('hint_level 无效');
  if (!Array.isArray(value.choices) || value.choices.length < 3 || value.choices.length > 5) {
    errors.push('choices 数量无效');
  } else {
    const ids = new Set();
    const texts = new Set();
    value.choices.forEach((choice, index) => {
      if (!choice || typeof choice !== 'object') return errors.push(`choice ${index} 无效`);
      if (!/^[A-E]$/.test(choice.id || '')) errors.push(`choice ${index} id 无效`);
      if (ids.has(choice.id)) errors.push('choice id 重复');
      ids.add(choice.id);
      if (typeof choice.text !== 'string' || !choice.text.trim() || choice.text.length > 60) errors.push(`choice ${index} text 无效`);
      if (texts.has(choice.text)) errors.push('choice text 重复');
      texts.add(choice.text);
      if (typeof choice.intent !== 'string' || !choice.intent.trim() || choice.intent.length > 80) errors.push(`choice ${index} intent 无效`);
      for (const key of Object.keys(choice)) if (!['id', 'text', 'intent'].includes(key)) errors.push(`choice ${index} 含额外字段`);
    });
  }
  const progressKeys = ['goal_understood', 'sample_understood', 'candidate_method_found', 'method_validated', 'ready_for_reflection'];
  if (!value.progress || typeof value.progress !== 'object') errors.push('progress 无效');
  else for (const key of progressKeys) if (typeof value.progress[key] !== 'boolean') errors.push(`progress.${key} 无效`);
  if (!value.state_patch || typeof value.state_patch !== 'object') errors.push('state_patch 无效');
  else {
    if (typeof value.state_patch.primary_blocker !== 'string') errors.push('state_patch.primary_blocker 无效');
    if (typeof value.state_patch.last_strategy !== 'string') errors.push('state_patch.last_strategy 无效');
    if (!Array.isArray(value.state_patch.student_evidence)) errors.push('state_patch.student_evidence 无效');
  }
  return errors;
}

function guardResponse(session, response) {
  const text = [response.coach_message, response.focus, ...response.choices.map((choice) => choice.text)].join('\n');
  const risks = [];
  if (/```(?:cpp|c\+\+)|#include|using\s+namespace|\bmain\s*\(|\b(?:for|while)\s*\(|\bcin\s*>>|\bcout\s*<<|\breturn\s+[^；。\n]+;/.test(text)) risks.push('code');
  if ((text.match(/(?:^|\n)\s*(?:\d+[.、]|步骤[一二三四五六])/g) || []).length >= 3) risks.push('full_pseudocode');
  if ((text.match(/先|然后|接着|随后|最后|否则|直到/g) || []).length >= 5) risks.push('full_flow');

  const dpSignals = [
    /(?:dp\s*\[|状态.{0,10}表示)/i,
    /(?:转移|dp.{0,20}=)/i,
    /初始化|初始值/,
    /答案.{0,8}(?:在|是)|最终状态/,
    /遍历顺序|从后往前|从前往后枚举/,
  ].filter((pattern) => pattern.test(text)).length;
  if (dpSignals >= 4) risks.push('dp_leakage');

  const searchSignals = [
    /递归|DFS|深搜/i,
    /终止条件|递归出口/,
    /每层.{0,8}(?:选择|枚举)|遍历所有分支/,
    /撤销|回溯还原/,
    /访问标记|去重/,
  ].filter((pattern) => pattern.test(text)).length;
  if (searchSignals >= 4) risks.push('search_leakage');

  if (/笨|愚蠢|这么简单|你错了|太差/.test(text)) risks.push('shaming');
  if (response.hint_level <= 2 && /动态规划|二分查找|双指针|前缀和|并查集|最短路/.test(text)) risks.push('algorithm_name_too_early');
  const newInsights = Array.isArray(response.state_patch.revealed_insights)
    ? response.state_patch.revealed_insights.filter(Boolean)
    : [];
  if (newInsights.length > 1) risks.push('multiple_insights');
  if (session.revealedInsights.length >= 3 && newInsights.length && response.stage !== 'REFLECT' && response.stage !== 'COMPLETE') {
    risks.push('cumulative_leakage');
  }
  return { pass: risks.length === 0, risk_types: risks };
}

function composeMessages(session, input, decision) {
  const recent = session.history.slice(-6).map((item) => ({
    student: item.student_message,
    coach: item.coach_message,
    stage: item.stage,
  }));
  const payload = {
    problem: session.problem,
    safe_problem_analysis: session.problemAnalysis,
    student: {
      grade_band: session.studentModel.grade_band,
      known_topics: session.studentModel.known_topics,
    },
    session: {
      stage: session.stage,
      turn_index: session.turnIndex,
      progress: session.progress,
      primary_blocker: decision.blocker,
      revealed_insights: session.revealedInsights,
      recent_turns: recent,
    },
    current_input: {
      message: decision.message,
      selected_choice_intent: decision.intent || null,
    },
    this_turn_only: {
      stage: decision.stage,
      strategy: decision.strategy,
      hint_level: decision.hintLevel,
      rule: '只推进一个认知单元。输出纯 JSON，不要 Markdown 代码围栏。',
    },
    response_schema: schema,
  };
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(payload) },
  ];
}

async function callModelWithRetry(model, messages) {
  let lastError;
  for (let attempt = 0; attempt <= config.retries; attempt += 1) {
    try {
      return await model(messages, {
        temperature: 0.3,
        max_tokens: 1800,
        timeout: config.timeoutMs,
        response_format: { type: 'json_object' },
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function modelResponse(session, input, decision, model) {
  const messages = composeMessages(session, input, decision);
  const raw = await callModelWithRetry(model, messages);
  let parsed = parseJsonCandidate(raw);
  let errors = validateCoachResponse(parsed);
  if (!parsed || errors.length) {
    const repairMessages = [
      { role: 'system', content: '你是 JSON 修复器。只修复格式和字段，不增加解题信息，只输出 JSON。' },
      { role: 'user', content: JSON.stringify({ invalid_response: String(raw).slice(0, 12000), errors, schema }) },
    ];
    parsed = parseJsonCandidate(await callModelWithRetry(model, repairMessages));
    errors = validateCoachResponse(parsed);
  }
  if (!parsed || errors.length) throw new Error(`模型响应不符合 Schema：${errors.join('；')}`);
  return parsed;
}

function studentEvidence(session, decision) {
  const evidence = [];
  if (decision.message && !isAnswerRequest(decision.message)) {
    evidence.push({
      source: 'student',
      turn: session.turnIndex + 1,
      text: decision.message.slice(0, 240),
    });
  }
  if (decision.selected) {
    evidence.push({
      source: 'system_prompted',
      turn: session.turnIndex + 1,
      text: decision.selected.text,
    });
  }
  return evidence;
}

function applyState(session, response, decision) {
  const before = JSON.stringify(session.progress);
  const evidence = studentEvidence(session, decision);
  const strongEvidence = evidence.filter((item) => item.source === 'student').map((item) => item.text);
  const insights = Array.isArray(response.state_patch.revealed_insights)
    ? response.state_patch.revealed_insights.filter(Boolean).slice(0, 1)
    : [];

  response.stage = decision.stage;
  response.hint_level = decision.hintLevel;
  response.progress = { ...decision.progress };
  response.state_patch = {
    primary_blocker: decision.blocker,
    last_strategy: decision.strategy,
    student_evidence: strongEvidence,
    revealed_insights: insights,
  };

  session.stage = response.stage;
  session.primaryBlocker = decision.blocker;
  session.progress = { ...response.progress };
  session.turnIndex += 1;
  session.updatedAt = new Date().toISOString();
  session.studentModel.reasoning_evidence.push(...evidence);
  session.hintHistory.push({ turn: session.turnIndex, level: response.hint_level, strategy: decision.strategy });
  session.strategyHistory.push(decision.strategy);
  for (const insight of insights) if (!session.revealedInsights.includes(insight)) session.revealedInsights.push(insight);
  session.history.push({
    turn: session.turnIndex,
    student_message: decision.message || decision.selected?.text || '',
    student_source: decision.message ? 'student' : (decision.selected ? 'system_prompted' : 'none'),
    coach_message: response.coach_message,
    focus: response.focus,
    stage: response.stage,
  });
  session.stalledTurns = before === JSON.stringify(session.progress) ? session.stalledTurns + 1 : 0;
  session.lastResponse = response;
  return response;
}

async function runTurn(session, input = {}, options = {}) {
  const initial = Boolean(options.initial);
  if (!initial && session.turnIndex >= config.maxRounds) {
    const error = new Error(`本题已达到 ${config.maxRounds} 轮，请先完成复盘或重新开始。`);
    error.status = 409;
    throw error;
  }
  const decision = planTurn(session, input, initial);
  let response;
  const model = Object.prototype.hasOwnProperty.call(options, 'model') ? options.model : chat;

  if (!model) {
    response = safeFallback(session, decision);
  } else {
    try {
      response = await modelResponse(session, input, decision, model);
    } catch (error) {
      console.warn(`[Coach] model fallback ${session.id}: ${error.message}`);
      response = safeFallback(session, decision);
    }
  }

  response.stage = decision.stage;
  response.hint_level = decision.hintLevel;
  response.progress = { ...decision.progress };
  response.state_patch = {
    primary_blocker: decision.blocker,
    last_strategy: decision.strategy,
    student_evidence: [],
    revealed_insights: Array.isArray(response.state_patch?.revealed_insights)
      ? response.state_patch.revealed_insights.slice(0, 1)
      : [],
  };
  ensureFreeExpressionChoice(response, decision);

  const guard = guardResponse(session, response);
  if (!guard.pass) {
    console.warn(`[Coach] response rewritten ${session.id}: ${guard.risk_types.join(',')}`);
    response = safeFallback(session, decision, true);
  }
  const finalErrors = validateCoachResponse(response);
  if (finalErrors.length) response = safeFallback(session, decision, true);
  return applyState(session, response, decision);
}

async function submitProblem(id, input, options = {}) {
  const session = getSessionOrThrow(id);
  session.problem = normalizeProblem(input);
  session.problemAnalysis = analyzeProblem(session.problem);
  session.stage = 'INGEST';
  session.progress = freshProgress();
  const response = await runTurn(session, {}, { ...options, initial: true });
  return { response, session: publicSession(session) };
}

async function submitTurn(id, input = {}, options = {}) {
  const session = getSessionOrThrow(id);
  if (!session.problem) {
    const error = new Error('请先提交题目。');
    error.status = 409;
    throw error;
  }
  const message = String(input.message || '').trim();
  const choiceId = String(input.selected_choice_id || '').trim();
  if (!message && !choiceId) {
    const error = new Error('请输入你的想法，或选择一个选项。');
    error.status = 400;
    throw error;
  }
  if (choiceId && !/^[A-E]$/.test(choiceId)) {
    const error = new Error('选项编号无效。');
    error.status = 400;
    throw error;
  }
  const response = await runTurn(session, { message, selected_choice_id: choiceId || null }, options);
  return { response, session: publicSession(session) };
}

function getSession(id) {
  return publicSession(getSessionOrThrow(id));
}

function deleteSession(id) {
  if (!sessions.delete(id)) getSessionOrThrow(id);
  console.info(`[Coach] session deleted ${id}`);
}

module.exports = {
  analyzeProblem,
  createSession,
  deleteSession,
  getSession,
  guardResponse,
  planTurn,
  submitProblem,
  submitTurn,
  validateCoachResponse,
  _sessions: sessions,
};
