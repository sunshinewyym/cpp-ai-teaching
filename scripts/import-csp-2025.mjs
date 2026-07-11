import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const questionSource = 'https://oj.33dai.cn/p/CSP25J1';
const answerSource = 'https://www.cnblogs.com/my-algorithms/p/20453766';
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Public reference answers, kept neutral because CCF did not publish an answer sheet.
const referenceAnswers = [
  'A','B','B','B','B','C','C','D','B','C','B','B','A','C','A',
  'A','B','A','B','D','A','A','A','B','B','A','B','A','A','B','D','A','B',
  'C','B','B','B','C','B','C','D','A','C',
];

function clean(value) {
  return String(value || '').replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trim();
}

function parseQuestions(markdown) {
  const markers = [...markdown.matchAll(/\{\{\s*select\((\d+)\)\s*\}\}/g)];
  const questions = [];
  let previousEnd = 0;
  for (const [markerIndex, marker] of markers.entries()) {
    const number = Number(marker[1]);
    const before = markdown.slice(previousEnd, marker.index);
    const numberedLines = [...before.matchAll(/^\s*\d+[.、]\s+/gm)];
    const questionStart = numberedLines.at(-1)?.index ?? 0;
    const prompt = clean(before.slice(questionStart).replace(/^\s*\d+[.、]\s+/, ''));
    const afterStart = marker.index + marker[0].length;
    const afterEnd = markers[markerIndex + 1]?.index ?? markdown.length;
    const after = markdown.slice(afterStart, afterEnd);
    const optionMatches = [...after.matchAll(/^\s*-\s+(.+)$/gm)].slice(0, 4);
    if (optionMatches.length < 2) throw new Error(`第 ${number} 题选项解析失败`);
    const options = Object.fromEntries(optionMatches.map((item, index) => [letters[index], clean(item[1])]));
    const lastOption = optionMatches.at(-1);
    previousEnd = afterStart + lastOption.index + lastOption[0].length;
    questions.push({ number, prompt, options, answer: referenceAnswers[number - 1] });
  }
  if (questions.length !== 43) throw new Error(`应有 43 小题，实际解析到 ${questions.length} 题`);
  return questions;
}

function splitGroups(section, expected) {
  const headings = [...section.matchAll(/^##\s+(\d+)\.\s*(.*)$/gm)].filter(item => Number(item[1]) <= expected);
  return headings.slice(0, expected).map((heading, index) => ({
    heading: clean(heading[2]),
    description: clean(section.slice(heading.index, headings[index + 1]?.index ?? section.length)),
  }));
}

function statementOnly(description) {
  const lastFence = description.lastIndexOf('```');
  return lastFence >= 0 ? clean(description.slice(0, lastFence + 3)) : description;
}

function scoreFor(number, prompt) {
  if (number <= 15) return 2;
  if (number >= 34) return 3;
  const explicit = prompt.match(/[（(]\s*(\d+(?:\.\d+)?)\s*分\s*[）)]/);
  if (explicit) return Number(explicit[1]);
  const offset = number <= 21 ? number - 16 : number <= 27 ? number - 22 : number - 28;
  return offset < 3 ? 1.5 : 3;
}

function projectQuestion(item, type, groupNumber, localNumber) {
  const answers = [item.answer];
  const answerText = `${item.answer}（${item.options[item.answer]}）`;
  return {
    id: `2025-${type}-${groupNumber}-${localNumber}`,
    number: localNumber,
    text: item.prompt,
    options: item.options,
    answers,
    multiple: false,
    score: scoreFor(item.number, item.prompt),
    explanation: `参考答案为 ${answerText}。请结合完整程序，按执行顺序记录关键变量，再与各选项逐一核对。`,
  };
}

async function fetchWithRetry(url, options) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const response = await fetchWithRetry(questionSource, { headers: { Accept: 'application/json', 'User-Agent': 'Codex' } });
if (!response.ok) throw new Error(`2025 题面请求失败：${response.status}`);
const payload = await response.json();
const markdown = JSON.parse(payload.pdoc.content).zh;
const parsed = parseQuestions(markdown);

const choices = parsed.slice(0, 15).map(item => ({
  id: `2025-choice-${item.number}`,
  number: item.number,
  question: item.prompt,
  options: item.options,
  answer: item.answer,
}));

const readingSection = markdown.slice(markdown.indexOf('## 二、'), markdown.indexOf('## 三、'));
const completionSection = markdown.slice(markdown.indexOf('## 三、'));
const readingGroups = splitGroups(readingSection, 3);
const completionGroups = splitGroups(completionSection, 2);
const readingRanges = [[16, 21], [22, 27], [28, 33]];
const completionRanges = [[34, 38], [39, 43]];

const programs = [
  ...readingGroups.map((group, index) => ({
    id: `2025-reading-${index + 1}`, year: '2025', type: 'reading', number: index + 1,
    title: `阅读程序第 ${index + 1} 题`, description: group.description, statement: statementOnly(group.description),
    questions: parsed.slice(readingRanges[index][0] - 1, readingRanges[index][1]).map((item, local) => projectQuestion(item, 'reading', index + 1, local + 1)),
    sourceUrl: questionSource, answerSource,
  })),
  ...completionGroups.map((group, index) => ({
    id: `2025-completion-${index + 1}`, year: '2025', type: 'completion', number: index + 1,
    title: group.heading.replace(/^[（(]|[）)]$/g, '') || `完善程序第 ${index + 1} 题`,
    description: group.description, statement: statementOnly(group.description),
    questions: parsed.slice(completionRanges[index][0] - 1, completionRanges[index][1]).map((item, local) => projectQuestion(item, 'completion', index + 1, local + 1)),
    sourceUrl: questionSource, answerSource,
  })),
];

const output = `// Generated by scripts/import-csp-2025.mjs. Answers are public reference answers, not an official CCF answer sheet.\nexport const csp2025ChoicePapers = ${JSON.stringify({ 2025: choices }, null, 2)};\n\nexport const csp2025ProgramProblems = ${JSON.stringify(programs, null, 2)};\n\nexport const csp2025YearSource = ${JSON.stringify({ 2025: { url: questionSource, status: '已导入' } }, null, 2)};\n`;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await writeFile(path.join(root, 'web/src/data/csp2025.js'), output, 'utf8');
console.log(`Imported 2025: ${choices.length} choices, ${programs.filter(item => item.type === 'reading').length} reading and ${programs.filter(item => item.type === 'completion').length} completion problems.`);
