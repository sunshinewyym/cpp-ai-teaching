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
const MODES = schema.properties.mode.enum;
const sessions = new Map();
const prefetchJobs = new Map();

function envNumber(name, fallback, minimum = 0) {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isFinite(value) && value >= minimum ? value : fallback;
}

const config = {
  timeoutMs: envNumber('COACH_TIMEOUT_MS', 45000, 1000),
  modelRetries: envNumber('COACH_MODEL_RETRIES', 1, 0),
};

const GROUNDING_STOP_WORDS = new Set([
  '题目', '描述', '输入', '输出', '样例', '数据', '范围', '限制', '约定', '程序',
  '一个', '一些', '所有', '其中', '之间', '当前', '进行', '可以', '需要', '使得',
  '已经', '由于', '因此', '如果', '那么', '以及', '分别', '给定', '要求', '结果',
  '整数', '正整数', '一行', '第一行', '第二行', '第三行', '尽可能', '问题',
]);

function extractProblemAnchors(problem) {
  const scores = new Map();
  const add = (raw, weight) => {
    const token = String(raw || '').trim();
    if (!token || GROUNDING_STOP_WORDS.has(token)) return;
    const isHan = /^\p{Script=Han}+$/u.test(token);
    if ((isHan && (token.length < 2 || token.length > 12))
      || (!isHan && !/^[A-Za-z][A-Za-z0-9_]{1,15}$/.test(token) && !/^\d[\d,.]{1,14}$/.test(token))) return;
    scores.set(token, (scores.get(token) || 0) + weight);
  };
  const title = String(problem.title || '')
    .replace(/^\s*\d+\s*[-—–:]\s*/, '')
    .replace(/[A-Za-z][A-Za-z\s-]*$/g, '')
    .trim();
  add(title, 20);

  const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
  const scan = (value, weight) => {
    for (const item of segmenter.segment(String(value || '').slice(0, 8000))) {
      if (item.isWordLike) add(item.segment, weight);
    }
  };
  scan(title, 8);
  scan(problem.text, 2);
  scan(problem.constraints, 3);

  return [...scores.entries()]
    .sort((left, right) => right[1] - left[1] || right[0].length - left[0].length)
    .slice(0, 24)
    .map(([token]) => token);
}

