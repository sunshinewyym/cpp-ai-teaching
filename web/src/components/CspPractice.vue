<template>
  <main class="csp-page">
    <header class="page-head">
      <div><h2>🏆 CSP-J/S 练习</h2><p>完成整套再统一判分，专心保持完整的答题节奏。</p></div>
      <div class="switch"><button :class="{ on: level === 'J' }" @click="level='J'">CSP-J</button><button :class="{ on: level === 'S' }" @click="level='S'">CSP-S</button></div>
    </header>

    <div v-if="level === 'S'" class="empty"><b>CSP-S 题库正在校对中</b><span>当前已完整整理 CSP-J 2019-2024 第一轮原卷。</span></div>
    <template v-else>
      <nav class="tabs"><button v-for="item in types" :key="item.id" :class="{ on:type===item.id }" @click="setType(item.id)">{{ item.label }}</button></nav>

      <section v-if="type === 'choice'">
        <YearTabs :items="choiceYears" :value="year" show-status @change="selectYear" />
        <div v-if="!paper.length" class="empty"><b>{{ year }} 年选择题扫描原卷正在校对</b><span>题面未确认前不展示，避免将 OCR 错误交给学生。</span></div>
        <template v-else>
          <header class="summary"><div><b>{{ year }} 年 CSP-J 第一轮选择题</b><span>共 {{ paper.length }} 题</span></div><strong>{{ choiceSetSubmitted ? `${choiceScore}/${choiceTotal} 分` : `已答 ${answered}/${paper.length} 题` }}</strong></header>
          <article v-for="q in paper" :key="q.id" class="card">
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
        <YearTabs :items="programYears" :value="year" @change="selectYear" />
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
    </template>
  </main>
</template>

<script setup>
import { computed, defineComponent, h, ref } from 'vue';
import { marked } from 'marked';
import { cspChoicePapers, cspYearSources } from '../data/cspChoicePapers';
import { cspProgramProblems } from '../data/cspProgramProblems';
import { csp2025ChoicePapers, csp2025ProgramProblems, csp2025YearSource } from '../data/csp2025';

