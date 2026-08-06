import assert from 'node:assert/strict';
import templateModule from '../../server/training/trainingCourseTemplate.js';
import progressModule from '../../server/training/trainingCourseProgressTemplate.js';
import { cspChoicePapers } from '../src/data/cspChoicePapers.js';
import { cspProgramProblems } from '../src/data/cspProgramProblems.js';
import { csp2025ChoicePapers, csp2025ProgramProblems } from '../src/data/csp2025.js';
import { listGespQuestions } from '../src/data/gespPapers.js';
import { cspSTrainingChoices, cspSTrainingPrograms } from '../src/data/trainingCspS.js';
import { problemIndex } from '../src/data/problemIndex.js';
import { renderCspInline } from '../src/utils/cspMarkdown.js';
import { buildLiveQuestionStats } from '../src/utils/trainingReview.js';

const { trainingCourseTemplate } = templateModule;
const { trainingCourseProgressTemplate } = progressModule;
const choiceIds = new Set([
  ...Object.values({ ...cspChoicePapers, ...csp2025ChoicePapers }).flat().map(item => item.id),
  ...listGespQuestions().filter(item => ['choice', 'judgment'].includes(item.source?.questionType)).map(item => item.id),
  ...cspSTrainingChoices.map(item => item.id),
]);
const programIds = new Set([
  ...cspProgramProblems,
  ...csp2025ProgramProblems,
  ...cspSTrainingPrograms,
].map(item => item.id));
const ojIds = new Set(problemIndex.flatMap(category => category.topics
  .flatMap(topic => topic.levels.flatMap(level => level.ids))).map(id => `P${id}`));

function verifyTemplate(template, label) {
  assert.equal(template.days.length, 10, `${label} must have 10 days`);
  assert.equal(new Set(template.days.map(item => item.day)).size, 10, `${label} day numbers must be unique`);

  for (const day of template.days) {
    assert.match(day.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(day.morning.theme && day.afternoon.theme);
    assert.ok(day.morning.practice && day.afternoon.practice, `${label} day ${day.day} needs morning/afternoon practice`);
    for (const id of day.questions.choice) assert.ok(choiceIds.has(id), `missing choice question: ${id}`);
    for (const type of ['reading', 'completion']) {
      for (const id of day.questions[type]) assert.ok(programIds.has(id), `missing program question: ${id}`);
    }
    for (const level of ['basic', 'advanced']) {
      assert.ok(day.programming[level].length > 0);
      for (const id of day.programming[level]) {
        assert.match(id, /^P\d{4,6}$/);
        assert.ok(ojIds.has(id), `missing OJ index problem: ${id}`);
      }
    }
    for (const level of ['luoguBasic', 'luoguPopular', 'luoguAdvanced', 'csp']) {
      for (const id of day.programming[level] || []) assert.match(id, /^P\d{4,6}$/);
    }
  }
}

verifyTemplate(trainingCourseTemplate, 'advanced');
verifyTemplate(trainingCourseProgressTemplate, 'progress');

const advancedDay4 = trainingCourseTemplate.days.find(item => item.day === 4);
const advancedDay5 = trainingCourseTemplate.days.find(item => item.day === 5);
const advancedDay6 = trainingCourseTemplate.days.find(item => item.day === 6);
const advancedDay7 = trainingCourseTemplate.days.find(item => item.day === 7);
const advancedDay8 = trainingCourseTemplate.days.find(item => item.day === 8);
assert.match(advancedDay4.afternoon.theme, /前缀和.*贪心/);
assert.ok(advancedDay4.questions.choice.includes('2019-choice-11'));
assert.match(advancedDay5.morning.theme, /DFS.*回溯.*BFS/);
assert.match(advancedDay5.afternoon.theme, /回溯.*BFS/);
assert.match(advancedDay5.morning.knowledge, /加法原理.*乘法原理.*排列数.*组合数/);
const combinatoricsChoiceIds2019To2025 = [
  '2019-choice-7', '2019-choice-12', '2019-choice-13',
  '2020-choice-10', '2020-choice-14', '2020-choice-15',
  '2021-choice-10', '2021-choice-12', '2022-choice-14',
  '2023-choice-6', '2023-choice-14', '2024-choice-3', '2024-choice-14',
  '2025-choice-6', '2025-choice-11',
  'csp-s-2019-choice-6', 'csp-s-2019-choice-8', 'csp-s-2019-choice-9', 'csp-s-2019-choice-10',
  'csp-s-2020-choice-8', 'csp-s-2020-choice-13',
  'csp-s-2021-choice-7', 'csp-s-2021-choice-13', 'csp-s-2021-choice-14',
  'csp-s-2022-choice-9', 'csp-s-2022-choice-10', 'csp-s-2022-choice-11',
  'csp-s-2023-choice-2', 'csp-s-2024-choice-4', 'csp-s-2024-choice-12',
  'csp-s-2025-choice-1', 'csp-s-2025-choice-5', 'csp-s-2025-choice-13',
];
for (const id of combinatoricsChoiceIds2019To2025) {
  assert.ok(advancedDay5.questions.choice.includes(id), `advanced day 5 is missing combinatorics question ${id}`);
}
for (const id of ['P1706', 'P1157', 'P1219', 'P1746', 'P1443', 'P1135', 'P2895']) {
  assert.ok(
    ['luoguBasic', 'luoguPopular', 'luoguAdvanced']
      .some(level => advancedDay5.programming[level].includes(id)),
    `advanced day 5 is missing classic search problem ${id}`
  );
}
assert.match(advancedDay6.morning.theme, /STL.*栈队列.*前中后缀表达式/);
assert.match(advancedDay6.afternoon.theme, /树.*二叉树.*哈夫曼树.*图论/);
for (const id of ['2021-choice-9', '2022-choice-6', '2019-choice-14', '2022-choice-7', '2020-choice-8', '2024-choice-11']) {
  assert.ok(advancedDay6.questions.choice.includes(id), `advanced day 6 is missing expression/tree/graph question ${id}`);
}
for (const id of ['P1449', 'P1030', 'P1090', 'P5318', 'P3916']) {
  assert.ok(
    ['luoguBasic', 'luoguPopular', 'luoguAdvanced']
      .some(level => advancedDay6.programming[level].includes(id)),
    `advanced day 6 is missing expression/tree/graph problem ${id}`
  );
}
assert.match(advancedDay7.morning.theme, /动态规划（一）/);
assert.match(advancedDay8.morning.theme, /动态规划（二）/);
assert.ok(advancedDay7.questions.reading.includes('2024-reading-2'));
assert.ok(advancedDay8.questions.completion.includes('csp-s-2020-completion-2'));

const cleanedMath = renderCspInline('$\\text{01 0010}$ 与 $x^{2}$');
assert.ok(cleanedMath.includes('01 0010'));
assert.ok(cleanedMath.includes('<sup>2</sup>'));
assert.ok(!cleanedMath.includes('\\text'));
assert.ok(!cleanedMath.includes('$'));

const liveStats = buildLiveQuestionStats([
  { questionId: 'choice-1', submitted: 2, total: 3, averagePercent: 50 },
  { questionId: 'choice-2', submitted: 3, total: 3, averagePercent: 100 },
  { questionId: 'choice-3', submitted: 0, total: 3, averagePercent: null },
]);
assert.deepEqual(liveStats, {
  'choice-1': { submitted: 2, total: 3, averagePercent: 50 },
  'choice-2': { submitted: 3, total: 3, averagePercent: 100 },
});

console.log('training courses verified: advanced/progress templates, 10 days, CSP-J/S/GESP references and OJ ids are valid');