function extractProblemFacts(problem) {
  const source = `${problem.text || ''}\n${problem.constraints || ''}`
    .replace(/【[^】]+】/g, '\n');
  const seen = new Set();
  return source
    .split(/[。！？；\n]+/)
    .map((sentence) => sentence.trim().replace(/\s+/g, ' '))
    .filter((sentence) => sentence.length >= 8 && sentence.length <= 220)
    .map((sentence, index) => {
      let score = 0;
      if (/至多|至少|最多|最少|恰好|不超过|不得|必须/.test(sentence)) score += 5;
      if (/移走|移除|删除|删去|去掉|选择|选出|保留|放置|修改|交换|跳向|经过/.test(sentence)) score += 5;
      if (/尽可能|最大|最小|最长|最短|求出|输出/.test(sentence)) score += 5;
      if (/\b[A-Za-z][A-Za-z0-9_]*\b|\d|≤|≥|<|>/.test(sentence)) score += 3;
      return { sentence, score, index };
    })
    .filter(({ sentence }) => {
      if (seen.has(sentence)) return false;
      seen.add(sentence);
      return true;
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, 12)
    .map(({ sentence }) => sentence);
}

const QUANTITY_OPERATION_GROUPS = {
  remove: '移走|移除|删除|删去|去掉|拿走',
  select: '选出|选择|保留|留下|放置|安排',
};

function extractQuantityOperations(value) {
  const operations = [];
  const sentences = String(value || '').split(/[。！？；\n]+/).filter(Boolean);
  for (const sentence of sentences) {
    for (const [kind, verbs] of Object.entries(QUANTITY_OPERATION_GROUPS)) {
      const after = new RegExp(`(?:${verbs})[^，,]{0,18}?\\b([A-Za-z][A-Za-z0-9_]*|\\d+)\\b`, 'gi');
      const before = new RegExp(`\\b([A-Za-z][A-Za-z0-9_]*|\\d+)\\b[^，,]{0,12}?(?:${verbs})`, 'gi');
      for (const pattern of [after, before]) {
        let match;
        while ((match = pattern.exec(sentence))) {
          operations.push({ kind, quantity: match[1].toLowerCase(), sentence });
        }
      }
    }
  }
  return operations;
}

function quantityRoleConflicts(problem, response) {
  const expected = extractQuantityOperations(`${problem.text}\n${problem.constraints}`);
  const actual = extractQuantityOperations(visibleText(response));
  return expected.filter((fact) => actual.some((candidate) => {
    if (candidate.quantity !== fact.quantity || candidate.kind === fact.kind) return false;
    const expectedVerb = new RegExp(QUANTITY_OPERATION_GROUPS[fact.kind]);
    return !expectedVerb.test(candidate.sentence);
  }));
}

const PHASE_LIBRARY = {
  check_input: {
    stage: 'INGEST',
    mode: 'CHECKPOINT',
    focus: '先核对题面',
    blocker: 'input_inconsistent',
    strategy: 'check_input',
    hintLevel: 1,
    objective: '指出题意与样例存在冲突，只询问学生准备核对哪一项。',
  },
  structure_hint: {
    stage: 'EXPLORE',
    mode: 'GUIDE',
    focus: '抓住关键结构',
    blocker: 'no_starting_point',
    strategy: 'structure_hint',
    hintLevel: 3,
    objective: '先用贴合题目的类比或画面翻译题意，再讲清核心矛盾和第一步抓手，让学生立即知道从哪里下手。不要提问，也不要只给抽象方向。',
  },
  decompose_problem: {
    stage: 'MODEL',
    mode: 'GUIDE',
    focus: '拆成可复用的小问题',
    blocker: 'model_unknown',
    strategy: 'decompose_problem',
    hintLevel: 3,
    objective: '把整体目标拆成可以复用的局部问题，明确说明保存什么、为什么这项信息足够，并用当前题目的对象解释含义。不要提问。',
  },
  example_check: {
    stage: 'VALIDATE',
    mode: 'CHECKPOINT',
    focus: '用一个例子检验理解',
    blocker: 'correctness_uncertain',
    strategy: 'example_check',
    hintLevel: 4,
    objective: '先把一个具体小例子走到关键一步，再用一个问题检验学生是否理解这一个关系。恰好提出一个问题，并给出 2～3 个题目相关选项。',
  },
  explain_connection: {
    stage: 'PLAN',
    mode: 'GUIDE',
    focus: '连成完整思路',
    blocker: 'plan_incomplete',
    strategy: 'explain_connection',
    hintLevel: 4,
    objective: '根据前面的提示或学生对例子的选择，把状态、因果关系和处理顺序连成完整思路，并解释最容易漏掉的一步。不要提问。',
  },
  complexity_check: {
    stage: 'PLAN',
    mode: 'GUIDE',
    focus: '确认复杂度和边界',
    blocker: 'complexity_uncertain',
    strategy: 'complexity_check',
    hintLevel: 5,
    objective: '只补充这道复杂题真正需要检查的复杂度或边界条件。不要提问。',
  },
  transfer_summary: {
    stage: 'COMPLETE',
    mode: 'SUMMARY',
    focus: '带走通用方法',
    blocker: 'ready_for_reflection',
    strategy: 'transfer_summary',
    hintLevel: 5,
    objective: '总结本题的关键突破、思考路径和可迁移经验，说明下一次遇到同类题应依次问自己什么。不给代码，不再提问。',
  },
};

function buildLessonPlan(analysis) {
  const keys = analysis.sample_conflict ? ['check_input', 'structure_hint'] : ['structure_hint'];
  if (analysis.difficulty !== 'basic' || analysis.family !== 'general') keys.push('decompose_problem');
  if (analysis.needs_example_check) keys.push('example_check');
  keys.push('explain_connection');
  if (analysis.difficulty === 'advanced' || (analysis.difficulty === 'intermediate' && analysis.has_constraints)) {
    keys.push('complexity_check');
  }
  keys.push('transfer_summary');
  return keys.map((key) => ({ ...PHASE_LIBRARY[key] }));
}

function freshProgress() {
  return {
    goal_understood: true,
    sample_understood: false,
    candidate_method_found: false,
    method_validated: false,
    ready_for_reflection: false,
  };
}

function normalizeStudent(student = {}) {
  return {
    known_topics: Array.isArray(student.known_topics)
      ? student.known_topics.map(String).slice(0, 20)
      : [],
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
    lessonPlan: [],
    studentModel: normalizeStudent(student),
    progress: freshProgress(),
    history: [],
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
    planned_layers: session.lessonPlan.length,
    difficulty: session.problemAnalysis?.difficulty || null,
    problem: session.problem ? { title: session.problem.title, submitted: true } : null,
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
  const groundingAnchors = extractProblemAnchors(problem);
  const topic = /八皇后|N\s*皇后|皇后问题/i.test(source)
    ? 'n_queens'
    : /回文质数|质数回文|素数回文|Prime\s+Palindromes?/i.test(source)
      ? 'palindrome_prime'
      : /最长(?:严格)?递增子序列|最长上升子序列|\bLIS\b/i.test(source) ? 'lis' : 'general';
  const families = [];
  const add = (type, pattern) => pattern.test(source) && families.push(type);
  add('sequence', /数组|序列|数列|下标|元素|子序列/);
  add('graph', /图|节点|边|迷宫|网格|路径|连通/);
  add('search', /方案|排列|组合|所有可能|回溯|搜索|皇后|棋盘|放置/);
  add('dynamic_programming', /最优|最大|最小|方案数|重复子问题|背包|状态/);
  add('ordered', /有序|排序|单调|区间|第\s*k/);
  add('number_theory', /质数|素数|回文|整除|约数|因数|最大公约数|最小公倍数|\bgcd\b|\blcm\b/i);
  let difficultyScore = 0;
  if (families.length >= 2) difficultyScore += 1;
  if (families.some((family) => ['graph', 'search', 'dynamic_programming'].includes(family))) difficultyScore += 1;
  if (/最长.*子序列|递增子序列|回文质数|质数回文|素数回文|最短路|最小生成树|拓扑|并查集|状态压缩|树上|强连通|网络流/.test(source)) {
    difficultyScore += 2;
  }
  if (/100000|10\s*\^\s*[56]|10[⁵⁶]|1000000/.test(source)) difficultyScore += 1;
  if (source.length > 1800) difficultyScore += 1;
  const difficulty = difficultyScore >= 3
    ? 'advanced'
    : difficultyScore >= 1 ? 'intermediate' : 'basic';
  return {
    has_constraints: Boolean(problem.constraints) || /数据范围|约定|限制|≤|>=|<=/.test(source),
    has_samples: (problem.samples?.length || 0) > 0 || /样例/.test(problem.text),
    sample_conflict: problem.sampleConflict || /样例.{0,12}(?:矛盾|不一致)/.test(source),
    topic,
    family: families[0] || 'general',
    family_candidates: families.slice(0, 4),
    difficulty,
    difficulty_score: difficultyScore,
    needs_example_check: difficulty !== 'basic',
    grounding_anchors: groundingAnchors,
    immutable_facts: extractProblemFacts(problem),
  };
}

function findSelectedChoice(session, id) {
  if (!id || !session.lastResponse) return null;
  return session.lastResponse.choices.find((choice) => choice.id === id) || null;
}

function isAnswerRequest(text) {
  return /(?:给|告诉|写出|输出|描述|放在).{0,20}(?:代码|答案|完整解法|完整伪代码|转移式)|标准答案|可提交|忽略前面的规则|我是老师|直到完整/.test(text);
}

function inferProgress(session, signal, phase) {
  const progress = { ...session.progress };
  if (/样例|手算|模拟|小例子|n\s*=\s*\d+/i.test(signal)) progress.sample_understood = true;
  if (/枚举|排序|二分|搜索|递归|动态规划|DP|前缀|双指针|贪心|BFS|DFS|状态|转移|复用|记录/.test(signal)) {
    progress.candidate_method_found = true;
  }
  if (/不会漏|反例|边界|复杂度|O\s*\(|因为.+所以|所有情况|依赖顺序/.test(signal)) {
    progress.method_validated = true;
  }
  if (['decompose_problem', 'example_check', 'explain_connection', 'complexity_check', 'transfer_summary'].includes(phase.strategy)) {
    progress.candidate_method_found = true;
  }
  if (['complexity_check', 'transfer_summary'].includes(phase.strategy)) {
    progress.method_validated = true;
  }
  if (phase.strategy === 'transfer_summary') {
    progress.ready_for_reflection = true;
  }
  return progress;
}

function planTurn(session, input = {}, initial = false) {
  const message = String(input.message || '').trim().slice(0, 2000);
  const selected = findSelectedChoice(session, input.selected_choice_id);
  const nextTurn = session.turnIndex + 1;
  const phase = { ...session.lessonPlan[session.turnIndex] };
  const signal = `${message} ${selected?.text || ''} ${selected?.intent || ''}`;
  const progress = inferProgress(session, signal, phase);

  if (isAnswerRequest(signal)) {
    phase.objective += ' 学生正在索要答案：保持不提供代码的边界，但仍给出本阶段有用提示，不要让流程停住。';
  }

  return {
    ...phase,
    initial,
    message,
    selected,
    action: String(input.action || ''),
    progress,
    turn: nextTurn,
  };
}

function makeChoices(items) {
  return items.map(([text, intent], index) => ({
    id: String.fromCharCode(65 + index),
    text,
    intent,
  }));
}

function topicCopy(session, decision) {
  const topic = session.problemAnalysis?.topic;
  const copies = {
    n_queens: {
      structure_hint: {
        keyHint: '把棋盘想成一栋按行入住的城堡：每一行只安排一位皇后，因此不必在所有格子里乱试，只要决定“这一行住哪一列”。真正的矛盾只有三个：不能同列，也不能落在两条对角线上。',
        message: '可以把解题过程想成逐层选座位。第一行选一列，第二行只在安全列中选择，接着处理下一行。某一行无处可放时，说明前面的某次选择堵死了后路，就退回上一行换一列再试，这就是回溯。按行处理不会漏解，因为合法方案本来就要求每一行恰好放一位皇后。\n\n先抓住这张地图：一层对应一行，一次选择对应一列，冲突检查对应“同列、左斜线、右斜线”。有了这三个对应关系，递归只是把这个过程交给计算机重复执行。',
      },
      decompose_problem: {
        keyHint: '判断格子 (r, c) 是否安全，不需要回看整张棋盘，只要查三本“占用账本”：第 c 列、编号为 r - c 的主对角线、编号为 r + c 的副对角线。三项都未占用，这个位置才可尝试。',
        message: '同一列的皇后拥有相同的 c。同一条左上到右下对角线上的格子，r - c 相同；同一条右上到左下对角线上的格子，r + c 相同。\n\n这一步的关键不是背公式，而是把“看得见冲突”变成三个可以快速查询的编号。以后遇到数独、排列或棋盘放置题，也可以寻找类似的占用标记，把重复扫描变成一次查表。',
      },
      example_check: {
        keyHint: '用 4 × 4 棋盘检验冲突判断：已经在 (1, 2) 和 (2, 4) 放了皇后，现在准备处理第 3 行。只检查列、r - c 和 r + c，不需要重做前两行。',
        message: '这一问只检验“如何判断安全位置”。把第 3 行的候选列逐个代入三本账本，找出仍未被占用的一列。',
        question: '第 3 行目前可以尝试哪一列？',
        choices: makeChoices([
          ['第 1 列', 'safe_column_1'],
          ['第 2 列', 'conflict_column_2'],
          ['第 3 列', 'conflict_column_3'],
        ]),
      },
      explain_connection: {
        keyHint: '完整思路可以连成一个循环动作：在当前行尝试安全列，暂时记下这条列和两条对角线已占用，再进入下一行；如果后面走不通，撤销刚才三项标记，回到当前行换列。',
        message: '这里最容易遗漏的是“撤销”。放置皇后只是一次临时选择，只有后面的行都能完成，它才属于最终方案。退回时必须恢复现场，否则其他分支会被已经作废的选择错误拦住。\n\n因此，回溯不是神秘的递归技巧，而是“做选择、继续探索、恢复现场、尝试下一个选择”。只要能说清这四件事，代码结构通常就会自然出现。',
      },
      complexity_check: {
        keyHint: '复杂度主要来自每一行可能尝试多列，最坏情况下接近排列枚举；三本占用表把每次冲突判断降为 O(1)，剪枝越早，少走的错误分支越多。',
        message: '边界上要确认三件事：每行恰好一位皇后，进入下一行前已经完成标记，返回当前行后完整撤销标记。n = 1 有解，而 n = 2、n = 3 无解，也可以用来检查终止和无解处理是否可靠。',
      },
      transfer_summary: {
        keyHint: '这题带走的通用方法是：把方案按层构造，用少量标记快速判断冲突；当前层没有合法选择时，恢复现场并退回上一层。',
        message: '遇到“排布且不能冲突”的题，可以依次问：每一层决定什么？一个选择会占用哪些资源？怎样 O(1) 判断冲突？返回时要撤销哪些状态？\n\n八皇后用“行”分层，用“列、r - c、r + c”记录冲突。数独、全排列、组合选择等问题虽然外表不同，也常能沿用这套“分层选择 + 占用标记 + 恢复现场”的回溯框架。',
      },
    },
    palindrome_prime: {
      structure_hint: {
        keyHint: '这题的突破口不是“怎样更快地判断每个数”，而是“怎样少检查绝大多数数”。区间上限达到 1 亿，如果从 a 枚举到 b，再逐个判断回文和质数，候选范围太大。更合适的方向是反过来：先直接生成回文数，再只对这些候选做质数判断。',
        message: '把任务想成“造候选，再过筛”。例如用前半段 123，可以镜像得到奇数位回文数 12321。这样产生的每一个数天然就是回文数，不需要在 5 到 1 亿之间盲目寻找。\n\n还有一个能大幅减量的性质：除 11 以外，所有偶数位回文数都能被 11 整除，因此不可能是质数。也就是说，只需单独处理 11，主要生成 1、3、5、7 位回文数，再检查它们是否落在 [a, b] 内以及是否为质数。第一步就从“枚举整个区间”变成了“构造少量合法外形”。',
      },
      decompose_problem: {
        keyHint: '把题目拆成两个独立动作：先由一个前缀构造奇数位回文数，再判断这个候选是不是质数。构造时保留前缀本身，并把前缀去掉最后一位后倒序接到末尾；例如 123 变成 12321，45 变成 454。',
        message: '去掉前缀最后一位再镜像，是为了避免中间数字重复。这样只枚举前缀，就能按长度生成所有奇数位回文数。每得到一个候选，先检查是否位于 [a, b]；再检查它能否被 2 到 √候选数之间的整数整除。若没有因数，它才是回文质数。\n\n这里不需要保存“旧结果和新结果的关系”，因为它不是动态规划题。真正需要保存的只是当前前缀、由它生成的回文候选，以及质数判断结果。',
      },
      example_check: {
        keyHint: '用前缀 123 检验构造规则：保留 123，再把去掉末位后的 12 倒序成 21，接到后面。',
        message: '这一问只检验“奇数位回文数怎样由前缀生成”。后面的质数判断先不做。',
        question: '前缀 123 按这个规则会生成哪个回文数？',
        choices: makeChoices([
          ['12321', 'mirror_without_last_digit'],
          ['123321', 'mirror_whole_prefix'],
          ['32123', 'reverse_wrong_side'],
        ]),
      },
      explain_connection: {
        keyHint: '完整路线是：按需要的位数枚举前缀，镜像生成奇数位回文数；候选越过 b 时停止当前长度的生成；候选位于 [a, b] 时，再做质数判断。最后把 11 作为唯一可能的偶数位回文质数单独检查。',
        message: '质数判断只需要尝试到 √候选数，因为如果一个合数存在大于平方根的因数，就一定同时存在一个小于平方根的配对因数。可以先排除小于 2 和偶数，再检查奇数因数。\n\n最容易漏的是三个边界：1 不是质数；区间端点 a、b 都要包含；偶数位回文数不能全部丢弃，11 是例外。这样，“生成回文”和“判断质数”各负责一件事，思路会非常清楚。',
      },
      complexity_check: {
        keyHint: '在 1 亿以内，需要生成的奇数位回文候选只有 9 + 90 + 900 + 9000 = 9999 个，再加上单独检查 11；这比最坏枚举近 1 亿个整数少了四个数量级。',
        message: '每个候选的质数判断最多检查到它的平方根，因此总工作量约为“回文候选数 × 单次质数判断工作量”，能够覆盖题目范围。还应检查 a、b 很小、区间只包含 11、区间内没有答案，以及候选恰好等于端点的情况。',
      },
      transfer_summary: {
        keyHint: '这题带走的通用方法是“先按结构构造候选，再验证性质”。当满足条件的对象在巨大范围中非常稀少时，不要扫描整个范围，要寻找能直接生成候选的结构。',
        message: '以后遇到回文日期、特殊数字、固定数位关系等题，可以依次问：目标对象有什么稳定外形？能否通过较短的前缀直接构造？构造后还剩哪些条件需要验证？\n\n回文质数先用镜像构造回文候选，再用平方根试除验证质数，并利用“偶数位回文数可被 11 整除”继续剪掉无效候选。这套“构造候选 + 性质过滤”的思路，比空泛地寻找局部结果更适合这类数论枚举题。',
      },
    },
    lis: {
      structure_hint: {
        keyHint: '把序列看成一场“递增接龙”：每个数字只能接在它左边且比它小的数字后面。处理当前位置的数字时，不必重新寻找整条队伍，只要问一句：前面哪些数字能接我，其中最长的队伍有多长？',
        message: '以 3、18、7 为例：3 前面没人，先独自成队，长度是 1；18 可以接在 3 后面，长度变成 2；7 不能接在 18 后面，但可以接在 3 后面，所以长度也是 2。这里比较的是原序列中的先后位置，不能为了变大而重新排序。\n\n这就是突破口：给每个位置准备一本“小账本”，记录“如果必须以我结尾，最长能接多长”。后面的数字只需查看前面账本，不必从头枚举所有子序列。',
      },
      decompose_problem: {
        keyHint: '把账本正式定义为：dp[i] 表示必须以第 i 个数字结尾的最长递增子序列长度。计算 dp[i] 时，只查看 j < i 且 a[j] < a[i] 的位置，并从这些 dp[j] 中挑最大值再加 1。',
        message: '“必须以 i 结尾”是这个定义最重要的限制。它让每个局部问题拥有明确结尾，也让我们把每个位置的局部结果保存下来，供后面直接复用。\n\n如果前面没有任何更小的数字，当前位置只能独自成队，因此长度从 1 开始。整道题的答案不一定以最后一个数字结尾，所以最终要比较所有位置的账本。',
      },
      example_check: {
        keyHint: '用序列 3、1、2、4 检验账本含义。前三个位置对应的局部长度是 1、1、2；现在处理数字 4，只查看它左边比 4 小的位置。',
        message: '这一问只检验“当前状态如何复用旧状态”。数字 4 可以接在 3、1 或 2 后面，应选择其中已经形成的最长队伍。',
        question: '以数字 4 结尾的最长递增子序列长度是多少？',
        choices: makeChoices([
          ['3', 'reuse_best_prefix'],
          ['2', 'reuse_one_step'],
          ['4', 'use_all_numbers'],
        ]),
      },
      explain_connection: {
        keyHint: '把思路连起来：从左到右处理每个位置 i，查看所有更早的位置 j；只有 a[j] < a[i] 时，j 的队伍才能接上 i，再用 dp[j] + 1 更新当前账本。',
        message: '序列 3、1、2、4 的账本依次是 1、1、2、3。处理数字 2 时，它能接在 1 后面；处理数字 4 时，它会从所有可连接的前驱中选择账本值最大的一个。\n\n这正是动态规划的核心：把“大问题的答案”拆成“每个结尾位置的局部答案”，保存已经算好的结果，后面直接复用。',
      },
      complexity_check: {
        keyHint: '直接做法要为每个 i 扫描所有 j < i，总工作量是 O(n^2)。当 n = 100,000 时通常太慢，需要继续压缩“前面可复用的信息”。',
        message: '更快的方法不再保存每条队伍，而是记录“长度相同时，最小的结尾数字”。结尾越小，越容易接上后续数字；这些最小结尾保持有序，因此可以用二分查找确定当前数字应更新的位置，把复杂度降为 O(n log n)。\n\n还要确认题目要求严格递增还是不下降：严格递增使用“小于”，重复值不能让长度增加。',
      },
      transfer_summary: {
        keyHint: '这题的通用突破是：把整体最优解拆成“以每个位置结尾的局部最优解”，再让当前位置复用所有合法前驱的结果。',
        message: '以后遇到序列最值问题，可以先问：如果强制答案在位置 i 结束，局部问题是否更容易描述？哪些更早的位置能转移到 i？当前结果应从哪些旧结果中取最优？\n\n基础做法是按位置定义 dp 并枚举前驱，适合先建立正确模型；数据范围较大时，再观察局部结果是否有序、是否能用二分或数据结构加速。',
      },
    },
  };
  return copies[topic]?.[decision.strategy] || null;
}

function familyCopy(session, decision) {
  const specific = topicCopy(session, decision);
  if (specific) return specific;
  const family = session.problemAnalysis?.family || 'general';
  const copies = {
    sequence: {
      hint: '先把「整体答案」拆成「每个位置对应的局部结果」。重点观察：处理当前位置时，前面哪些结果可以直接复用。',
      method: '遇到序列最值、长度或方案数问题，先问：答案能否按位置拆开？新位置加入后，旧结果发生了什么变化？',
      question: '为了避免重复计算，最值得保存哪类信息？',
      choices: [
        ['每个位置对应的局部结果', 'local_state'],
        ['只保存当前最大元素', 'single_value'],
        ['保存每次完整枚举过程', 'all_processes'],
      ],
    },
    graph: {
      hint: '先把题目中的对象看成节点，把“可以到达、依赖或连接”看成边。关键是确定一次扩展后，哪些节点还需要继续处理。',
      method: '遇到关系和路径问题，先画出点与边，再决定处理顺序；不要一开始就盯着代码。',
      question: '为了避免重复访问，最需要记录什么？',
      choices: [
        ['哪些节点已经处理过', 'visited'],
        ['只记录当前节点编号', 'current_only'],
        ['记录所有走法的完整文字', 'all_paths'],
      ],
    },
    search: {
      hint: '先找出每一步真正需要做的选择，以及做完选择后还剩下什么问题。搜索结构来自“选择层次”，不是来自递归代码。',
      method: '遇到“所有方案”问题，先写清一层有哪些选择，再检查重复状态和提前停止条件。',
      question: '描述搜索状态时，哪一项最关键？',
      choices: [
        ['已经做出的选择和剩余任务', 'search_state'],
        ['递归函数叫什么名字', 'function_name'],
        ['输出格式有几行', 'output_lines'],
      ],
    },
    dynamic_programming: {
      hint: '先找“规模更小但结构相同”的子问题。关键不是立刻写转移式，而是确定旧结果中哪一类信息能帮助当前问题。',
      method: '遇到最优值或方案数问题，先定义一个能复用的局部问题，再检查当前结果依赖哪些更小结果。',
      question: '一个有用的状态首先应该说清什么？',
      choices: [
        ['它表示哪个子问题的结果', 'state_meaning'],
        ['数组变量使用什么名字', 'variable_name'],
        ['最后输出时换不换行', 'output_format'],
      ],
    },
    ordered: {
      hint: '题目中的顺序或单调性可能让大量比较变得没有必要。先观察：一旦某个判断成立或失败，后面的候选是否会呈现同一方向的变化。',
      method: '遇到有序数据或答案范围，先找“判断结果只朝一个方向变化”的分界点。',
      question: '判断一种优化是否可用，最先检查什么？',
      choices: [
        ['判断结果是否具有单向变化', 'monotonicity'],
        ['数据里有没有数字 0', 'contains_zero'],
        ['变量名是否足够短', 'short_name'],
      ],
    },
    number_theory: {
      hint: '先把“产生候选”和“验证性质”分开。数字范围很大时，优先利用数位、整除或因数结构直接缩小候选集合，再对少量候选做严格判断。',
      method: '遇到质数、整除、约数或特殊数字题，先问：目标数字有哪些必然性质？这些性质能否用于直接构造候选或提前排除大批数字？',
      question: '面对很大的数字范围，第一步最值得做什么？',
      choices: [
        ['利用数字结构缩小候选集合', 'reduce_candidates'],
        ['把范围内每个整数都完整检查一遍', 'scan_every_number'],
        ['先决定变量名和函数名', 'names_first'],
      ],
    },
    general: {
      hint: '先写出最直接的做法，再圈出其中反复完成的工作。真正的优化通常来自“少做重复工作”，而不是先猜算法名称。',
      method: '遇到新题，先回答两件事：最直接的方法是什么？它把哪些相同工作做了很多次？',
      question: '下一步最值得比较哪两件事？',
      choices: [
        ['直接方法与重复工作的来源', 'compare_work'],
        ['变量名与函数名', 'names'],
        ['输入有几行与输出有几行', 'io_lines'],
      ],
    },
  };
  const copy = copies[family] || copies.general;

  if (decision.strategy === 'structure_hint') {
    return { keyHint: copy.hint, message: copy.method, question: '', choices: [] };
  }
  if (decision.strategy === 'decompose_problem') {
    return {
      keyHint: '现在把刚才观察到的结构变成一项可复用的信息：不要保存完整过程，只保存足以支持下一步判断的结果。',
      message: copy.method,
      question: '',
      choices: [],
    };
  }
  if (decision.strategy === 'example_check') {
    const examples = {
      sequence: {
        hint: '用序列 3、1、2、4 检验刚才的想法。处理数字 2 时，只看已经处理过的部分。',
        question: '为了得到以 2 结尾的递增结果，前面哪项信息最值得复用？',
        choices: [
          ['以数字 1 结尾的局部结果', 'reuse_valid_prefix'],
          ['整个序列最后的答案', 'future_answer'],
          ['只看数字 2 自己', 'ignore_history'],
        ],
      },
      graph: {
        hint: '用 A 连向 B、C，B 和 C 都连向 D 的小图检验记录方式。D 可能从两条边被遇到。',
        question: '第二次遇到 D 时，哪项记录能避免重复处理？',
        choices: [
          ['D 是否已经访问过', 'visited'],
          ['当前边来自 B 还是 C', 'edge_source'],
          ['图中一共有几个字母', 'node_count'],
        ],
      },
      search: {
        hint: '用三个位置、每个位置都可选或不选的小例子检验搜索状态。进入下一层前，只保留继续搜索必需的信息。',
        question: '进入第 3 个位置前，状态最需要记录什么？',
        choices: [
          ['前两个位置的选择和当前层数', 'search_state'],
          ['递归函数的名字', 'function_name'],
          ['最终会有多少行输出', 'output_lines'],
        ],
      },
      dynamic_programming: {
        hint: '用规模 1、2、3 的同类小问题检验状态。当前规模的结果，应由已经解决的更小规模得到。',
        question: '计算规模 3 时，最值得复用哪类信息？',
        choices: [
          ['规模更小且含义相同的结果', 'smaller_states'],
          ['最后一次输入的字符', 'last_character'],
          ['变量名的长度', 'variable_name'],
        ],
      },
      ordered: {
        hint: '用有序序列 1、3、5、7 和目标 6 检验单向变化。比较到 5 后，右侧数字只会更大。',
        question: '若 5 仍小于目标 6，下一步应排除哪一侧？',
        choices: [
          ['5 以及它左侧的位置', 'discard_left'],
          ['5 右侧的所有位置', 'discard_right'],
          ['不能排除任何位置', 'discard_none'],
        ],
      },
      number_theory: {
        hint: '先选一个很小的候选，分别检验它是否满足题目中的数位结构和整除条件，看看哪项判断可以最早排除无效候选。',
        question: '为了减少后续工作，哪类条件更适合先检查？',
        choices: [
          ['计算快且能排除大量候选的条件', 'cheap_strong_filter'],
          ['最耗时的完整验证', 'expensive_check_first'],
          ['输出格式是否换行', 'output_format'],
        ],
      },
      general: {
        hint: '用一组最小合法数据走一遍直接方法，只观察哪些工作被重复完成。',
        question: '这个小例子最需要记录什么？',
        choices: copy.choices,
      },
    };
    const example = examples[family] || examples.general;
    return {
      keyHint: example.hint,
      message: '只检验这一处关键关系，不需要把整道题重新做一遍。',
      question: example.question,
      choices: makeChoices(example.choices),
    };
  }
  if (decision.strategy === 'explain_connection') {
    const chosen = decision.selected?.text ? `你刚才选择了「${decision.selected.text}」。` : '';
    return {
      keyHint: `${chosen}现在把它放回题目：确认这项信息能否由已经处理过的结果得到，并且不会遗漏合法情况。`,
      message: '把完整思路连成三件事：保存什么局部结果，新结果依赖哪些旧结果，以及按什么顺序处理。',
      question: '',
      choices: [],
    };
  }
  if (decision.strategy === 'complexity_check') {
    return {
      keyHint: '最后对照数据范围估算总工作量，并单独检查最小规模、重复值和边界位置。',
      message: '复杂度检查只回答两个问题：每个状态处理多少次，每次需要多少工作。两者相乘后应能通过题目限制。',
      question: '',
      choices: [],
    };
  }
  return {
    keyHint: '这题最值得带走的不是某段代码，而是先找局部结果，再找旧结果与新结果之间的关系，最后用边界和复杂度验证。',
    message: '以后遇到类似题目，可以依次问：最直接的方法重复了什么？应该保存哪类结果？新结果依赖哪些旧结果？回答完这三问，再进入实现。',
    question: '',
    choices: [],
  };
}

function safeFallback(session, decision) {
  const copy = familyCopy(session, decision);
  if (decision.blocker === 'input_inconsistent') {
    copy.keyHint = '题目条件与样例可能不一致。先核对题目目标、样例输入和样例输出，避免在错误信息上继续推导。';
    copy.message = '先暂停算法分析。确认题面信息一致后，再开始寻找关键结构。';
    copy.question = '你准备先核对哪一项？';
    copy.choices = makeChoices([
      ['题目要求的最终结果', 'check_goal'],
      ['样例的计算过程', 'check_sample'],
    ]);
  }
  if (isAnswerRequest(decision.message)) {
    copy.message = `我不会直接给出完整代码或答案。${copy.message}`;
  }
  return {
    stage: decision.stage,
    mode: decision.mode,
    focus: decision.focus,
    key_hint: copy.keyHint,
    coach_message: copy.message,
    question: copy.question,
    choices: copy.choices,
    hint_level: decision.hintLevel,
    progress: { ...decision.progress },
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
  if (!MODES.includes(value.mode)) errors.push('mode 无效');
  if (typeof value.focus !== 'string' || !value.focus.trim() || value.focus.length > 100) errors.push('focus 无效');
  if (typeof value.key_hint !== 'string' || !value.key_hint.trim() || value.key_hint.length > 520) errors.push('key_hint 无效');
  if (typeof value.coach_message !== 'string' || !value.coach_message.trim() || value.coach_message.length > 1400) errors.push('coach_message 无效');
  if (typeof value.question !== 'string' || value.question.length > 180) errors.push('question 无效');
  if (!Number.isInteger(value.hint_level) || value.hint_level < 0 || value.hint_level > 5) errors.push('hint_level 无效');
  if (!Array.isArray(value.choices) || value.choices.length > 3) {
    errors.push('choices 数量无效');
  } else {
    const ids = new Set();
    const texts = new Set();
    value.choices.forEach((choice, index) => {
      if (!choice || typeof choice !== 'object') return errors.push(`choice ${index} 无效`);
      if (!/^[A-C]$/.test(choice.id || '')) errors.push(`choice ${index} id 无效`);
      if (ids.has(choice.id)) errors.push('choice id 重复');
      ids.add(choice.id);
      if (typeof choice.text !== 'string' || !choice.text.trim() || choice.text.length > 70) errors.push(`choice ${index} text 无效`);
      if (texts.has(choice.text)) errors.push('choice text 重复');
      texts.add(choice.text);
      if (typeof choice.intent !== 'string' || !choice.intent.trim() || choice.intent.length > 80) errors.push(`choice ${index} intent 无效`);
      for (const key of Object.keys(choice)) if (!['id', 'text', 'intent'].includes(key)) errors.push(`choice ${index} 含额外字段`);
    });
  }
  if (value.mode === 'CHECKPOINT' && (value.choices.length < 2 || !value.question.trim())) errors.push('CHECKPOINT 必须有一个问题和 2～3 个选项');
  if (value.mode !== 'CHECKPOINT' && (value.choices.length || value.question.trim())) errors.push('非 CHECKPOINT 不应包含问题或选项');
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

function normalizeCoachCopy(value) {
  return String(value || '')
    .replace(/\$+/g, '')
    .replace(/\\\(|\\\)|\\\[|\\\]/g, '')
    .replace(/\\(?:text|mathrm)\s*\{([^{}]*)\}/g, '$1')
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1/$2)')
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, '√($1)')
    .replace(/\\(?:cdot|times)\b/g, '×')
    .replace(/\\(?:leq|le)\b/g, '≤')
    .replace(/\\(?:geq|ge)\b/g, '≥')
    .replace(/\\([a-zA-Z]+)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/`/g, '')
    .replace(/([\u3400-\u9fff])([A-Za-z0-9])/g, '$1 $2')
    .replace(/([A-Za-z0-9])([\u3400-\u9fff])/g, '$1 $2')
    .replace(/\s+([。！？；，：])/g, '$1')
    .replace(/([。！？；，：])\s+/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .replace(/([。！？；，])\1+/g, '$1')
    .trim();
}

function normalizeCoachResponse(response) {
  return {
    ...response,
    focus: normalizeCoachCopy(response.focus),
    key_hint: normalizeCoachCopy(response.key_hint),
    coach_message: normalizeCoachCopy(response.coach_message),
    question: normalizeCoachCopy(response.question),
    choices: Array.isArray(response.choices)
      ? response.choices.map((choice) => ({ ...choice, text: normalizeCoachCopy(choice.text) }))
      : [],
  };
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

function groundingMatches(session, response) {
  const normalized = (value) => String(value || '')
    .toLowerCase()
    .replace(/[\s，。！？、；：,.!?;:「」“”‘’()（）\[\]【】<>《》_-]/g, '');
  const text = normalized(visibleText(response));
  return (session.problemAnalysis?.grounding_anchors || [])
    .filter((anchor) => text.includes(normalized(anchor)));
}

function guardResponse(session, response, options = {}) {
  const text = visibleText(response);
  const risks = [];
  if (/```(?:cpp|c\+\+)|#include|using\s+namespace|\bmain\s*\(|\b(?:for|while)\s*\(|\bcin\s*>>|\bcout\s*<</.test(text)) risks.push('code');
  if ((text.match(/(?:^|\n)\s*(?:\d+[.、]|步骤[一二三四五六])/g) || []).length >= 3) risks.push('full_pseudocode');
  if ((text.match(/先|然后|接着|随后|最后|否则|直到/g) || []).length >= 6) risks.push('full_flow');
  if (/请稍候|正在加载题目|我准备好了|我需要更多时间|重看一遍/.test(text)) risks.push('empty_interaction');
  if (/最小数据|跟着样例手算|确定下一步怎么验证|准备先判断什么|可执行的动作/.test(text)) risks.push('removed_prompt');
  if ([
    /先写出最直接的做法.{0,40}反复完成的工作/,
    /确认这项信息能否由已经处理过的结果得到/,
    /先找局部结果.{0,40}旧结果与新结果之间的关系/,
    /真正的优化通常来自.{0,20}少做重复工作/,
    /最直接的方法重复了什么.{0,30}应该保存哪类结果/,
  ].some((pattern) => pattern.test(text))) {
    risks.push('generic_vagueness');
  }
  const anchors = session.problemAnalysis?.grounding_anchors || [];
  const requiredGrounding = ['VALIDATE', 'COMPLETE'].includes(response.stage) ? 1 : 2;
  if (options.enforceGrounding !== false
    && anchors.length >= 4
    && groundingMatches(session, response).length < requiredGrounding) {
    risks.push('not_grounded_in_problem');
  }
  if (options.enforceGrounding !== false
    && quantityRoleConflicts(session.problem, response).length) {
    risks.push('fact_conflict');
  }
  if (response.stage === 'EXPLORE'
    && /tails?|线段树|树状数组|第一个.{0,12}(?:大于|小于).{0,12}(?:位置|元素).{0,12}更新|\w+\s*\[[^\]]+\].{0,12}表示|最终.{0,12}(?:答案|长度)/i.test(text)) {
    risks.push('solution_too_early');
  }
  if (response.stage === 'MODEL'
    && /tails?|二分查找|线段树|树状数组|最小结尾值/i.test(text)) {
    risks.push('model_choice_leakage');
  }
  const solutionSignals = [
    /\w+\s*\[[^\]]+\].{0,12}表示|状态.{0,12}表示/i,
    /二分|动态规划|双指针|BFS|DFS/i,
    /遍历.{0,20}(?:更新|加入|删除)/,
    /第一个.{0,12}(?:位置|元素).{0,12}更新/,
    /最终.{0,12}(?:答案|长度|结果)/,
  ].filter((pattern) => pattern.test(text)).length;
  if (solutionSignals >= 4) risks.push('complete_solution');
  if (response.stage === 'EXPLORE' && `${response.key_hint}${response.coach_message}`.length < 150) {
    risks.push('information_too_thin');
  }
  if ((response.question.match(/[？?]/g) || []).length > 1) risks.push('multiple_questions');
  if (/笨|愚蠢|这么简单|你错了|太差/.test(text)) risks.push('shaming');
  const normalized = (value) => String(value || '').replace(/[\s，。！？、；：,.!?;:「」“”‘’()（）]/g, '');
  const current = normalized(`${response.key_hint}${response.coach_message}`);
  if (current.length > 20 && session.history.slice(-4).some((item) => normalized(`${item.key_hint}${item.coach_message}`) === current)) {
    risks.push('repeated_response');
  }
  return { pass: risks.length === 0, risk_types: risks };
}

function composeMessages(session, input, decision, revisionIssues = []) {
  const recent = session.history.slice(-4).map((item) => ({
    student: item.student_message,
    key_hint: item.key_hint,
    coach: item.coach_message,
    stage: item.stage,
  }));
  const payload = {
    problem: session.problem,
    problem_profile: session.problemAnalysis,
    student_known_topics: session.studentModel.known_topics,
    current_input: {
      message: decision.message,
      selected_choice: decision.selected
        ? { text: decision.selected.text, intent: decision.selected.intent }
        : null,
      action: decision.action || null,
    },
    recent_turns: recent,
    phase_contract: {
      turn: decision.turn,
      planned_layers: session.lessonPlan.length,
      difficulty: session.problemAnalysis?.difficulty || 'basic',
      stage: decision.stage,
      mode: decision.mode,
      focus: decision.focus,
      objective: decision.objective,
      required_choices: decision.mode === 'CHECKPOINT' ? '2～3' : '0',
      required_question: decision.mode === 'CHECKPOINT' ? '恰好 1 个' : '0',
    },
    grounding_contract: {
      problem_terms: (session.problemAnalysis?.grounding_anchors || []).slice(0, 16),
      requirement: 'key_hint 与 coach_message 必须自然使用至少 2 个当前题目的关键词，并解释它们如何导向本层提示；只罗列关键词不算。',
    },
    fact_contract: {
      immutable_facts: (session.problemAnalysis?.immutable_facts || []).slice(0, 10),
      requirement: '先逐条核对这些题面事实。变量代表什么、执行什么操作、数量是至多还是恰好、目标是最大还是最小，都不得改写。尤其不能把“移走 M 个”讲成“选出 M 个”，也不能把删除上限讲成保留数量。',
    },
    revision_contract: revisionIssues.length
      ? { previous_attempt_rejected_for: revisionIssues, action: '重新分析题面并重写，不要修补原句。' }
      : null,
    hard_rules: [
      '这是单向推进流程，不得回到理解题意、最小数据、样例手算或准备状态。',
      '第一层必须把题目翻译成可想象的场景，讲清核心矛盾和第一步抓手；不能只说观察、拆分或复用。',
      '每层都必须从当前题面的对象、目标、限制或数据范围出发。能够原样复制给另一道题的句子视为不合格。',
      '不得编造题面没有给出的精确数量、次数或比例；自行推导的数值必须同时给出可复核依据。',
      '先给题目相关的关键提示，再用具体例子说明为什么，最后点出可迁移的思考方法。只有 CHECKPOINT 阶段才提问。',
      '可见文案使用短段落和明确因果：先说结论，再说原因和例子；中文与英文、数字之间留空格，使用全角中文标点，不输出 Markdown 装饰符号。',
      '不得输出完整代码、完整伪代码、完整转移式或可直接提交的答案。',
      '不得使用请稍候、正在加载、准备好了吗、需要更多时间等空转文案。',
      '不得输出 Markdown 数学定界符或多余反斜杠。',
      '只输出符合 Schema 的 JSON。',
    ],
    response_schema: schema,
  };
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(payload) },
  ];
}

