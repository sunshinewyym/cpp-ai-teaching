'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { pathToFileURL } = require('node:url');

const SERVER_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SERVER_ROOT, '..');
const DATA_FILE = path.join(REPO_ROOT, 'web', 'src', 'data', 'gespPapers.js');
const CACHE_FILE = path.join(REPO_ROOT, 'web', 'scripts', 'gesp_explanations.json');
const REVIEW_FILE = path.join(REPO_ROOT, 'web', 'scripts', 'gesp_explanation_review_progress.json');
const REPORT_FILE = path.join(REPO_ROOT, 'web', 'scripts', 'gesp_explanation_audit.json');

require('dotenv').config({ path: path.join(SERVER_ROOT, '.env') });
const { chatWithMeta } = require('../services/deepseek');

const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const skipReview = args.has('--skip-review');
const allowSourceWarnings = args.has('--allow-source-warnings');
const requestedConcurrency = Number(process.env.GESP_EXPLANATION_CONCURRENCY || 3);
const concurrency = Number.isFinite(requestedConcurrency) ? Math.max(1, Math.min(8, Math.floor(requestedConcurrency))) : 3;
const STATE_VERSION = 2;

const BANNED_PATTERNS = [
  /参考答案为/u,
  /本题考查/u,
  /详细解析/u,
  /解题技巧/u,
  /易错点/u,
  /先提取题干/u,
  /逐项核对/u,
  /与题干条件完全一致/u,
  /先圈出输入范围/u,
  /注意 C\+\+ 的整数除法/u,
  /不要因为题干前半句正确/u,
  /根据题意，?需要选择正确的选项/u,
];

const GENERATOR_SYSTEM = `你是 GESP C++ 题库的资深命题解析编辑。每道解析必须针对题目本身完成推理，不能只复述答案。

硬性要求：
1. 官方答案来自原卷，以该答案为结论；先在内部独立求解，确认推导支持官方答案。若题干因 OCR 明显缺失必要公式或图片信息，不得编造，在 warning 中准确说明缺失内容。
2. 单选题必须解释正确选项成立的具体规则或计算过程，并说明其他选项的关键错误。判断题必须指出整句话成立或失败的具体条件；错误题优先给出反例或正确说法。
3. 代码题必须追踪关键变量、循环次数、递归过程或数据结构状态；能算出中间值、输出、复杂度时必须写出。
4. 禁止出现“参考答案为”“本题考查”“详细解析”“解题技巧”“易错点”“先提取题干”“逐项核对”“根据题意，需要选择正确的选项”等套话。
5. 不编造题目中没有的规则。解析使用自然、准确的中文，简单题通常 90～180 字，复杂代码题 140～420 字。
6. 图片选项若无法直接读取，应写出程序输出、边集合或结构的具体结果，再说明与官方选项对应，不得虚构图片细节。
7. 只写解析正文，不要写答案字母、选项结论或“因此应选 X”一类结尾；程序会依据可信的官方答案统一追加结论。

只输出合法 JSON：{"items":[{"id":"题目 id","explanation":"完整解析","warning":"没有则为空字符串"}]}。每个输入 id 恰好出现一次。`;

const REVIEWER_SYSTEM = `你是 GESP C++ 题库解析的终审编辑。逐题核对题干、选项、官方答案和现有解析。

检查标准：
1. 推理、计算过程、变量变化、复杂度和结论必须正确，并能支持官方答案。
2. 解析必须针对该题，不能只复述答案或知识点；单选题要解释干扰项的关键错误，判断题要给出成立条件、反例或正确说法。
3. 不得包含“参考答案为”“本题考查”“详细解析”“解题技巧”“易错点”“先提取题干”“逐项核对”等套话。
4. fix 时只写修订后的解析正文，不要写答案字母、选项结论或“因此应选 X”一类结尾；程序会统一追加可信结论。
5. 官方答案不可改。若题干明显残缺，只在 warning 中指出，不得编造缺失内容。

每题都要返回。合格时返回 status="ok"；不合格时返回 status="fix"，并给出完整重写 explanation。只输出合法 JSON：{"items":[{"id":"...","status":"ok|fix","issue":"","explanation":"fix 时必填","warning":""}]}。`;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function atomicWrite(file, content) {
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temp, content, 'utf8');
    let lastError;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        await fs.rename(temp, file);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt === 7) throw error;
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
      }
    }
    if (lastError) throw lastError;
  } finally {
    await fs.rm(temp, { force: true }).catch(() => {});
  }
}

