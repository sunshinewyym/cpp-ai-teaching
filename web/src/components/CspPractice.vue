<template>
  <main class="csp-page">
    <header class="page-head">
      <div><h2>🏆 CSP-J/S 练习</h2><p>完成整套再统一判分，专心保持完整的答题节奏。</p></div>
      <div class="switch"><button :class="{ on: level === 'J' }" @click="switchLevel('J')">CSP-J</button><button :class="{ on: level === 'S' }" @click="switchLevel('S')">CSP-S</button></div>
    </header>

      <nav class="tabs"><button v-for="item in types" :key="item.id" :class="{ on:type===item.id }" @click="setType(item.id)">{{ item.label }}</button></nav>

      <section v-if="type === 'choice'">
        <YearTabs :items="level === 'S' ? sChoiceYears : choiceYears" :value="year" show-status @change="selectYear" />
        <div v-if="!paper.length" class="empty"><b>{{ year }} 年 CSP-{{ level }} 题面正在整理</b><span>当前年份暂未完成题面校对，先不展示不完整内容。</span></div>
        <template v-else>
          <header class="summary"><div><b>{{ year }} 年 CSP-{{ level }} 第一轮选择题</b><span>共 {{ paper.length }} 题；答案仅作学习参考</span></div><strong>{{ choiceSetSubmitted ? `${choiceScore}/${choiceTotal} 分` : `已答 ${answered}/${paper.length} 题` }}</strong></header>
          <article v-for="q in displayPaper" :key="q.id" class="card">
            <h3><i>{{ q.number }}</i><div class="choice-question" v-html="renderMd(q.question)"></div></h3>
            <div class="options"><button v-for="(text,key) in q.options" :key="key" :class="choiceClass(q,key)" :disabled="choiceSetSubmitted" @click="choiceAnswers[q.id]=key"><b>{{ key }}</b><span v-html="renderInline(text)"></span></button></div>
            <AnswerAnalysis v-if="choiceSetSubmitted" :correct="choiceAnswers[q.id]===q.answer" :answer="q.answer" :text="choiceExplanation(q)" />
          </article>
          <section class="set-submit">
            <div v-if="choiceSetSubmitted"><b>本套得分：{{ choiceScore }}/{{ choiceTotal }} 分</b><span>解析已在每道题下方展开。</span></div>
            <div v-else><b>已完成 {{ answered }}/{{ paper.length }} 题</b><span>全部作答后统一提交，提交前不会显示答案。</span></div>
            <button v-if="!choiceSetSubmitted" :disabled="answered !== paper.length" @click="submitChoiceSet">提交整套试卷</button>
            <button v-else class="secondary" @click="resetChoiceSet">重新作答</button>
          </section>
        </template>
      </section>

      <section v-else>
        <YearTabs :items="level === 'S' ? sProgramYears : programYears" :value="year" @change="selectYear" />
        <header class="problem-nav">
          <div><b>{{ year }} 年{{ typeLabel }}</b><span>共 {{ problems.length }} 道大题，每次练习一题</span></div>
          <div class="problem-buttons"><button v-for="(item,i) in problems" :key="item.id" :class="{ on:index===i }" @click="index=i">第 {{ item.number }} 题</button></div>
        </header>

        <article v-if="problem" class="original-problem">
          <header><div><span>{{ year }} 原卷</span><b>{{ problem.title }}</b></div></header>
          <div class="original-markdown" v-html="renderMd(problem.statement)"></div>

          <section class="answer-sheet">
            <h3>答题区</h3><p>完成当前大题的全部小题后统一提交，提交前不会显示答案和解析。</p>
            <article v-for="q in problem.questions" :key="q.id" class="sub-question">
              <h4>第 {{ q.number }} 小题　<span v-html="renderInline(q.text)"></span><em>{{ q.multiple ? '多选题' : `${q.score} 分` }}</em></h4>
              <div class="options">
                <button v-for="(text,key) in q.options" :key="key" :class="programClass(q,key)" :disabled="programSetSubmitted" @click="selectProgram(q,key)"><b>{{ key }}</b><span v-html="renderInline(text)"></span></button>
              </div>
              <AnswerAnalysis v-if="programSetSubmitted" :correct="isCorrect(q)" :answer="q.answers.join('、')" :text="q.explanation" />
            </article>
            <section class="set-submit compact-submit">
              <div v-if="programSetSubmitted"><b>本题得分：{{ programScore }}/{{ programTotal }} 分</b><span>所有小题解析已展开。</span></div>
              <div v-else><b>已完成 {{ programAnswered }}/{{ problem.questions.length }} 小题</b><span>多选题可点击多个选项，再统一提交。</span></div>
              <button v-if="!programSetSubmitted" :disabled="!programReady" @click="submitProgramSet">提交本题</button>
              <button v-else class="secondary" @click="resetProgramSet">重新作答</button>
            </section>
          </section>
          <footer><button @click="index--" :disabled="index===0">上一题</button><strong>第 {{ index+1 }}/{{ problems.length }} 题</strong><button @click="index++" :disabled="index===problems.length-1">下一题</button></footer>
        </article>
      </section>
  </main>