async function modelResponse(session, input, decision, model, revisionIssues = []) {
  const raw = await model(composeMessages(session, input, decision, revisionIssues), {
    temperature: 0.25,
    max_tokens: 1800,
    timeout: config.timeoutMs,
    response_format: { type: 'json_object' },
  });
  const parsed = parseJsonCandidate(raw);
  const errors = validateCoachResponse(parsed);
  if (!parsed || errors.length) throw new Error(`模型响应不符合 Schema：${errors.join('；')}`);
  return parsed;
}

function modelServiceError(error, qualityIssues = []) {
  const upstreamStatus = error?.response?.status;
  let publicMessage = 'AI 模型服务当前不可用，本次没有生成提示，请稍后重试。';
  if (upstreamStatus === 402) {
    publicMessage = 'AI 模型服务余额不足（上游返回 402），本次没有生成提示。请检查 API 账户余额或切换可用模型后重试。';
  } else if ([401, 403].includes(upstreamStatus)) {
    publicMessage = `AI 模型鉴权失败（上游返回 ${upstreamStatus}），本次没有生成提示。请检查 API Key 和模型配置。`;
  } else if (qualityIssues.length) {
    publicMessage = 'AI 没有生成与当前题目充分相关的提示，本次内容已丢弃。请重试；系统不会再用通用模板代替。';
  }
  const wrapped = new Error(publicMessage);
  wrapped.status = 503;
  wrapped.publicMessage = publicMessage;
  wrapped.upstreamStatus = upstreamStatus;
  return wrapped;
}