async function writeJson(file, value) {
  await atomicWrite(file, `${JSON.stringify(value, null, 2)}\n`);
}

function parseJson(content) {
  const cleaned = String(content || '')
    .replace(/^```(?:json)?\s*/u, '')
    .replace(/\s*```$/u, '')
    .trim();
  if (!cleaned) throw new Error('AI 返回内容为空');
  return JSON.parse(cleaned);
}

function questionType(question) {
  return question.source?.questionType || (Object.keys(question.options || {}).length === 2 ? 'judgment' : 'choice');
}

function modelQuestion(question, explanation) {
  const item = {
    id: question.id,
    level: question.source?.level,
    session: question.source?.session,
    type: questionType(question),
    question: question.question,
    options: question.options,
    answer: question.answer,
  };
  if (explanation !== undefined) item.explanation = explanation;
  return item;
}

const TRAILING_CONCLUSION = /\s*(?:(?:因此|所以|故|综上(?:所述)?|最终)\s*)?(?:(?:该|此)?说法(?:正确|错误)[，,]\s*)?(?:应选|应选择|应该选择|选择|选|正确答案(?:为|是)|答案(?:为|是))\s*[A-D](?:\s*[（(][^）)\n]{0,12}[）)])?\s*[。.!！]?\s*$/u;

function normalizeExplanation(question, explanation) {
  let body = String(explanation || '').trim();
  let previous;
  do {
    previous = body;
    body = body.replace(TRAILING_CONCLUSION, '').trim();
  } while (body !== previous);
  return `${body}\n\n因此应选 ${question.answer}。`;
}

function questionStateFingerprint(question) {
  return sha256(JSON.stringify([question.id, questionType(question), question.question, question.options, question.answer]));
}

function explanationFingerprint(explanation) {
  return sha256(String(explanation || '').trim());
}
function substantiveLength(text) {
  return Array.from(String(text || '').replace(/[\s*_`#>\-—，。；：、“”‘’（）()[\]{}]/gu, '')).length;
}

function minimumLength(question) {
  const hasCode = /```|#include|(?:for|while|if|switch)\s*\(|\b(?:cin|cout)\s*(?:>>|<<)|[{};]/u.test(question.question);
  if (question.question.length > 280) return 110;
  if (hasCode) return 75;
  return questionType(question) === 'choice' ? 75 : 60;
}

function validateExplanation(question, explanation) {
  const errors = [];
  const text = String(explanation || '').trim();
  if (!text) return ['解析为空'];
  if (substantiveLength(text) < minimumLength(question)) errors.push(`实质内容不足 ${minimumLength(question)} 字`);
  if (text.length > 1800) errors.push('解析过长');
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(text)) errors.push(`含套话 ${pattern}`);
  }
  const expectedConclusion = `因此应选 ${question.answer}。`;
  if (!text.endsWith(expectedConclusion)) errors.push(`末尾缺少可信结论“${expectedConclusion}”`);
  return errors;
}

function questionFingerprint(question) {
  return JSON.stringify([question.question, question.options]);
}

function duplicateExplanationIds(questions, cache) {
  const groups = new Map();
  for (const question of questions) {
    const normalized = String(cache[question.id] || '').replace(/\s+/gu, ' ').trim();
    if (!normalized) continue;
    if (!groups.has(normalized)) groups.set(normalized, []);
    groups.get(normalized).push(question);
  }
  const ids = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const fingerprints = new Set(group.map(questionFingerprint));
    if (fingerprints.size > 1) ids.push(...group.slice(1).map(question => question.id));
  }
  return [...new Set(ids)];
}

function makeBatches(items, maxItems = 10, maxChars = 18000) {
  const batches = [];
  let batch = [];
  let chars = 0;
  for (const item of items) {
    const itemChars = JSON.stringify(modelQuestion(item)).length;
    if (batch.length && (batch.length >= maxItems || chars + itemChars > maxChars)) {
      batches.push(batch);
      batch = [];
      chars = 0;
    }
    batch.push(item);
    chars += itemChars;
  }
  if (batch.length) batches.push(batch);
  return batches;
}

