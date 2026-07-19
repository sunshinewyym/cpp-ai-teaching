const cspJ = require('./web/src/data/cspChoicePapers.js');
const cspS = require('./web/src/data/cspS.js');
const fs = require('fs');

let md = '# CSP 历年选择题汇编\n\n';

// CSP-J
md += '## CSP-J（入门级）\n\n';
const jYears = Object.keys(cspJ.cspChoicePapers).sort();
for (const year of jYears) {
  const questions = cspJ.cspChoicePapers[year];
  md += '### ' + year + '年\n\n';
  for (const q of questions) {
    md += '**' + q.number + '. ' + q.question + '**\n\n';
    for (const [key, val] of Object.entries(q.options)) {
      md += key + '. ' + val + '\n';
    }
    md += '\n**答案：** ' + q.answer + '\n\n';
    if (q.explanation) {
      md += '> ' + q.explanation + '\n\n';
    }
    md += '---\n\n';
  }
}

// CSP-S
md += '## CSP-S（提高级）\n\n';
const sYears = Object.keys(cspS.cspSChoicePapers).sort();
for (const year of sYears) {
  const questions = cspS.cspSChoicePapers[year];
  md += '### ' + year + '年\n\n';
  for (const q of questions) {
    md += '**' + q.number + '. ' + q.question + '**\n\n';
    for (const [key, val] of Object.entries(q.options)) {
      md += key + '. ' + val + '\n';
    }
    md += '\n**答案：** ' + q.answer + '\n\n';
    if (q.explanation) {
      md += '> ' + q.explanation + '\n\n';
    }
    md += '---\n\n';
  }
}

fs.writeFileSync('C:/Users/sunsh/VSCode files/CSP真题/CSP选择题汇编.md', md, 'utf-8');
console.log('Done! File size:', md.length, 'bytes');