function canRetryModelError(error) {
  const status = error?.response?.status;
  return !status || status === 408 || status === 429 || status >= 500;
}

function applyContract(response, decision) {
  response.stage = decision.stage;
  response.mode = decision.mode;
  response.focus = decision.focus;
  response.hint_level = decision.hintLevel;
  response.progress = { ...decision.progress };
  response.state_patch = {
    primary_blocker: decision.blocker,
    last_strategy: decision.strategy,
    student_evidence: decision.message ? [decision.message.slice(0, 240)] : [],
    revealed_insights: Array.isArray(response.state_patch?.revealed_insights)
      ? response.state_patch.revealed_insights.filter(Boolean).slice(0, 1)
      : [],
  };
  if (decision.mode !== 'CHECKPOINT') {
    response.question = '';
    response.choices = [];
  } else {
    response.choices = Array.isArray(response.choices) ? response.choices.slice(0, 3) : [];
    response.choices = response.choices.map((choice, index) => ({
      ...choice,
      id: String.fromCharCode(65 + index),
    }));
  }
  return normalizeCoachResponse(response);
}

function applyState(session, response, decision) {
  session.stage = response.stage;
  session.progress = { ...response.progress };
  session.turnIndex += 1;
  session.updatedAt = new Date().toISOString();
  if (decision.message) session.studentModel.reasoning_evidence.push(decision.message.slice(0, 240));
  session.history.push({
    turn: session.turnIndex,
    student_message: decision.action === 'continue' ? '' : (decision.message || decision.selected?.text || ''),
    key_hint: response.key_hint,
    coach_message: response.coach_message,
    focus: response.focus,
    stage: response.stage,
  });
  session.lastResponse = response;
  return response;
}