async function askJson(messages, itemCount) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const result = await chatWithMeta(messages, {
        temperature: 0.1,
        max_tokens: 8000,
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' },
        timeout: 120000,
      });
      if (result.finishReason === 'length') throw new Error('AI 输出被截断');
      return parseJson(result.content);
    } catch (error) {
      lastError = error;
      console.error(`[api] 第 ${attempt} 次失败：${error.response?.data?.error?.message || error.message}`);
      if (attempt < 4) await sleep(1000 * (2 ** attempt));
    }
  }
  throw lastError;
}

async function generateBatch(batch, extraInstruction = '') {
  let feedback = extraInstruction;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const payload = batch.map(question => modelQuestion(question));
      const user = `为以下 ${batch.length} 道题逐题生成解析。${feedback ? `\n额外要求：${feedback}` : ''}\n题目数据：${JSON.stringify(payload)}`;
      const response = await askJson([
        { role: 'system', content: GENERATOR_SYSTEM },
        { role: 'user', content: user },
      ], batch.length);
      const returned = Array.isArray(response.items) ? response.items : [];
      const byId = new Map(returned.map(item => [item.id, item]));
      const errors = [];
      const result = [];
      for (const question of batch) {
        const item = byId.get(question.id);
        if (!item) {
          errors.push(`${question.id} 缺失`);
          continue;
        }
        const explanation = normalizeExplanation(question, item.explanation);
        const itemErrors = validateExplanation(question, explanation);
        if (itemErrors.length) errors.push(`${question.id}: ${itemErrors.join('；')}`);
        result.push({ id: question.id, explanation, warning: String(item.warning || '').trim() });
      }
      if (errors.length) throw new Error(errors.slice(0, 8).join(' | '));
      return result;
    } catch (error) {
      lastError = error;
      feedback = `上次输出未通过质量检查：${error.message}。必须逐条修正，并确保每题结尾写出正确的“应选 X”。`;
    }
  }
  if (batch.length > 1) {
    const middle = Math.ceil(batch.length / 2);
    return [...await generateBatch(batch.slice(0, middle), extraInstruction), ...await generateBatch(batch.slice(middle), extraInstruction)];
  }
  throw new Error(`${batch[0].id} 连续生成失败：${lastError?.message}`);
}

async function reviewBatch(batch, cache) {
  let feedback = '';
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const payload = batch.map(question => modelQuestion(question, cache[question.id]));
      const user = `请逐题终审以下解析。${feedback}\n题目数据：${JSON.stringify(payload)}`;
      const response = await askJson([
        { role: 'system', content: REVIEWER_SYSTEM },
        { role: 'user', content: user },
      ], batch.length);
      const returned = Array.isArray(response.items) ? response.items : [];
      const byId = new Map(returned.map(item => [item.id, item]));
      const result = [];
      const errors = [];
      for (const question of batch) {
        const item = byId.get(question.id);
        if (!item || !['ok', 'fix'].includes(item.status)) {
          errors.push(`${question.id} 缺少有效终审状态`);
          continue;
        }
        const explanation = item.status === 'fix' ? normalizeExplanation(question, item.explanation) : '';
        if (item.status === 'fix') {
          const itemErrors = validateExplanation(question, explanation);
          if (itemErrors.length) errors.push(`${question.id} 修订稿：${itemErrors.join('；')}`);
        }
        result.push({ id: question.id, status: item.status, issue: String(item.issue || '').trim(), explanation, warning: String(item.warning || '').trim() });
      }
      if (errors.length) throw new Error(errors.slice(0, 8).join(' | '));
      return result;
    } catch (error) {
      lastError = error;
      feedback = `上次终审输出不合格：${error.message}。每个 id 都必须返回，fix 时给出符合全部规则的完整解析。`;
    }
  }
  if (batch.length > 1) {
    const middle = Math.ceil(batch.length / 2);
    return [...await reviewBatch(batch.slice(0, middle), cache), ...await reviewBatch(batch.slice(middle), cache)];
  }
  throw new Error(`${batch[0].id} 连续终审失败：${lastError?.message}`);
}

