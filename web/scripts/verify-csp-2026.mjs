import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { csp2026ChoicePapers, csp2026ProgramProblems } from '../src/data/csp2026.js';
import { renderCspMarkdown } from '../src/utils/cspMarkdown.js';

const choices = csp2026ChoicePapers['2026'];
const programs = csp2026ProgramProblems;
assert.equal(choices.length, 15);
assert.equal(programs.length, 5);
assert.equal(new Set([...choices, ...programs].map(q => q.id)).size, 20);
assert.deepEqual(programs.map(q => q.questions.length), [6, 6, 6, 5, 5]);
assert.deepEqual(programs.map(q => q.questions.reduce((sum, p) => sum + p.score, 0)), [13, 13.5, 13.5, 15, 15]);
assert.deepEqual(programs.flatMap(q => q.questions.map(p => p.originalNumber)), Array.from({ length: 28 }, (_, i) => i + 16));
const expectedChoices = 'BDCCBDDCBAADCAB';
assert.equal(choices.map(q => q.answer).join(''), expectedChoices);
assert.deepEqual(programs.map(q => q.questions.map(p => p.answers[0]).join('')), ['ABAACC', 'ABBBAC', 'BAABDC', 'DBDBC', 'BDCAD']);
for (const q of choices) {
  assert.ok(q.options[q.answer]);
  assert.ok(q.explanation.length > 70);
  assert.ok(q.tags.length);
}
for (const q of programs) {
  for (const p of q.questions) {
    assert.equal(p.answers.length, 1);
    assert.ok(p.options[p.answers[0]]);
    assert.ok(p.explanation.length > 60);
  }
  assert.ok(!q.statement.includes('{{ select('));
  assert.ok(renderCspMarkdown(q.statement).includes('<pre>'));
}

function codeOf(q) {
  return q.statement.match(/```cpp\n([\s\S]*?)\n```/)[1].replace(/^\d{2} /gm, '');
}
assert.deepEqual(programs.map(q => codeOf(q).split('\n').length), [18, 34, 25, 28, 37]);
assert.equal(codeOf(programs[0]).split('\n')[10].trim(), '++x;');
assert.equal(codeOf(programs[1]).split('\n')[21].trim(), 'if (c[i] >= 10) {');
assert.equal(codeOf(programs[2]).split('\n')[16].trim(), 'for (int i = 0; i <= 9; i++) {');
assert.match(programs[3].statement, /m×n/);
assert.equal(programs[3].questions[1].options.A, '`x * n`');

// Independently verify the arithmetic, counting and BFS choices.
assert.equal(BigInt(10 ** 18) + 1n <= (1n << 63n) - 1n, true);
assert.equal(parseInt('2F5', 16).toString(8), '1365');
function validStack(order) {
  const stack = []; let next = 1;
  for (const want of order) {
    while (next <= 4 && stack.at(-1) !== want) stack.push(next++);
    if (stack.pop() !== want) return false;
  }
  return true;
}
assert.deepEqual([[2,4,3,1],[1,2,3,4],[3,1,2,4],[1,4,3,2]].map(validStack), [true,true,false,true]);
assert.equal(Array.from({ length: 100 }, (_, i) => i + 1).filter(i => 2 * i > 100).length, 50);
const stairs = [1];
for (let i = 1; i <= 8; i++) stairs[i] = [1,2,3].reduce((s, k) => s + (stairs[i-k] || 0), 0);
assert.equal(stairs[8], 81);
const grid = ['S..#.','...#.','...#.','##..E','...#.'];
const queue = [[0,0]], seen = new Set(['0,0']);
outer: for (let head = 0; head < queue.length; head++) {
  const [r,c] = queue[head];
  for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const x=r+dr,y=c+dc,key=`${x},${y}`;
    if (x<0 || y<0 || x>=5 || y>=5 || grid[x][y]==='#' || seen.has(key)) continue;
    seen.add(key); queue.push([x,y]);
    if (grid[x][y]==='E') break outer;
  }
}
assert.equal(queue.length, 14);
assert.deepEqual(queue.slice(-4), [[4,2],[3,3],[4,1],[3,4]]);
const gcd = (a,b) => b ? gcd(b,a%b) : a;
assert.deepEqual(Array.from({length:100},(_,i)=>i+1).filter(n=>gcd(n,60)===6), [6,18,42,54,66,78]);
const coins=[0];
for(let i=1;i<=9;i++) coins[i]=Math.min(...[1,4,6].filter(c=>c<=i).map(c=>coins[i-c]+1));
assert.equal(coins[9],3);
function comparisons(target) {
  let l=0,r=999,count=0;
  while(l<=r) { count++; const m=Math.floor((l+r)/2); if(m===target) break; if(m<target) l=m+1; else r=m-1; }
  return count;
}
assert.equal(Math.max(...Array.from({length:2003},(_,i)=>comparisons(i/2-1))),10);
assert.equal((3*100+10)-(3*81+9),58);
assert.equal(Math.min(...Array.from({length:22},(_,p)=>[1,3,4,7,10,15,20].reduce((s,x)=>s+Math.abs(x-p),0))),37);
assert.equal((4*3+6*4)/2,18);