async function runTurn(session, input = {}, options = {}) {
  if (session.turnIndex >= session.lessonPlan.length || session.stage === 'COMPLETE') {
    const error = new Error('本题的思路引导已经完成，可以重新开始下一题。');
    error.status = 409;
    throw error;
  }
  const decision = planTurn(session, input, Boolean(options.initial));
  const hasModelOverride = Object.prototype.hasOwnProperty.call(options, 'model');
  const model = hasModelOverride ? options.model : chat;
  const allowStaticFallback = options.allowStaticFallback ?? hasModelOverride;

  if (!model) {
    return applyState(session, applyContract(safeFallback(session, decision), decision), decision);
  }

  let revisionIssues = [];
  const attempts = allowStaticFallback ? 1 : config.modelRetries + 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let response;
    try {
      response = await modelResponse(session, input, decision, model, revisionIssues);
    } catch (error) {
      if (allowStaticFallback) {
        console.warn(`[Coach] model fallback ${session.id}: ${error.message}`);
        return applyState(session, applyContract(safeFallback(session, decision), decision), decision);
      }
      if (attempt + 1 < attempts && canRetryModelError(error)) {
        revisionIssues = ['模型响应格式或连接异常'];
        continue;
      }
      throw modelServiceError(error);
    }

    response = applyContract(response, decision);
    const validationErrors = validateCoachResponse(response);
    const guard = guardResponse(session, response, { enforceGrounding: !allowStaticFallback });
    if (guard.pass && !validationErrors.length) return applyState(session, response, decision);

    const issues = [...guard.risk_types, ...validationErrors.map(() => 'schema')];
    console.warn(`[Coach] response rejected ${session.id}: ${issues.join(',') || 'schema'}`);
    if (allowStaticFallback) {
      return applyState(session, applyContract(safeFallback(session, decision), decision), decision);
    }
    revisionIssues = [...new Set(issues)];
    if (attempt + 1 >= attempts) throw modelServiceError(null, revisionIssues);
  }

  throw modelServiceError(null, revisionIssues);
}