async function runWorkers(batches, worker, label) {
  let next = 0;
  let done = 0;
  const failures = [];
  async function run() {
    while (true) {
      const index = next;
      next += 1;
      if (index >= batches.length) return;
      try {
        await worker(batches[index]);
        done += 1;
        console.log(`[${label}] ${done}/${batches.length} 批完成`);
      } catch (error) {
        const failure = new Error(`${label} 批 ${index + 1} 失败：${error.message}`, { cause: error });
        console.error(`[${label}] ${failure.message}`);
        failures.push(failure);
      }
    }
  }
  await Promise.allSettled(Array.from({ length: Math.min(concurrency, batches.length) }, run));
  if (failures.length) throw new AggregateError(failures, `${label} 有 ${failures.length} 批失败`);
}

async function loadQuestions() {
  const sourceHash = sha256(await fs.readFile(DATA_FILE, 'utf8'));
  const module = await import(`${pathToFileURL(DATA_FILE).href}?t=${Date.now()}`);
  const afterImportHash = sha256(await fs.readFile(DATA_FILE, 'utf8'));
  if (afterImportHash !== sourceHash) throw new Error('导入题库时源文件发生变化，已中止');
  return { questions: module.listGespQuestions(), papers: module.gespPapers, sourceHash };
}

async function updateDataFile(papers, cache, expectedSourceHash, expectedCount) {
  let count = 0;
  for (const sessions of Object.values(papers)) {
    for (const paper of Object.values(sessions)) {
      for (const section of Object.values(paper.sections)) {
        for (const question of section.questions) {
          if (!cache[question.id]) throw new Error(`${question.id} 缺少最终解析，拒绝写入题库`);
          question.explanation = cache[question.id];
          count += 1;
        }
      }
    }
  }
  if (count !== expectedCount) throw new Error(`题库题数变化：${count}/${expectedCount}`);
  const source = await fs.readFile(DATA_FILE, 'utf8');
  if (sha256(source) !== expectedSourceHash) throw new Error('正式回写前题库源文件已变化，已中止以避免覆盖他人修改');
  const startToken = 'export const gespPapers = ';
  const tokenIndex = source.indexOf(startToken);
  const dataStart = tokenIndex + startToken.length;
  const overrideStart = source.indexOf('\n\nconst gespExplanationOverrides =', dataStart);
  const dataEnd = source.lastIndexOf(';', overrideStart);
  if (tokenIndex < 0 || overrideStart < 0 || dataEnd < dataStart) throw new Error('无法定位 gespPapers 数据边界');
  const overridePattern = /const gespExplanationOverrides = \{[\s\S]*?\n\};\n\nconst gespQuestionOverrides =/gu;
  if ([...source.matchAll(overridePattern)].length !== 1) throw new Error('解析覆盖区不是唯一匹配，拒绝回写');
  let output = `${source.slice(0, dataStart)}${JSON.stringify(papers, null, 2)}${source.slice(dataEnd)}`;
  output = output.replace(overridePattern, 'const gespExplanationOverrides = {};\n\nconst gespQuestionOverrides =');
  const temp = `${DATA_FILE}.${process.pid}.${randomUUID()}.tmp.mjs`;
  try {
    await fs.writeFile(temp, output, 'utf8');
    const candidate = await import(`${pathToFileURL(temp).href}?t=${Date.now()}`);
    const candidateQuestions = candidate.listGespQuestions();
    if (candidateQuestions.length !== expectedCount) throw new Error(`候选题库校验失败：${candidateQuestions.length}/${expectedCount}`);
    for (const question of candidateQuestions) {
      const errors = validateExplanation(question, question.explanation);
      if (errors.length) throw new Error(`${question.id} 候选解析不合格：${errors.join('；')}`);
    }
    if (sha256(await fs.readFile(DATA_FILE, 'utf8')) !== expectedSourceHash) throw new Error('原子替换前题库源文件已变化，已中止');
    await fs.rename(temp, DATA_FILE);
  } finally {
    await fs.rm(temp, { force: true }).catch(() => {});
  }
  return count;
}

