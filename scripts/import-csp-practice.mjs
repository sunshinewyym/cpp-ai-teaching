import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const sources = {
  2019: 'https://ti.luogu.com.cn/problemset/1030?submission=1542888',
  2020: 'https://ti.luogu.com.cn/problemset/1034?submission=1542884',
  2021: 'https://ti.luogu.com.cn/problemset/1036?submission=1542881',
  2022: 'https://ti.luogu.com.cn/problemset/1039?submission=1542879',
  2023: 'https://ti.luogu.com.cn/problemset/1041?submission=1542876',
  2024: 'https://ti.luogu.com.cn/problemset/1043?submission=1542866',
};

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetDir = path.join(root, 'web/public/csp-assets');

function readInjectedData(html, year) {
  const match = html.match(/window\._feInjection = JSON\.parse\(decodeURIComponent\("([\s\S]*?)"\)\);/);
  if (!match) throw new Error(`${year}: 页面中没有找到题库数据`);
  return JSON.parse(decodeURIComponent(match[1]));
}

function cleanMarkdown(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

function cleanChoiceDescription(value) {
  return cleanMarkdown(value).replace(/^#{1,6}\s+一、单项选择题[^\n]*\n+/i, '').trim();
}

function extractTitle(description, fallback) {
  const bold = description.match(/\*\*（([^）]+)）\*\*/);
  if (bold) return bold[1].trim();
  const heading = [...description.matchAll(/^###\s+第\s*\d+\s*题\s*$/gm)].at(-1);
  if (heading) return fallback;
  return fallback;
}

function questionPrompts(description, expectedCount, type) {
  const tail = description.slice(description.lastIndexOf('```') + 3);
  const matches = [...tail.matchAll(/^\s*(\d+)[.、)）]\s*([\s\S]*?)(?=^\s*\d+[.、)）]\s*|\s*$)/gm)];
  const prompts = matches.map((match) => {
    const block = match[2]
      .replace(/^\s*[A-Z][.、]\s+.*$/gms, '')
      .replace(/\n\s*[A-Z][.、][\s\S]*$/m, '')
      .trim();
    return block.split('\n').filter(line => !/^\s*[A-Z][.、]/.test(line)).join(' ').trim();
  }).filter(Boolean);
  const circled = ['①', '②', '③', '④', '⑤', '⑥', '⑦'];
  return Array.from({ length: expectedCount }, (_, index) => prompts[index] || (type === 'completion' ? `${circled[index]} 处应填（ ）` : `第 ${index + 1} 小题`));
}

function explanationFor(question) {
  const answerText = question.answers.map(answer => `${answer}（${question.options[answer]}）`).join('、');
  if (question.answers.length > 1) return `本题按原卷标记为多选，参考答案为 ${answerText}。结合完整程序逐句跟踪变量和调用过程，注意题面中的特殊说明。`;
  return `参考答案为 ${answerText}。建议从题目给定的输入开始，按程序实际执行顺序记录关键变量，再与各选项逐一核对。`;
}

function statementOnly(description, type) {
  const lastFence = description.lastIndexOf('```');
  if (lastFence >= 0) return description.slice(0, lastFence + 3).trim();

  const sectionMarker = type === 'reading'
    ? /\n\s*(?:#{1,6}\s*)?[•●]?\s*(?:判断题|单选题)\s*\n/i
    : /\n\s*(?:①\s*处应填|①处应填|①\s*[~～—-]\s*⑤|1[)）.]\s*①)/;
  return description.split(sectionMarker)[0].trim();
}

async function localizeImages(markdown, year, problemId) {
  const urls = [...markdown.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g)].map(match => match[1]);
  let localized = markdown;
  for (const [index, url] of urls.entries()) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${year}: 题面图片下载失败 ${response.status}`);
    const extension = path.extname(new URL(url).pathname) || '.png';
    const fileName = `${year}-${problemId}-${index + 1}${extension}`;
    await mkdir(assetDir, { recursive: true });
    await writeFile(path.join(assetDir, fileName), Buffer.from(await response.arrayBuffer()));
    localized = localized.replaceAll(url, `/csp-assets/${fileName}`);
  }
  return localized;
}

async function projectProblem(problem, year, type, number, sourceUrl) {
  const description = await localizeImages(cleanMarkdown(problem.description), year, problem.id);
  const prompts = questionPrompts(description, problem.questions.length, type);
  const questions = problem.questions.map((question, index) => {
    const options = Object.fromEntries(question.choices.map((choice, optionIndex) => [letters[optionIndex], cleanMarkdown(choice)]));
    const answers = question.correctAnswers.flatMap(answer => answer.length > 1 && !options[answer] ? [...answer] : [answer]);
    const projected = {
      id: `${year}-${type}-${number}-${index + 1}`,
      number: index + 1,
      text: prompts[index],
      options,
      answers,
      multiple: question.allowMultiChoices || answers.length > 1,
      score: question.score,
    };
    projected.explanation = explanationFor(projected);
    return projected;
  });
  return {
    id: `${year}-${type}-${number}`,
    year: String(year),
    type,
    number,
    title: extractTitle(description, `${type === 'reading' ? '阅读程序' : '完善程序'}第 ${number} 题`),
    description,
    statement: statementOnly(description, type),
    questions,
    sourceUrl,
  };
}

const problems = [];
const choicePapers = {};
for (const [year, sourceUrl] of Object.entries(sources)) {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`${year}: 请求失败 ${response.status}`);
  const data = readInjectedData(await response.text(), year);
  const sourceProblems = data.currentData.submission.problemset.problems;
  if (sourceProblems.length < 20) throw new Error(`${year}: 原卷题目数量异常`);
  choicePapers[year] = sourceProblems.slice(0, 15).map((problem, index) => ({
    id: `${year}-choice-${index + 1}`,
    number: index + 1,
    question: cleanChoiceDescription(problem.description),
    options: Object.fromEntries(problem.questions[0].choices.map((choice, optionIndex) => [letters[optionIndex], cleanMarkdown(choice)])),
    answer: problem.questions[0].correctAnswers.join(''),
  }));
  for (const [index, problem] of sourceProblems.slice(15, 18).entries()) problems.push(await projectProblem(problem, year, 'reading', index + 1, sourceUrl));
  for (const [index, problem] of sourceProblems.slice(18, 20).entries()) problems.push(await projectProblem(problem, year, 'completion', index + 1, sourceUrl));
}

const output = `// Generated by scripts/import-csp-practice.mjs from the Luogu links supplied by the user.\nexport const cspProgramProblems = ${JSON.stringify(problems, null, 2)};\n`;
await writeFile(path.join(root, 'web/src/data/cspProgramProblems.js'), output, 'utf8');
const choiceOutput = `// Generated by scripts/import-csp-practice.mjs from the Luogu links supplied by the user.\nexport const cspChoicePapers = ${JSON.stringify(choicePapers, null, 2)};\n\nexport const cspYearSources = ${JSON.stringify(Object.fromEntries(Object.entries(sources).map(([year, url]) => [year, { url, status: '已导入' }])), null, 2)};\n`;
await writeFile(path.join(root, 'web/src/data/cspChoicePapers.js'), choiceOutput, 'utf8');
console.log(`Imported ${Object.values(choicePapers).reduce((sum, paper) => sum + paper.length, 0)} choices, ${problems.filter(item => item.type === 'reading').length} reading and ${problems.filter(item => item.type === 'completion').length} completion problems.`);