// Compile the actual stored C++ (after stripping display line numbers).
// No live database, network service or user submissions are touched.
const compiler = process.env.CXX || 'g++';
const probe = spawnSync(compiler, ['--version'], { encoding: 'utf8' });
assert.equal(probe.status, 0, 'C++ 验算需要可用的 g++，也可通过 CXX 指定编译器');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-2026-check-'));
let serial = 0;
function compile(code) {
  const file = path.join(testDir, `check-${serial++}${process.platform === 'win32' ? '.exe' : ''}`);
  const result = spawnSync(compiler, ['-x','c++','-std=c++17','-O0','-o',file,'-'], { input: code, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr);
  return input => {
    const run = spawnSync(file, [], { input, encoding: 'utf8', timeout: 5000 });
    assert.equal(run.status, 0, run.stderr || `运行超时或失败：${input}`);
    return run.stdout.trim();
  };
}
function completed(q) {
  return codeOf(q).replace(/[①②③④⑤]/g, mark => {
    const p = q.questions['①②③④⑤'.indexOf(mark)];
    return p.options[p.answers[0]].replace(/^`|`$/g, '');
  });
}
function referenceSplit(s) {
  const a=[...s].map(c=>parseInt(c,16)); let best=Infinity;
  for(let mask=1;mask<(1<<(a.length-1));mask++) {
    const means=[]; let sum=0,len=0;
    for(let i=0;i<a.length;i++) {
      sum+=a[i];len++;
      if(i===a.length-1 || mask&(1<<i)) { means.push(sum/len);sum=0;len=0; }
    }
    best=Math.min(best,Math.max(...means)-Math.min(...means));
  }
  return best;
}
try {
  for(const [number,expected] of [[3,'7'],[6,'2418'],[11,'14,13']]) {
    const body=choices[number-1].question.match(/```cpp\n([\s\S]*?)\n```/)[1];
    const output=compile(`#include <iostream>\nusing namespace std;\nint main(){\n${body}\n${number===6?'cout << s;':''}\n}`)('');
    assert.equal(output, expected);
  }
  const first=compile(codeOf(programs[0]));
  for(const n of [0,1,2,3,6,1024,2147483647]) {
    const bits=n.toString(2),len=n===0?0:bits.length,ones=[...bits].filter(c=>c==='1').length;
    assert.equal(first(String(n)), `${len+1} ${ones+1}`);
  }
  assert.equal(compile(codeOf(programs[0]).replace('            ++x;\n            ++y;', '            ++y;'))('1'),'1 2');
  const second=compile(codeOf(programs[1]));
  assert.equal(second('123 456'),'0579'); assert.equal(second('12345 678'),'013023');
  assert.equal(second('0 0'),'00'); assert.equal(second('999 1'),'1000');
  assert.equal(compile(codeOf(programs[1]).replace(' + carry[i]',''))('123 456'),'0579');
  assert.equal(compile(codeOf(programs[1]).replace('c[i] >= 10','c[i] > 10'))('95 15'),'01010');
  const third=compile(codeOf(programs[2]));
  assert.equal(third('10'),'23\n29\n31\n37\n53\n59\n71\n73\n79');
  assert.deepEqual(third('24').split(/\r?\n/).slice(0,3),['233','239','29']);
  assert.deepEqual(third('200').split(/\r?\n/).map(Number),[233,239,293,311,313,317,373,379,593,599,719,733,739,797]);
  const odd=compile(codeOf(programs[2]).replace('int i = 0; i <= 9; i++','int i = 1; i <= 9; i += 2'));
  for(const n of [11,24,200,1000]) assert.equal(odd(String(n)),third(String(n)));
  const convert=compile(completed(programs[3]));
  for(const [n,m] of [[2,2],[2,10],[3,7],[4,3],[10,10],[10,2]]) {
    for(const digits of [[0],[1],[n*m-1],[1,2],[0,0,1],[n*m-1,0,n*m-2,1]]) {
      const value=digits.reduce((v,x)=>v*BigInt(n*m)+BigInt(x),0n);
      assert.equal(convert(`${n} ${m} ${digits.length}\n${digits.join(' ')}`),value.toString(n).split('').join(' '));
    }
  }
  const split=compile(completed(programs[4]));
  for(const s of ['00','09','AF','012','016A','01234567','FFFFFFFF','001001','9A0F1','1234567890ABCDEF0123']) {
    const actual=Number(split(`${s.length} ${s}`));
    assert.ok(Math.abs(actual-referenceSplit(s))<0.000001, `${s}: ${actual}`);
  }
  console.log('PASS: 43 answers, 20 question IDs, 30/40/30 points, original code lines, C++ execution and independent counting / partition checks.');
} finally {
  const relative=path.relative(os.tmpdir(),testDir);
  if(!path.isAbsolute(relative) && relative.startsWith('csp-2026-check-') && !relative.includes(path.sep)) fs.rmSync(testDir,{recursive:true,force:true});
}