function buildAudit(questions, cache, review, warnings) {
  const errors = [];
  for (const question of questions) {
    for (const error of validateExplanation(question, cache[question.id])) errors.push({ id: question.id, error });
  }
  const duplicateIds = duplicateExplanationIds(questions, cache);
  for (const id of duplicateIds) errors.push({ id, error: '与不同题干的解析完全重复' });
  const byLevel = {};
  const byType = {};
  for (const question of questions) {
    const level = question.source?.level || 'unknown';
    const type = questionType(question);
    byLevel[level] = (byLevel[level] || 0) + 1;
    byType[type] = (byType[type] || 0) + 1;
  }
  return {
    generatedAt: new Date().toISOString(), total: questions.length, byLevel, byType,
    reviewed: Object.keys(review.reviewed || {}).length, reviewFixes: review.fixCount || 0,
    warnings, duplicateCount: duplicateIds.length, errors,
  };
}

async function main() {
  const { questions, papers, sourceHash } = await loadQuestions();
  const questionById = new Map(questions.map(question => [question.id, question]));
  console.log(`[start] 共 ${questions.length} 道 GESP 客观题，并发 ${concurrency}`);
  let cache = force ? {} : await readJson(CACHE_FILE, {});
  let review = force ? {} : await readJson(REVIEW_FILE, {});
  if (!cache || typeof cache !== 'object' || Array.isArray(cache)) cache = {};
  if (!review || typeof review !== 'object' || Array.isArray(review)) review = {};
  review = {
    version: STATE_VERSION,
    reviewed: review.reviewed && typeof review.reviewed === 'object' ? review.reviewed : {},
    fixCount: Number(review.fixCount) || 0,
    fingerprints: review.fingerprints && typeof review.fingerprints === 'object' ? review.fingerprints : {},
    warnings: review.warnings && typeof review.warnings === 'object' ? review.warnings : {},
  };
  const warnings = review.warnings;
  let saveState = Promise.resolve();
  function queueCheckpoint() {
    const cacheSnapshot = structuredClone(cache);
    const reviewSnapshot = structuredClone(review);
    saveState = saveState.then(async () => {
      await writeJson(CACHE_FILE, cacheSnapshot);
      await writeJson(REVIEW_FILE, reviewSnapshot);
    });
    return saveState;
  }

  if (force) await queueCheckpoint();
  let stateChanged = false;
  const liveIds = new Set(questions.map(question => question.id));
  for (const id of Object.keys(cache)) {
    if (!liveIds.has(id)) { delete cache[id]; stateChanged = true; }
  }
  for (const bucket of [review.reviewed, review.fingerprints, warnings]) {
    for (const id of Object.keys(bucket)) {
      if (!liveIds.has(id)) { delete bucket[id]; stateChanged = true; }
    }
  }
  for (const question of questions) {
    const fingerprint = questionStateFingerprint(question);
    if (!cache[question.id] || review.fingerprints[question.id] !== fingerprint) {
      delete cache[question.id];
      delete review.reviewed[question.id];
      delete review.fingerprints[question.id];
      delete warnings[question.id];
      stateChanged = true;
      continue;
    }
    const normalized = normalizeExplanation(question, cache[question.id]);
    if (validateExplanation(question, normalized).length) {
      delete cache[question.id];
      delete review.reviewed[question.id];
      delete review.fingerprints[question.id];
      delete warnings[question.id];
      stateChanged = true;
      continue;
    }
    if (normalized !== cache[question.id]) {
      cache[question.id] = normalized;
      delete review.reviewed[question.id];
      stateChanged = true;
    }
    const reviewed = review.reviewed[question.id];
    if (reviewed && (reviewed.questionHash !== fingerprint || reviewed.explanationHash !== explanationFingerprint(cache[question.id]))) {
      delete review.reviewed[question.id];
      stateChanged = true;
    }
  }
  if (stateChanged) await queueCheckpoint();

  function storeGenerated(item) {
    const question = questionById.get(item.id);
    if (!question) throw new Error(`未知题目 id：${item.id}`);
    cache[item.id] = normalizeExplanation(question, item.explanation);
    review.fingerprints[item.id] = questionStateFingerprint(question);
    delete review.reviewed[item.id];
    if (item.warning) warnings[item.id] = item.warning;
  }

  async function reviewQuestions(targetQuestions, label = 'review') {
    await runWorkers(makeBatches(targetQuestions, 8, 18000), async batch => {
      const items = await reviewBatch(batch, cache);
      for (const item of items) {
        const question = questionById.get(item.id);
        if (item.status === 'fix') {
          cache[item.id] = normalizeExplanation(question, item.explanation);
          review.fixCount += 1;
        }
        review.reviewed[item.id] = {
          status: item.status,
          issue: item.issue,
          questionHash: questionStateFingerprint(question),
          explanationHash: explanationFingerprint(cache[item.id]),
        };
        if (item.warning) warnings[item.id] = item.warning;
      }
      await queueCheckpoint();
    }, label);
  }

  const missing = questions.filter(question => !cache[question.id]);
  console.log(`[generate] 待生成 ${missing.length} 道`);
  const generateBatchSize = Number(process.env.GESP_GENERATE_BATCH_SIZE || 5);
  const generateMaxItems = Number.isFinite(generateBatchSize)
    ? Math.max(1, Math.min(8, Math.floor(generateBatchSize)))
    : 5;
  await runWorkers(makeBatches(missing, generateMaxItems, 12000), async batch => {
    for (const item of await generateBatch(batch)) storeGenerated(item);
    await queueCheckpoint();
  }, 'generate');

  for (let round = 1; round <= 2; round += 1) {
    const duplicateIds = duplicateExplanationIds(questions, cache);
    if (!duplicateIds.length) break;
    console.log(`[dedupe] 第 ${round} 轮重写 ${duplicateIds.length} 条跨题重复解析`);
    const duplicateQuestions = duplicateIds.map(id => questionById.get(id));
    for (const batch of makeBatches(duplicateQuestions, 6, 12000)) {
      for (const item of await generateBatch(batch, '这些解析与其他不同题目重复，必须使用本题变量、数据、定义或选项写出专属推理。')) storeGenerated(item);
      await queueCheckpoint();
    }
  }

  if (!skipReview) {
    const unreviewed = questions.filter(question => {
      const item = review.reviewed[question.id];
      return !item || item.questionHash !== questionStateFingerprint(question)
        || item.explanationHash !== explanationFingerprint(cache[question.id]);
    });
    console.log(`[review] 待终审 ${unreviewed.length} 道`);
    await reviewQuestions(unreviewed);
  }

  const remainingDuplicates = duplicateExplanationIds(questions, cache);
  if (remainingDuplicates.length) {
    console.log(`[dedupe] 终审后重写 ${remainingDuplicates.length} 条重复解析`);
    const rewritten = remainingDuplicates.map(id => questionById.get(id));
    for (const question of rewritten) {
      const [generated] = await generateBatch([question], '终审后仍与其他题重复。必须写出只属于本题的具体推导。');
      storeGenerated(generated);
    }
    await queueCheckpoint();
    if (!skipReview) await reviewQuestions(rewritten, 'review-after-dedupe');
  }

  const audit = buildAudit(questions, cache, review, warnings);
  await writeJson(REPORT_FILE, audit);
  if (audit.errors.length) throw new Error(`最终质量检查仍有 ${audit.errors.length} 个问题，详见 ${REPORT_FILE}`);
  if (!skipReview && audit.reviewed !== questions.length) throw new Error(`终审覆盖 ${audit.reviewed}/${questions.length}，未达到全量覆盖`);
  if (Object.keys(warnings).length && !allowSourceWarnings) {
    throw new Error(`仍有 ${Object.keys(warnings).length} 道题存在缺失信息警告，已阻止正式回写；如已人工确认这些源题警告，可使用 --allow-source-warnings，详见 ${REPORT_FILE}`);
  }
  const updated = await updateDataFile(papers, cache, sourceHash, questions.length);
  console.log(`[done] 已更新 ${updated} 道解析；终审修订 ${audit.reviewFixes} 道`);
  console.log(`[done] 质量报告：${REPORT_FILE}`);
}

main().catch(error => {
  console.error(`[fatal] ${error.stack || error.message}`);
  process.exitCode = 1;
});