const YearTabs=defineComponent({props:{items:Array,value:String,showStatus:Boolean},emits:['change'],setup(props,{emit}){return()=>h('div',{class:'filters'},[h('b','选择年份'),...props.items.map(item=>h('button',{class:{on:props.value===item.year},onClick:()=>emit('change',item.year)},[item.year,props.showStatus&&item.status!=='已导入'?h('small','校对中'):null]))])}});
const AnswerAnalysis=defineComponent({props:{correct:Boolean,answer:String,text:String},setup(props){return()=>h('div',{class:'analysis'},[h('strong',{class:props.correct?'good':'bad'},props.correct?'回答正确':`回答错误，正确答案是 ${props.answer}`),h('p',[h('b','题目解析：'),props.text])])}});
const types=[{id:'choice',label:'选择题'},{id:'reading',label:'阅读程序题'},{id:'completion',label:'完善程序题'}];
const level=ref('J'),type=ref('choice'),year=ref('2025'),index=ref(0),choiceAnswers=ref({}),programAnswers=ref({}),submittedSets=ref({});
const allChoicePapers={...cspChoicePapers,...csp2025ChoicePapers},allYearSources={...cspYearSources,...csp2025YearSource},allProgramProblems=[...cspProgramProblems,...csp2025ProgramProblems];
const choiceYears=computed(()=>Object.entries(allYearSources).map(([itemYear,source])=>({year:String(itemYear),...source})).sort((a,b)=>+b.year-+a.year));
const programYears=computed(()=>[...new Set(allProgramProblems.map(x=>x.year))].sort((a,b)=>+b-+a).map(itemYear=>({year:itemYear,status:'已导入'})));
const paper=computed(()=>allChoicePapers[year.value]||[]);
const answered=computed(()=>paper.value.filter(q=>choiceAnswers.value[q.id]).length),choiceTotal=computed(()=>paper.value.length*2),choiceScore=computed(()=>paper.value.filter(q=>choiceAnswers.value[q.id]===q.answer).length*2);
const problems=computed(()=>allProgramProblems.filter(x=>x.type===type.value&&x.year===year.value).sort((a,b)=>a.number-b.number)),problem=computed(()=>problems.value[index.value]);
const typeLabel=computed(()=>type.value==='reading'?'阅读程序题':'完善程序题');
const choiceSetKey=computed(()=>`choice-${year.value}`),choiceSetSubmitted=computed(()=>Boolean(submittedSets.value[choiceSetKey.value]));
const programSetSubmitted=computed(()=>Boolean(problem.value&&submittedSets.value[problem.value.id]));
const programAnswered=computed(()=>problem.value?problem.value.questions.filter(q=>(programAnswers.value[q.id]||[]).length).length:0);
const programReady=computed(()=>Boolean(problem.value&&programAnswered.value===problem.value.questions.length));
const programTotal=computed(()=>problem.value?problem.value.questions.reduce((sum,q)=>sum+Number(q.score||0),0):0);
const programScore=computed(()=>problem.value?problem.value.questions.reduce((sum,q)=>sum+(isCorrect(q)?Number(q.score||0):0),0):0);
function setType(value){type.value=value;year.value='2025';index.value=0} function selectYear(value){year.value=value;index.value=0}
function cleanText(value){return cleanMathText(String(value||'').replace(/CCF\s+CSP-J\s+\d{4}\s+第一轮\s+C\+\+语言试题\s+第\s*\d+页[，,]\s*共\s*\d+页/g,'')).trim()}
function cleanMathText(value){return String(value||'').replace(/\\texttt\s*\{([^{}]*)\}/g,'`$1`').replace(/\\mathrm\s*\{([^{}]*)\}/g,'$1').replace(/\\leq/g,'≤').replace(/\\geq/g,'≥').replace(/\\times/g,'×').replace(/\\dots/g,'…').replace(/\\\{/g,'{').replace(/\\\}/g,'}').replace(/\$/g,'').replace(/（\s*[)）]/g,'（ ）').replace(/\(\s*[)）]/g,'（ ）')}
function cleanMarkdown(value){return String(value||'').split('```').map((part,i)=>i%2?part:cleanMathText(part)).join('```')}
function renderMd(value){return marked.parse(cleanMarkdown(value))} function renderInline(value){return marked.parseInline(cleanMathText(value))}
function choiceClass(q,key){const answer=choiceAnswers.value[q.id];if(!choiceSetSubmitted.value)return{selected:answer===key};return{correct:key===q.answer,wrong:answer===key&&key!==q.answer}}
function choiceExplanation(q){return `参考答案为 ${q.answer}（${cleanText(q.options[q.answer])}）。请按题干的定义、计算顺序或程序执行过程逐项核对。`}
function selectProgram(q,key){const current=programAnswers.value[q.id]||[];if(q.multiple)programAnswers.value[q.id]=current.includes(key)?current.filter(x=>x!==key):[...current,key];else programAnswers.value[q.id]=[key]}
function isCorrect(q){return [...(programAnswers.value[q.id]||[])].sort().join('')===[...q.answers].sort().join('')}
function programClass(q,key){const picked=(programAnswers.value[q.id]||[]).includes(key);if(!programSetSubmitted.value)return{selected:picked};return{correct:q.answers.includes(key),wrong:picked&&!q.answers.includes(key)}}
function submitChoiceSet(){if(answered.value===paper.value.length)submittedSets.value={...submittedSets.value,[choiceSetKey.value]:true}}
function submitProgramSet(){if(programReady.value)submittedSets.value={...submittedSets.value,[problem.value.id]:true}}
function resetChoiceSet(){const next={...choiceAnswers.value};paper.value.forEach(q=>delete next[q.id]);choiceAnswers.value=next;submittedSets.value={...submittedSets.value,[choiceSetKey.value]:false}}
function resetProgramSet(){const next={...programAnswers.value};problem.value.questions.forEach(q=>delete next[q.id]);programAnswers.value=next;submittedSets.value={...submittedSets.value,[problem.value.id]:false}}
</script>

