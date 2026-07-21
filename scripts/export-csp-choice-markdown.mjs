import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cspChoicePapers } from '../web/src/data/cspChoicePapers.js';
import { csp2025ChoicePapers } from '../web/src/data/csp2025.js';
import { cspSChoicePapers } from '../web/src/data/cspS.js';
import { buildLegacyChoiceExplanation } from '../web/src/data/cspLegacyAnalysis.js';
import { buildSChoiceExplanation } from '../web/src/data/cspSAnalysis.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(root, 'exports', 'csp-choice-markdown');
const jPapers = { ...cspChoicePapers, ...csp2025ChoicePapers };

const questionCorrections = {
  '2019-choice-15': `正实数构成的数字三角形排列形式如图所示。第一行的数为 a₁,₁；第二行的数从左到右依次为 a₂,₁、a₂,₂；第 n 行的数为 aₙ,₁、aₙ,₂、…、aₙ,ₙ。从 a₁,₁ 开始，每个数 aᵢ,ⱼ 只有两条边，分别通向下一行的 aᵢ₊₁,ⱼ 和 aᵢ₊₁,ⱼ₊₁。用动态规划找出一条从 a₁,₁ 向下通到第 n 行某个数的路径，使路径上的数之和最大。

![数字三角形](/csp-assets/2019-choice-15.jpg)

令 C[i][j] 表示从 a₁,₁ 到 aᵢ,ⱼ 的路径最大和，并且 C[i][0]=C[0][j]=0，则 C[i][j]=（ ）。`,
  '2023-choice-14': '若 n=Σ(i=0..k)16ⁱ·xᵢ，定义 f(n)=Σxᵢ。反复令 n=f(n)，直到得到不动点。问在 100₁₆ 到 1A0₁₆ 中，关于 f 的不动点为 9 的自然数有多少个？',
  '2023-choice-15': `现在用如下代码计算 xⁿ，其时间复杂度为（ ）。

\`\`\`cpp
double quick_power(double x, unsigned n) {
    if (n == 0) return 1;
    if (n == 1) return x;
    return quick_power(x, n / 2) * quick_power(x, n / 2) * ((n & 1) ? x : 1);
}
\`\`\``,
};

const optionCorrections = {
  '2019-choice-15': {
    A: 'max{C[i-1][j-1], C[i-1][j]} + aᵢ,ⱼ',
    B: 'C[i-1][j-1] + C[i-1][j]',
    C: 'max{C[i-1][j-1], C[i-1][j]} + 1',
    D: 'max{C[i][j-1], C[i-1][j]} + aᵢ,ⱼ',
  },
  '2020-choice-5': {
    D: '⌊x/2⌋ mod 11，其中 ⌊x/2⌋ 表示 x/2 下取整',
  },
};

const subscript = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', x: 'ₓ', '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', ',': ',' };
const superscript = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', h: 'ʰ', i: 'ⁱ', n: 'ⁿ', '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾' };

function mapped(value, table, fallback) {
  const characters = [...String(value)];
  return characters.every(char => table[char]) ? characters.map(char => table[char]).join('') : fallback;
}