</template>

<script setup>
import { computed, defineComponent, h, ref } from 'vue';
import { marked } from 'marked';
import { cspChoicePapers, cspYearSources } from '../data/cspChoicePapers';
import { cspProgramProblems } from '../data/cspProgramProblems';
import { csp2025ChoicePapers, csp2025ProgramProblems, csp2025YearSource } from '../data/csp2025';
import { cspSChoicePapers, cspSProgramProblems, cspSYearSources } from '../data/cspS';

const YearTabs=defineComponent({props:{items:Array,value:String,showStatus:Boolean},emits:['change'],setup(props,{emit}){return()=>h('div',{class:'filters'},[h('b','选择年份'),...props.items.map(item=>h('button',{class:{on:props.value===item.year},onClick:()=>emit('change',item.year)},[item.year,props.showStatus&&item.status!=='已导入'?h('small','校对中'):null]))])}});
const AnswerAnalysis=defineComponent({props:{correct:Boolean,answer:String,text:String},setup(props){return()=>h('div',{class:'analysis'},[h('strong',{class:props.correct?'good':'bad'},props.correct?'回答正确':`回答错误，正确答案是 ${props.answer}`),h('div',{class:'explanation-text',innerHTML:'<b>题目解析：</b>'+renderMd(props.text||'')})])}});
const types=[{id:'choice',label:'选择题'},{id:'reading',label:'阅读程序题'},{id:'completion',label:'完善程序题'}];
const level=ref('J'),type=ref('choice'),year=ref('2025'),index=ref(0),choiceAnswers=ref({}),programAnswers=ref({}),submittedSets=ref({});
const allChoicePapers={...cspChoicePapers,...csp2025ChoicePapers},allYearSources={...cspYearSources,...csp2025YearSource},allProgramProblems=[...cspProgramProblems,...csp2025ProgramProblems],allSProgramProblems=cspSProgramProblems||[];
const choiceYears=computed(()=>Object.entries(allYearSources).map(([itemYear,source])=>({year:String(itemYear),...source})).sort((a,b)=>+b.year-+a.year));
const sChoiceYears=computed(()=>Object.entries(cspSYearSources).map(([itemYear,source])=>({year:String(itemYear),...source})).sort((a,b)=>+b.year-+a.year));
const programYears=computed(()=>[...new Set(allProgramProblems.map(x=>x.year))].sort((a,b)=>+b-+a).map(itemYear=>({year:itemYear,status:'已导入'})));
const sProgramYears=computed(()=>[...new Set(allSProgramProblems.map(x=>x.year))].sort((a,b)=>+b-+a).map(itemYear=>({year:itemYear,status:'已导入'})));
const paper=computed(()=>level.value==='S'?(cspSChoicePapers[year.value]||[]):(allChoicePapers[year.value]||[]));
const answered=computed(()=>paper.value.filter(q=>choiceAnswers.value[q.id]).length),choiceTotal=computed(()=>paper.value.length*2),choiceScore=computed(()=>paper.value.filter(q=>choiceAnswers.value[q.id]===q.answer).length*2);
const problems=computed(()=> (level.value==='S'?allSProgramProblems:allProgramProblems).filter(x=>x.type===type.value&&x.year===year.value).sort((a,b)=>a.number-b.number));
const corrected2023Reading1=`#include <iostream>
using namespace std;
unsigned short f(unsigned short x) {
    x ^= x << 6;
    x ^= x >> 8;
    return x;
}
int main() {
    unsigned short x;
    cin >> x;
    unsigned short y = f(x);
    cout << y << endl;
    return 0;
}`;
const corrected2023Reading2=`#include <iostream>
#include <cmath>
#include <vector>
#include <algorithm>
using namespace std;

long long solve1(int n) {
    vector<bool> p(n + 1, true);
    vector<long long> f(n + 1, 0), g(n + 1, 0);
    f[1] = 1;
    for (int i = 2; i * i <= n; i++) {
        if (p[i]) {
            vector<int> d;
            for (int k = i; k <= n; k *= i) d.push_back(k);
            reverse(d.begin(), d.end());
            for (int k : d) {
                for (int j = k; j <= n; j += k) {
                    if (p[j]) {
                        p[j] = false;
                        f[j] = i;
                        g[j] = k;
                    }
                }
            }
        }
    }
    for (int i = sqrt(n) + 1; i <= n; i++) {
        if (p[i]) {
            f[i] = i;
            g[i] = i;
        }
    }
    long long sum = 1;
    for (int i = 2; i <= n; i++) {
        f[i] = f[i / g[i]] * (g[i] * f[i] - 1) / (f[i] - 1);
        sum += f[i];
    }
    return sum;
}

long long solve2(int n) {
    long long sum = 0;
    for (int i = 1; i <= n; i++) sum += i * (n / i);
    return sum;
}

int main() {
    int n;
    cin >> n;
    cout << solve1(n) << endl;
    cout << solve2(n) << endl;
    return 0;
}`;
const cspSChoiceCorrections={
  '2023-2':{question:'0, 1, 2, 3, 4 中选取 4 个数字，能组成（ ）个不同四位数（注：最小的四位数是 1000，最大的四位数是 9999）。',options:{A:'96',B:'18',C:'120',D:'84'}},
  '2023-3':{question:'假设 n 是图的顶点的个数，m 是图的边的个数，为求解某一问题有下面四种不同时间复杂度的算法。对于 m=Θ(n) 的稀疏图而言，下面的四个选项，哪一项的渐近时间复杂度最小（ ）。',options:{A:'O(m√log n · log log n)',B:'O(n^2 + m)',C:'O(n^2 / log m + m log n)',D:'O(m + n log n)'}},
  '2023-4':{question:'假设有 n 根柱子，需要按照规则依次放置编号为 1, 2, 3, ⋯ 的圆环。每根柱子的底部固定、顶部可以放入圆环；放入时要保证相邻圆环的编号之和是完全平方数。请计算当有 4 根柱子时，最多可以放置（ ）个圆环。',options:{A:'7',B:'9',C:'11',D:'5'}},
  '2023-7':{question:'最长公共子序列长度常常用来衡量两个序列的相似度。给定序列 X={x₁,x₂,x₃,⋯,xₘ} 和 Y={y₁,y₂,y₃,⋯,yₙ}，再给定序列 Z={z₁,z₂,z₃,⋯,zₖ}。若 Z 同时是 X、Y 的子序列，且 k 最大，则称 Z 为最长公共子序列。序列 ABCAAAABA 和 ABABCBABA 的最长公共子序列长度为（ ）。',options:{A:'4',B:'5',C:'6',D:'7'}},
  '2023-8':{question:'一位玩家连续掷两次骰子。第一次掷出 x 点得到 2x 元；第二次掷出 y 点时，若 y=x 则失去这笔钱，否则保留。x、y∈{1,2,3,4,5,6}，每一点出现的概率相同。连续掷两次后，所有可能情形下收益的平均值是（ ）。',options:{A:'7 元',B:'35/6 元',C:'16/3 元',D:'19/3 元'}},
  '2023-10':{options:{A:'快速排序对于此类输入的表现最好，因为数组已经排序。',B:'快速排序对于此类输入的时间复杂度是 Θ(n log n)。',C:'快速排序对于此类输入的时间复杂度是 Θ(n²)。',D:'快速排序无法对此类数组进行排序，因为数组已经排序。'}},
  '2023-13':{question:'如图是一张包含 6 个顶点的有向图，但顶点间不存在拓扑序。如果删除其中一条边，使这 6 个顶点能进行拓扑排序，总共有多少条边可以作为候选边？（ ）',options:{A:'1',B:'2',C:'3',D:'4'}},
  '2023-14':{question:'若 n=∑ᵢ₌₀ᵏ16ⁱ·xᵢ，定义 f(n)=∑ᵢ₌₀ᵏxᵢ，其中 xᵢ∈{0,1,⋯,15}。对于给定的 n₀，反复令 nᵢ=f(nᵢ₋₁)，直到得到不动点。问在 100₁₆ 到 1A0₁₆ 中，不动点为 9 的自然数个数为（ ）。',options:{A:'10',B:'11',C:'12',D:'13'}},
  '2023-15':{question:'现在用如下代码来计算 xⁿ，其时间复杂度为（ ）。',options:{A:'O(n)',B:'O(1)',C:'O(log n)',D:'O(n log n)'}}
};
const cspS2024ChoiceCorrections={
  '2024-choice-1':{question:'在 Linux 系统中，如果你想显示当前工作目录的路径，应该使用哪个命令？（ ）',options:{A:'pwd',B:'cd',C:'ls',D:'echo'}},
  '2024-choice-2':{question:'假设一个长度为 n 的整数数组中每个元素值互不相同，且这个数组是无序的。要找到这个数组中最大元素的时间复杂度是多少？（ ）',options:{A:'O(n)',B:'O(log n)',C:'O(n log n)',D:'O(1)'}},
  '2024-choice-3':{question:'在 C++ 中，以下哪个函数调用会造成栈溢出？（ ）',options:{A:'int foo() { return 0; }',B:'int bar() { int x = 1; return x; }',C:'void baz() { int a[1000]; baz(); }',D:'void qux() { return; }'}},
  '2024-choice-4':{question:'在一场比赛中，有 10 名选手参加，前三名将获得金、银、铜牌。若不允许并列，且每名选手只能获得一枚奖牌，则不同的颁奖方式共有多少种？（ ）',options:{A:'120',B:'720',C:'504',D:'1000'}},
  '2024-choice-5':{question:'下面哪个数据结构最适合实现先进先出（FIFO）的功能？（ ）',options:{A:'栈',B:'队列',C:'线性表',D:'二叉搜索树'}},
  '2024-choice-6':{question:'已知 f(1)=1，且对于 n≥2 有 f(n)=f(n−1)+f(⌊n/2⌋)，则 f(4) 的值为：（ ）',options:{A:'4',B:'5',C:'6',D:'7'}},
  '2024-choice-7':{question:'假设有一个包含 n 个顶点的无向图，且该图是欧拉图。以下关于该图的描述中哪一项不一定正确？（ ）',options:{A:'所有顶点的度数均为偶数',B:'该图连通',C:'该图存在一个欧拉回路',D:'该图的边数是奇数'}},
  '2024-choice-8':{question:'对数组进行二分查找的过程中，以下哪个条件必须满足？（ ）',options:{A:'数组必须是有序的',B:'数组必须是无序的',C:'数组长度必须是 2 的幂',D:'数组中的元素必须是整数'}},
  '2024-choice-9':{question:'考虑一个自然数 n 以及一个模数 m，你需要计算 n 的逆元（即 n 在模 m 意义下的乘法逆元）。下列哪种算法最为适合？（ ）',options:{A:'使用暴力法依次尝试',B:'使用扩展欧几里得算法',C:'使用快速幂法',D:'使用线性筛法'}},
  '2024-choice-10':{question:'在设计一个哈希表时，为了减少冲突，需要使用适当的哈希函数和冲突解决策略。已知某哈希表中有 n 个键值对，表的装载因子为 α（0 < α ≤ 1）。在使用开放地址法解决冲突的过程中，最坏情况下查找一个元素的时间复杂度为（ ）？',options:{A:'O(1)',B:'O(log n)',C:'O(1 / (1 - α))',D:'O(n)'}},
  '2024-choice-11':{question:'假设有一棵 h 层的完全二叉树，该树最多包含多少个结点？（ ）',options:{A:'2^h - 1',B:'2^(h+1) - 1',C:'2^h',D:'2^(h+1)'}},
  '2024-choice-12':{question:'设有一个 10 个顶点的完全图，每两个顶点之间都有一条边。有多少个长度为 4 的环？（ ）',options:{A:'120',B:'210',C:'630',D:'5040'}},
  '2024-choice-13':{question:'对于一个整数 n，定义 f(n)为 n 的各位数字之和。问使 f(f(x))=10 的最小自然数 x 是多少？（ ）',options:{A:'29',B:'199',C:'299',D:'399'}},
  '2024-choice-14':{question:'设有一个长度为 n 的 01 字符串，其中有 k 个 1，每次操作可以交换相邻两个字符。在最坏情况下将这 k 个 1 移到字符串最右边所需要的交换次数是多少？（ ）',options:{A:'k',B:'k*(k-1)/2',C:'(n-k)*k',D:'(2n-k-1)*k/2'}},
  '2024-choice-15':{question:'如图是一张包含 7 个顶点的有向图。如果要删除其中一些边，使得从节点 1 到节点 7 没有可行路径，且删除的边数最少，请问总共有多少种可行的删除边的集合？（ ）',options:{A:'1',B:'2',C:'3',D:'4'}}
};
const cspS2025CompletionReplacements={
  '2025-completion-1':[
    ['pq.push({0, s, 0});', 'pq.push({0, s, ①});'],
    ['if (dist > d[u][used])', 'if (dist > ②)'],
    ['if (d[u][used] + w < d[v][used])', 'if (d[u][used] + w < ③)'],
    ['d[v][used] = d[u][used] + w;', '③ = d[u][used] + w;'],
    ['pq.push({d[v][used], v, used});', 'pq.push({③, v, used});'],
    ['if (d[u][used] < d[v][1])', 'if (d[u][used] < ④)'],
    ['d[v][1] = d[u][used];', '④ = d[u][used];'],
    ['pq.push({d[v][1], v, 1});', 'pq.push({④, v, 1});'],
    ['cout << min(d[t][0], d[t][1]) << endl;', 'cout << ⑤ << endl;']
  ],
  '2025-completion-2':[
    ['while (count_patterns(w, k) < n)', 'while (①)'],
    ['std::prev_permutation(bits.begin(), bits.end())', 'std::②'],
    ['if (code[j][i] == 1)', 'if (③)'],
    ['if (signature >> i & 1)', 'if (④)'],
    ['if (is_permutation(code[j].begin(), code[j].end(), sig_bits.begin()))', 'if (⑤)']
  ]
};
function applyCspS2025CompletionMarkers(value){
  const replacements=cspS2025CompletionReplacements[value.id];
  if(!replacements)return value;
  const statement=replacements.reduce((text,[from,to])=>text.replace(from,to),value.statement);
  return {...value,statement};
}
const displayPaper=computed(()=>paper.value.map(item=>{if(level.value!=='S')return item;const correction=(year.value==='2024'?cspS2024ChoiceCorrections:item.year==='2023'?cspSChoiceCorrections[`${year.value}-${item.number}`]:null);return correction?{...item,...correction}:item}));
const problem=computed(()=>{const value=problems.value[index.value];if(!value)return value;return level.value==='S'&&year.value==='2025'&&type.value==='completion'?applyCspS2025CompletionMarkers(value):value});
const typeLabel=computed(()=>type.value==='reading'?'阅读程序题':'完善程序题');
const choiceSetKey=computed(()=>`choice-${year.value}`),choiceSetSubmitted=computed(()=>Boolean(submittedSets.value[choiceSetKey.value]));
const programSetSubmitted=computed(()=>Boolean(problem.value&&submittedSets.value[problem.value.id]));
const programAnswered=computed(()=>problem.value?problem.value.questions.filter(q=>(programAnswers.value[q.id]||[]).length).length:0);
const programReady=computed(()=>Boolean(problem.value&&programAnswered.value===problem.value.questions.length));
const programTotal=computed(()=>problem.value?problem.value.questions.reduce((sum,q)=>sum+Number(q.score||0),0):0);
const programScore=computed(()=>problem.value?problem.value.questions.reduce((sum,q)=>sum+(isCorrect(q)?Number(q.score||0):0),0):0);
function switchLevel(value){level.value=value;type.value='choice';year.value=value==='S'?'2025':'2025';index.value=0;choiceAnswers.value={};programAnswers.value={};submittedSets.value={}}
function setType(value){type.value=value;year.value=level.value==='S'?(value==='choice'?'2025':'2025'):'2025';index.value=0} function selectYear(value){year.value=value;index.value=0}
function cleanText(value){return cleanMathText(stripPdfNoise(String(value||''))).trim()}
function stripPdfNoise(text){
  return String(text||'')
    .replace(/CCF\s+CSP-[JS]\s*\d{4}[^\n]*第\s*\d+\s*页[，,]\s*共\s*\d+\s*页/gi,'')
    .replace(/CCF\s+CSP-[JS]\s*\d{4}[^\n]*/gi,'')
    .replace(/第\s*\d+\s*页[，,]\s*共\s*\d+\s*页/g,'')
}
function cleanMathText(value){
  let text=String(value||'')
    .replace(/\\texttt\s*\{([^{}]*)\}/g,'`$1`')
    .replace(/\\text\s*\{([^{}]*)\}/g,'$1')
    .replace(/\\mathrm\s*\{([^{}]*)\}/g,'$1')
    .replace(/\\leqslant/g,'≤').replace(/\\geqslant/g,'≥')
    .replace(/\\leq/g,'≤').replace(/\\geq/g,'≥')
    .replace(/\\times/g,'×').replace(/\\cdot/g,'·').replace(/\\sum/g,'∑')
    .replace(/\\in/g,'∈').replace(/\\cdots/g,'⋯').replace(/\\dots/g,'…')
    .replace(/\\sim/g,'∼').replace(/\\to/g,'→').replace(/\\rightarrow/g,'→').replace(/⁡/g,'')
    .replace(/\\\{/g,'{').replace(/\\\}/g,'}')
  const code=[]
  text=text.replace(/`([^`\n]*)`/g,(_,content)=>{const token=`@@CSPCODE${code.length}@@`;code.push(content);return token})
  text=normalizeExtractedText(text).replace(/\$/g,'').replace(/（\s*[)）]/g,'（ ）').replace(/\(\s*[)）]/g,'（ ）')
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g,'<span class="math-fraction"><span>$1</span><span>$2</span></span>')
    .replace(/\\sqrt\s*\{([^{}]+)\}/g,'<span class="math-radical">√<span>$1</span></span>')
    .replace(/\\sqrt\s+([A-Za-z0-9]+)/g,'<span class="math-radical">√<span>$1</span></span>')
    .replace(/\\log/g,'log').replace(/\\Theta/g,'Θ').replace(/\\alpha/g,'α').replace(/\\left\\lfloor/g,'⌊').replace(/\\lfloor/g,'⌊').replace(/\\left\\rfloor/g,'⌋').replace(/\\rfloor/g,'⌋').replace(/\\cdot/g,'·').replace(/\\times/g,'×').replace(/\\neq/g,'≠')
    .replace(/([A-Za-z0-9)\]])_\{([^{}]+)\}/g,'$1<sub>$2</sub>')
    .replace(/([0-9A-Z])_([0-9]+)/g,'$1<sub>$2</sub>')
    .replace(/([A-Za-z0-9)\]])\^\{([^{}]+)\}/g,'$1<sup>$2</sup>')
    .replace(/([A-Za-z0-9)\]])\^\(([^()]+)\)/g,'$1<sup>$2</sup>')
    .replace(/([A-Za-z0-9)\]])\^([A-Za-z0-9]+)/g,'$1<sup>$2</sup>')
  return text.replace(/@@CSPCODE(\d+)@@/g,(_,index)=>`\`${code[Number(index)]}\``)
}
function normalizeRepeatedExtractedUnit(value){
  const text=String(value||'');
  if(text.length%3===0){const unit=text.slice(0,text.length/3);if(unit.repeat(3)===text)return unit}
  return text
}
function collapseRepeatedChunkRuns(text){
  return text;
}
function normalizeDelimitedRun(value,delimiter=','){
  const parts=String(value||'').split(delimiter).map(item=>item.trim());
  for(let size=1;size<=Math.floor(parts.length/3);size++){
    if(parts.length%size===0){
      const unit=parts.slice(0,size);
      if(unit.join(delimiter).repeat(parts.length/size)===parts.join(delimiter))return unit.join(', ')
    }
  }
  return value
}
function normalizeExtractedText(value){
  let text=String(value||'');
  text=text.replace(/(?:\d+\s*,\s*){4,}\d+/g,token=>normalizeDelimitedRun(token));
  text=collapseRepeatedChunkRuns(text);
  text=text.replace(/\b([A-Za-z]\([^()\n]{1,16}\))\1{2,}\b/g,'$1');
  text=text.replace(/\bf\(f\(x\)\)=10f\(f\(x\)\)=10f\(f\(x\)\)=10/g,'f(f(x))=10');
  text=text.replace(/\\d?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g,'<span class="math-fraction"><span>$1</span><span>$2</span></span>');
  const complexityRepeat=/(?:O|Θ|\\Theta)\([^()\n]*\)(?:\s*)(?:O|Θ|\\Theta)\([^()\n]*\)(?:\s*)(?:O|Θ|\\Theta)\([^()\n]*\)/g;
  text=text.replace(complexityRepeat,token=>{
    const parts=token.match(/(?:O|Θ|\\Theta)\([^()\n]*\)/g)||[];
    return parts.sort((x,y)=>(y.includes('\\')?1:0)-(x.includes('\\')?1:0)||y.length-x.length)[0]||token;
  });
  text=text.replace(/([A-Za-z]\s*=\s*(?:Θ|\\Theta)\([^()\n]*\))(?:\s*)\1(?:\s*)\1/g,'$1');
  return text;
}
function cleanPlainText(value){return cleanMathText(value).replace(/<\/?(?:sub|sup)>/g,'')}
function cleanMarkdown(value){return String(value||'').split('```').map((part,i)=>i%2?part:cleanMathText(part)).join('```')}
function renderMd(value){return marked.parse(cleanMarkdown(value))} function renderInline(value){return marked.parseInline(cleanMathText(value))}
function choiceClass(q,key){const answer=choiceAnswers.value[q.id];if(!choiceSetSubmitted.value)return{selected:answer===key};return{correct:key===q.answer,wrong:answer===key&&key!==q.answer}}
function choiceExplanation(q){if(q.explanation&&q.explanation.length>50)return q.explanation;return `参考答案为 ${q.answer}（${cleanPlainText(q.options[q.answer])}）。请按题干的定义、计算顺序或程序执行过程逐项核对。`}
function selectProgram(q,key){const current=programAnswers.value[q.id]||[];if(q.multiple)programAnswers.value[q.id]=current.includes(key)?current.filter(x=>x!==key):[...current,key];else programAnswers.value[q.id]=[key]}
function isCorrect(q){return [...(programAnswers.value[q.id]||[])].sort().join('')===[...q.answers].sort().join('')}
function programClass(q,key){const picked=(programAnswers.value[q.id]||[]).includes(key);if(!programSetSubmitted.value)return{selected:picked};return{correct:q.answers.includes(key),wrong:picked&&!q.answers.includes(key)}}
function submitChoiceSet(){if(answered.value===paper.value.length)submittedSets.value={...submittedSets.value,[choiceSetKey.value]:true}}
function submitProgramSet(){if(programReady.value)submittedSets.value={...submittedSets.value,[problem.value.id]:true}}
function resetChoiceSet(){const next={...choiceAnswers.value};paper.value.forEach(q=>delete next[q.id]);choiceAnswers.value=next;submittedSets.value={...submittedSets.value,[choiceSetKey.value]:false}}
function resetProgramSet(){const next={...programAnswers.value};problem.value.questions.forEach(q=>delete next[q.id]);programAnswers.value=next;submittedSets.value={...submittedSets.value,[problem.value.id]:false}}
</script>