<style scoped>
.csp-page{height:100%;overflow-y:auto;padding:24px 28px 60px;background:#f7f9fc;color:#172033}.page-head,.summary,.original-problem>header,.original-problem>footer,.problem-nav{display:flex;align-items:center;justify-content:space-between;gap:18px}.page-head h2{margin:0 0 6px;color:#4f46e5;font-size:26px}.page-head p{margin:0;color:#64748b}.switch,.tabs,.filters,.problem-buttons{display:flex;gap:7px;flex-wrap:wrap}.switch button,.filters button,.problem-buttons button{border:1px solid #cbd5e1;background:#fff;color:#475569;padding:9px 15px;border-radius:6px;cursor:pointer}.switch .on,.filters .on,.problem-buttons .on{background:#4f46e5;border-color:#4f46e5;color:#fff}.tabs{margin:24px 0 18px;border-bottom:1px solid #dbe2ea}.tabs button{border:0;border-bottom:3px solid transparent;background:transparent;padding:12px 22px;font-size:16px;font-weight:700;color:#64748b;cursor:pointer}.tabs .on{color:#4f46e5;border-bottom-color:#4f46e5}.filters{align-items:center;margin-bottom:16px}.filters b{margin-right:8px}.filters small{display:block;font-size:10px}.summary{padding:18px 20px;margin:18px 0;background:#172033;color:#fff;border-radius:8px}.summary div,.problem-nav>div:first-child{display:grid;gap:4px}.summary span{color:#cbd5e1}.summary a,.original-problem a{color:#2563eb}.summary strong{color:#fbbf24}.card,.original-problem,.empty{border:1px solid #dbe2ea;background:#fff;border-radius:8px;padding:22px;margin-top:16px}.card h3{display:flex;gap:12px;margin:0 0 18px;font-size:17px;line-height:1.7}.card h3 i{flex:0 0 30px;height:30px;display:grid;place-items:center;background:#eef2ff;color:#4f46e5;border-radius:50%;font-style:normal}.options{display:grid;grid-template-columns:1fr 1fr;gap:10px}.options button{min-height:52px;display:flex;align-items:center;gap:12px;text-align:left;border:1px solid #cbd5e1;border-radius:6px;background:#fff;padding:12px 14px;cursor:pointer;color:#334155}.options button:hover:not(:disabled),.options .selected{border-color:#6366f1;background:#eef2ff}.options button b{color:#4f46e5}.options .correct{background:#22c55e;border-color:#16a34a;color:#fff}.options .wrong{background:#ef5b5b;border-color:#dc2626;color:#fff}.options .correct b,.options .wrong b{color:#fff}.analysis{margin-top:15px;border-left:4px solid #6366f1;background:#f8fafc;padding:14px 16px}.analysis p{margin:8px 0 0;line-height:1.7}.good{color:#15803d}.bad{color:#dc2626}.empty{min-height:180px;display:grid;place-content:center;justify-items:center;gap:12px;color:#64748b}.empty b{color:#334155;font-size:19px}.problem-nav{margin:12px 0 18px;padding:15px 18px;background:#eef2ff;border-radius:8px}.problem-nav span{color:#64748b}.problem-buttons button{padding:7px 12px}.original-problem>header{padding-bottom:16px;border-bottom:1px solid #e2e8f0}.original-problem>header span{padding:5px 9px;margin-right:10px;background:#eef2ff;color:#4338ca;border-radius:4px}.original-markdown{padding:14px 4px;font-size:16px;line-height:1.75}.original-markdown :deep(pre){background:#0d1117;border-radius:6px;overflow:auto;padding:20px}.original-markdown :deep(code){font-size:15px;line-height:1.65}.original-markdown :deep(h3){margin-top:24px;color:#334155}.answer-sheet{margin-top:26px;padding:22px;border-top:3px solid #4f46e5;background:#f8fafc}.answer-sheet>h3{margin:0;color:#4f46e5}.answer-sheet>p{color:#64748b}.sub-question{padding:18px 0;border-top:1px solid #dbe2ea}.sub-question h4{line-height:1.65}.sub-question h4 em{margin-left:8px;padding:3px 7px;background:#e0e7ff;color:#4338ca;border-radius:4px;font-size:12px;font-style:normal}.submit-answer{margin-top:12px;border:0;border-radius:6px;padding:9px 18px;background:#4f46e5;color:#fff}.submit-answer:disabled{background:#cbd5e1}.original-problem>footer{margin-top:20px;padding-top:18px;border-top:1px solid #e2e8f0}.original-problem>footer button{border:0;border-radius:6px;padding:10px 22px;background:#4f46e5;color:#fff}.original-problem>footer button:disabled{background:#cbd5e1}@media(max-width:760px){.csp-page{padding:18px 14px}.page-head,.summary,.problem-nav{align-items:flex-start;flex-direction:column}.options{grid-template-columns:1fr}.answer-sheet{padding:16px}}

/* YearTabs is a child component, so its controls need an explicit scoped-style bridge. */
.csp-page :deep(.filters){display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:18px;padding:12px 14px;background:#fff;border:1px solid #dbe2ea;border-radius:8px}
.csp-page :deep(.filters b){margin-right:4px;color:#334155;font-size:16px}
.csp-page :deep(.filters button){min-width:68px;border:1px solid #cbd5e1;background:#fff;color:#475569;padding:8px 14px;border-radius:6px;font-weight:700;line-height:1.2;cursor:pointer;transition:background .15s,border-color .15s,color .15s,transform .15s}
.csp-page :deep(.filters button:hover){border-color:#6366f1;color:#4f46e5;transform:translateY(-1px)}
.csp-page :deep(.filters button.on){border-color:#4f46e5;background:#4f46e5;color:#fff;box-shadow:0 3px 8px rgba(79,70,229,.2)}
.csp-page :deep(.filters button small){display:block;margin-top:3px;font-size:10px;font-weight:500;opacity:.8}
.choice-question{min-width:0;flex:1}.choice-question :deep(p){margin:0 0 8px}.choice-question :deep(pre){margin:10px 0 0;padding:14px 16px;border-radius:6px;background:#0d1117;overflow:auto}.choice-question :deep(code){font-size:14px;line-height:1.55}
.set-submit{position:static;display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:28px;padding:16px 20px;border:1px solid #c7d2fe;border-radius:8px;background:#fff;box-shadow:0 5px 18px rgba(15,23,42,.08)}
.set-submit>div{display:grid;gap:4px}.set-submit>div b{color:#312e81;font-size:18px}.set-submit>div span{color:#64748b}.set-submit button{border:0;border-radius:6px;padding:11px 22px;background:#4f46e5;color:#fff;font-weight:700;cursor:pointer}.set-submit button:disabled{background:#cbd5e1;cursor:not-allowed}.set-submit button.secondary{background:#fff;color:#4f46e5;border:1px solid #6366f1}.compact-submit{position:static;margin-top:18px;box-shadow:none;background:#eef2ff}
@media(max-width:760px){.set-submit{align-items:stretch;flex-direction:column}.set-submit button{width:100%}}
</style>