function cleanInline(value) {
  const protectedParts = [];
  let text = String(value || '').replace(/`[^`\n]*`|!?\[[^\]]*\]\([^)]+\)/g, token => {
    const cleaned = token.replace('/csp-assets/', '../../web/public/csp-assets/');
    return `@@CSPPROTECTED${protectedParts.push(cleaned) - 1}@@`;
  });
  text = text
    .replace(/\\texttt\s*\{([^{}]*)\}/g, '`$1`')
    .replace(/\\(?:text|mathrm)\s*\{([^{}]*)\}/g, '$1')
    .replace(/\\(?:leqslant|leq)/g, '≤').replace(/\\(?:geqslant|geq)/g, '≥')
    .replace(/\\neq/g, '≠').replace(/\\times/g, '×').replace(/\\cdot/g, '·')
    .replace(/\\sum/g, 'Σ').replace(/\\in/g, '∈').replace(/\\(?:cdots|dots)/g, '…')
    .replace(/\\(?:rightarrow|to)/g, '→').replace(/\\sim/g, '∼')
    .replace(/\\Theta/g, 'Θ').replace(/\\alpha/g, 'α').replace(/\\log/g, 'log')
    .replace(/\\(?:left)?\\lfloor/g, '⌊').replace(/\\(?:left)?\\rfloor/g, '⌋')
    .replace(/\\oplus/g, '⊕').replace(/\\(?:land|wedge)/g, '∧').replace(/\\(?:lor|vee)/g, '∨')
    .replace(/\\neg/g, '¬').replace(/\\(?:quad|qquad|,|;|!)/g, ' ')
    .replace(/\\%/g, '%').replace(/\\\s+/g, ' ')
    .replace(/\\\}(?=\s*(?:[+\-*/]|$))/g, '')
    .replace(/\\([{}])/g, '$1')
    .replace(/\\d?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1) / ($2)')
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, '√($1)')
    .replace(/\\sqrt\s+([A-Za-z0-9]+)/g, '√$1')
    .replace(/(\b[0-9A-F]+|\([0-9A-F]+\))_\{?(\d+)\}?/g, (_, base, index) => `${base}${mapped(index, subscript, `_[${index}]`)}`)
    .replace(/(?<![A-Za-z0-9_])([A-Za-z0-9)\]])_\{([^{}]+)\}/g, (_, base, index) => `${base}${mapped(index.replace(/\s+/g, ''), subscript, `_[${index}]`)}`)
    .replace(/(?<![A-Za-z0-9_])([A-Za-z0-9)\]])_([A-Za-z0-9])/g, (_, base, index) => `${base}${mapped(index, subscript, `_[${index}]`)}`)
    .replace(/([A-Za-z0-9)\]])\^\{([^{}]+)\}/g, (_, base, power) => `${base}${mapped(power.replace(/\s+/g, ''), superscript, `^(${power})`)}`)
    .replace(/([A-Za-z0-9)\]])\^\(([^()]+)\)/g, (_, base, power) => `${base}${mapped(`(${power.replace(/\s+/g, '')})`, superscript, `^(${power})`)}`)
    .replace(/([A-Za-z0-9)\]])\^([A-Za-z0-9]+)/g, (_, base, power) => `${base}${mapped(power, superscript, `^${power}`)}`)
    .replace(/\$/g, '')
    .replace(/\u2061/g, '')
    .replace(/（\s*[)）]/g, '（ ）')
    .replace(/[ \t]+$/gm, '')
    .replace(/[ \t]{2,}/g, ' ');

  return text.replace(/@@CSPPROTECTED(\d+)@@/g, (_, index) => protectedParts[Number(index)]).trim();
}

function cleanMarkdown(value) {
  const blocks = [];
  return cleanInline(String(value || '').replace(/```[\s\S]*?```/g, block => `@@CSPBLOCK${blocks.push(block) - 1}@@`))
    .replace(/@@CSPBLOCK(\d+)@@/g, (_, index) => blocks[Number(index)])
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function explanation(level, question) {
  if (level === 'S') return buildSChoiceExplanation(question);
  if (Number(question.id.slice(0, 4)) <= 2024) return buildLegacyChoiceExplanation(question);
  return question.explanation || `参考答案为 ${question.answer}。`;
}

function renderPaper(level, year, questions) {
  const lines = [`## ${year} 年`, ''];
  for (const question of questions) {
    const correctedOptions = level === 'S' && optionCorrections[question.id]
      ? { ...question.options, ...optionCorrections[question.id] }
      : question.options;
    const correctedQuestion = level === 'S'
      ? { ...question, question: questionCorrections[question.id] || question.question, options: correctedOptions }
      : question;
    const rawQuestion = correctedQuestion.question;
    lines.push(`### 第 ${question.number} 题`, '', cleanMarkdown(rawQuestion), '');
    for (const [key, option] of Object.entries(correctedOptions)) {
      lines.push(`- ${key}. ${cleanMarkdown(option)}`);
    }
    lines.push('', `**答案：${question.answer}**`, '', '**解析：**', '', cleanMarkdown(explanation(level, correctedQuestion)), '', '---', '');
  }
  return lines.join('\n');
}

function renderLevel(level, papers) {
  const years = Object.keys(papers).sort((a, b) => Number(a) - Number(b));
  const count = years.reduce((sum, year) => sum + papers[year].length, 0);
  const title = `CSP-${level} 第一轮历年选择题（${years[0]}–${years.at(-1)}）`;
  return [
    `# ${title}`,
    '',
    `> 从当前“CSP-J/S 练习”模块提取，共 ${count} 道题。已统一清理 LaTeX 标记、PDF 提取噪声和异常空白；答案与解析仅供学习参考。`,
    '',
    ...years.map(year => renderPaper(level, year, papers[year])),
  ].join('\n').trim() + '\n';
}

function verify(level, papers, markdown) {
  const expected = Object.values(papers).reduce((sum, paper) => sum + paper.length, 0);
  const headings = (markdown.match(/^### 第 \d+ 题$/gm) || []).length;
  const answers = (markdown.match(/^\*\*答案：[A-Z]+\*\*$/gm) || []).length;
  const forbidden = [/\$[^\n$]+\$/, /\\(?:text|frac|dfrac|sqrt|sum|Theta|alpha|lfloor|rfloor|cdot|times|leq|geq)/, /\uFFFD/, /\{\{\s*select/];
  if (headings !== expected || answers !== expected) throw new Error(`${level}: 题目或答案数量不一致（预期 ${expected}）`);
  for (const pattern of forbidden) if (pattern.test(markdown)) throw new Error(`${level}: 仍有未清理内容 ${pattern}`);
}

async function packageImages(markdown) {
  const sources = [...new Set([...markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1]))];
  const assetsDir = path.join(outputDir, 'assets');
  await mkdir(assetsDir, { recursive: true });
  let result = markdown;
  for (const source of sources) {
    const sourcePath = source.startsWith('http') ? new URL(source).pathname : source;
    const fileName = path.basename(sourcePath);
    const destination = path.join(assetsDir, fileName);
    if (source.startsWith('http')) {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`题图下载失败：${source}`);
      await writeFile(destination, Buffer.from(await response.arrayBuffer()));
    } else {
      await copyFile(path.resolve(outputDir, source), destination);
    }
    result = result.replaceAll(source, `assets/${fileName}`);
  }
  return result;
}

await mkdir(outputDir, { recursive: true });
for (const [level, papers] of [['J', jPapers], ['S', cspSChoicePapers]]) {
  const markdown = await packageImages(renderLevel(level, papers));
  verify(level, papers, markdown);
  await writeFile(path.join(outputDir, `CSP-${level}-历年选择题.md`), markdown, 'utf8');
}

console.log(`已导出到 ${outputDir}`);