function prefetchSignature(session) {
  return `${session.turnIndex}:${session.stage}:${session.updatedAt}`;
}

function prefetchInputs(session) {
  if (!session.lastResponse || session.stage === 'COMPLETE') return [];
  if (session.lastResponse.mode === 'CHECKPOINT') {
    return session.lastResponse.choices.map((choice) => ({
      key: `choice:${choice.id}`,
      input: { selected_choice_id: choice.id },
    }));
  }
  return [{ key: 'continue', input: { action: 'continue' } }];
}

function turnCacheKey(input = {}) {
  const choiceId = String(input.selected_choice_id || '').trim();
  if (choiceId) return `choice:${choiceId}`;
  return String(input.action || '').trim() === 'continue' ? 'continue' : '';
}

function adoptPrefetchedSession(session, snapshot) {
  const { id, createdAt } = session;
  Object.assign(session, snapshot, { id, createdAt });
  session.prefetchedTurns = null;
  prefetchJobs.delete(id);
}

async function prefetchNext(id, options = {}) {
  const session = getSessionOrThrow(id);
  const signature = prefetchSignature(session);
  const inputs = prefetchInputs(session);
  if (!inputs.length) return { ready_keys: [] };

  if (session.prefetchedTurns?.signature === signature) {
    return { ready_keys: [...session.prefetchedTurns.turns.keys()] };
  }
  const existing = prefetchJobs.get(id);
  if (existing?.signature === signature) return existing.promise;

  const promise = Promise.allSettled(inputs.map(async ({ key, input }) => {
    const snapshot = structuredClone({ ...session, prefetchedTurns: null });
    const response = await runTurn(snapshot, input, options);
    return { key, response, snapshot };
  })).then((results) => {
    const turns = new Map();
    for (const result of results) {
      if (result.status === 'fulfilled') turns.set(result.value.key, result.value);
      else console.warn(`[Coach] prefetch failed ${id}: ${result.reason?.message || result.reason}`);
    }
    if (sessions.get(id) === session && prefetchSignature(session) === signature) {
      session.prefetchedTurns = { signature, turns };
    }
    return { ready_keys: [...turns.keys()] };
  }).finally(() => {
    if (prefetchJobs.get(id)?.promise === promise) prefetchJobs.delete(id);
  });

  prefetchJobs.set(id, { signature, promise });
  return promise;
}