<style scoped>
.csp-page{height:100%;overflow-y:auto;padding:24px 28px 60px;background:#f7f9fc;color:#172033}.page-head,.summary,.original-problem>header,.original-problem>footer,.problem-nav{display:flex;align-items:center;justify-content:space-between;gap:18px}.page-head h2{margin:0 0 6px;color:#4f46e5;font-size:26px}.page-head p{margin:0;color:#64748b}.switch,.tabs,.filters,.problem-buttons{display:flex;gap:7px;flex-wrap:wrap}.switch button,.filters button,.problem-buttons button{border:1px solid #cbd5e1;background:#fff;color:#475569;padding:9px 15px;border-radius:6px;cursor:pointer}.switch .on,.filters .on,.problem-buttons .on{background:#4f46e5;border-color:#4f46e5;color:#fff}.tabs{margin:24px 0 18px;border-bottom:1px solid #dbe2ea}.tabs button{border:0;border-bottom:3px solid transparent;background:transparent;padding:12px 22px;font-size:16px;font-weight:700;color:#64748b;cursor:pointer}.tabs .on{color:#4f46e5;border-bottom-color:#4f46e5}.filters{align-items:center;margin-bottom:16px}.filters b{margin-right:8px}.filters small{display:block;font-size:10px}.summary{padding:18px 20px;margin:18px 0;background:#172033;color:#fff;border-radius:8px}.summary div,.problem-nav>div:first-child{display:grid;gap:4px}.summary span{color:#cbd5e1}.summary a,.original-problem a{color:#2563eb}.summary strong{color:#fbbf24}.card,.original-problem,.empty{border:1px solid #dbe2ea;background:#fff;border-radius:8px;padding:22px;margin-top:16px}.card h3{display:flex;gap:12px;margin:0 0 18px;font-size:17px;line-height:1.7}.card h3 i{flex:0 0 30px;height:30px;display:grid;place-items:center;background:#eef2ff;color:#4f46e5;border-radius:50%;font-style:normal}.options{display:grid;grid-template-columns:1fr 1fr;gap:10px}.options button{min-height:52px;display:flex;align-items:center;gap:12px;text-align:left;border:1px solid #cbd5e1;border-radius:6px;background:#fff;padding:12px 14px;cursor:pointer;color:#334155}.options button:hover:not(:disabled),.options .selected{border-color:#6366f1;background:#eef2ff}.options button b{color:#4f46e5}.options .correct{background:#22c55e;border-color:#16a34a;color:#fff}.options .wrong{background:#ef5b5b;border-color:#dc2626;color:#fff}.options .correct b,.options .wrong b{color:#fff}.analysis{margin-top:15px;border-left:4px solid #6366f1;background:#f8fafc;padding:14px 16px}.analysis p{margin:8px 0 0;line-height:1.7}.analysis .explanation-text{margin-top:8px;line-height:1.7}.analysis .explanation-text p{margin:6px 0}.analysis .explanation-text strong{color:#4f46e5}.analysis .explanation-text code{background:#e2e8f0;padding:2px 5px;border-radius:3px;font-size:14px}.good{color:#15803d}.bad{color:#dc2626}.empty{min-height:180px;display:grid;place-content:center;justify-items:center;gap:12px;color:#64748b}.empty b{color:#334155;font-size:19px}.problem-nav{margin:12px 0 18px;padding:15px 18px;background:#eef2ff;border-radius:8px}.problem-nav span{color:#64748b}.problem-buttons button{padding:7px 12px}.original-problem>header{padding-bottom:16px;border-bottom:1px solid #e2e8f0}.original-problem>header span{padding:5px 9px;margin-right:10px;background:#eef2ff;color:#4338ca;border-radius:4px}.original-markdown{padding:14px 4px;font-size:16px;line-height:1.75}.original-markdown :deep(pre){background:#0d1117;border-radius:6px;overflow:auto;padding:20px}.original-markdown :deep(code){font-size:15px;line-height:1.65}.original-markdown :deep(code .ln){color:#6366f1;font-weight:700}.original-markdown :deep(h3){margin-top:24px;color:#334155}.answer-sheet{margin-top:26px;padding:22px;border-top:3px solid #4f46e5;background:#f8fafc}.answer-sheet>h3{margin:0;color:#4f46e5}.answer-sheet>p{color:#64748b}.sub-question{padding:18px 0;border-top:1px solid #dbe2ea}.sub-question h4{line-height:1.65}.sub-question h4 em{margin-left:8px;padding:3px 7px;background:#e0e7ff;color:#4338ca;border-radius:4px;font-size:12px;font-style:normal}.submit-answer{margin-top:12px;border:0;border-radius:6px;padding:9px 18px;background:#4f46e5;color:#fff}.submit-answer:disabled{background:#cbd5e1}.original-problem>footer{margin-top:20px;padding-top:18px;border-top:1px solid #e2e8f0}.original-problem>footer button{border:0;border-radius:6px;padding:10px 22px;background:#4f46e5;color:#fff}.original-problem>footer button:disabled{background:#cbd5e1}@media(max-width:760px){.csp-page{padding:18px 14px}.page-head,.summary,.problem-nav{align-items:flex-start;flex-direction:column}.options{grid-template-columns:1fr}.answer-sheet{padding:16px}}

/* YearTabs is a child component, so its controls need an explicit scoped-style bridge. */
.csp-page :deep(.filters){display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:18px;padding:12px 14px;background:#fff;border:1px solid #dbe2ea;border-radius:8px}
.csp-page :deep(.filters b){margin-right:4px;color:#334155;font-size:16px}
.csp-page :deep(.filters button){min-width:68px;border:1px solid #cbd5e1;background:#fff;color:#475569;padding:8px 14px;border-radius:6px;font-weight:700;line-height:1.2;cursor:pointer;transition:background .15s,border-color .15s,color .15s,transform .15s}
.csp-page :deep(.filters button:hover){border-color:#6366f1;color:#4f46e5;transform:translateY(-1px)}
.csp-page :deep(.filters button.on){border-color:#4f46e5;background:#4f46e5;color:#fff;box-shadow:0 3px 8px rgba(79,70,229,.2)}
.csp-page :deep(.filters button small){display:block;margin-top:3px;font-size:10px;font-weight:500;opacity:.8}
.choice-question{min-width:0;flex:1}.choice-question :deep(p){margin:0 0 8px}.choice-question :deep(pre){margin:10px 0 0;padding:14px 16px;border-radius:6px;background:#0d1117;overflow:auto}.choice-question :deep(code){font-size:14px;line-height:1.55}
.choice-question :deep(sub),.choice-question :deep(sup),.options :deep(sub),.options :deep(sup),.sub-question :deep(sub),.sub-question :deep(sup){font-size:.72em;line-height:0;position:relative;vertical-align:baseline}.choice-question :deep(sub),.options :deep(sub),.sub-question :deep(sub){bottom:-.25em}.choice-question :deep(sup),.options :deep(sup),.sub-question :deep(sup){top:-.45em}
.choice-question :deep(.math-fraction),.options :deep(.math-fraction),.sub-question :deep(.math-fraction){display:inline-flex;flex-direction:column;vertical-align:middle;line-height:1.05;text-align:center;margin:0 .12em}.choice-question :deep(.math-fraction)>span:first-child,.options :deep(.math-fraction)>span:first-child,.sub-question :deep(.math-fraction)>span:first-child{border-bottom:1px solid currentColor;padding:0 .18em}.choice-question :deep(.math-fraction)>span:last-child,.options :deep(.math-fraction)>span:last-child,.sub-question :deep(.math-fraction)>span:last-child{padding:0 .18em}.choice-question :deep(.math-radical),.options :deep(.math-radical),.sub-question :deep(.math-radical){display:inline-flex;align-items:flex-start;vertical-align:middle}.choice-question :deep(.math-radical)>span,.options :deep(.math-radical)>span,.sub-question :deep(.math-radical)>span{border-top:1px solid currentColor;padding:0 .12em}
.set-submit{position:static;display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:28px;padding:16px 20px;border:1px solid #c7d2fe;border-radius:8px;background:#fff;box-shadow:0 5px 18px rgba(15,23,42,.08)}
.set-submit>div{display:grid;gap:4px}.set-submit>div b{color:#312e81;font-size:18px}.set-submit>div span{color:#64748b}.set-submit button{border:0;border-radius:6px;padding:11px 22px;background:#4f46e5;color:#fff;font-weight:700;cursor:pointer}.set-submit button:disabled{background:#cbd5e1;cursor:not-allowed}.set-submit button.secondary{background:#fff;color:#4f46e5;border:1px solid #6366f1}.compact-submit{position:static;margin-top:18px;box-shadow:none;background:#eef2ff}
@media(max-width:760px){.set-submit{align-items:stretch;flex-direction:column}.set-submit button{width:100%}}
</style>