async function submitProblem(id, input, options = {}) {
  const session = getSessionOrThrow(id);
  prefetchJobs.delete(id);
  session.problem = normalizeProblem(input);
  session.problemAnalysis = analyzeProblem(session.problem);
  session.lessonPlan = buildLessonPlan(session.problemAnalysis);
  session.stage = 'INGEST';
  session.turnIndex = 0;
  session.progress = freshProgress();
  session.history = [];
  session.lastResponse = null;
  session.prefetchedTurns = null;
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
  const action = String(input.action || '').trim();
  if (!message && !choiceId && action !== 'continue') {
    const error = new Error('请选择一个方向，或继续查看下一层提示。');
    error.status = 400;
    throw error;
  }
  if (choiceId && !/^[A-C]$/.test(choiceId)) {
    const error = new Error('选项编号无效。');
    error.status = 400;
    throw error;
  }
  const cacheKey = turnCacheKey(input);
  const signature = prefetchSignature(session);
  const pending = prefetchJobs.get(id);
  if (cacheKey && pending?.signature === signature) await pending.promise;
  const cached = session.prefetchedTurns?.signature === signature
    ? session.prefetchedTurns.turns.get(cacheKey)
    : null;
  if (cached) {
    adoptPrefetchedSession(session, cached.snapshot);
    return { response: cached.response, session: publicSession(session), prefetched: true };
  }
  session.prefetchedTurns = null;
  const response = await runTurn(session, {
    message,
    selected_choice_id: choiceId || null,
    action,
  }, options);
  return { response, session: publicSession(session) };
}

function getSession(id) {
  return publicSession(getSessionOrThrow(id));
}

function deleteSession(id) {
  prefetchJobs.delete(id);
  if (!sessions.delete(id)) getSessionOrThrow(id);
  console.info(`[Coach] session deleted ${id}`);
}

module.exports = {
  analyzeProblem,
  buildLessonPlan,
  createSession,
  deleteSession,
  getSession,
  guardResponse,
  planTurn,
  prefetchNext,
  submitProblem,
  submitTurn,
  validateCoachResponse,
  _sessions: sessions,
};
