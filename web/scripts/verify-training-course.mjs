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
    for (const level of ['luoguBasic', 'luoguAdvanced']) {
      for (const id of day.programming[level] || []) assert.match(id, /^P\d{4,6}$/);
    }
  }
}

verifyTemplate(trainingCourseTemplate, 'advanced');
verifyTemplate(trainingCourseProgressTemplate, 'progress');

const cleanedMath = renderCspInline('$\\text{01 0010}$ 与 $x^{2}$');
assert.ok(cleanedMath.includes('01 0010'));
assert.ok(cleanedMath.includes('<sup>2</sup>'));
assert.ok(!cleanedMath.includes('\\text'));
assert.ok(!cleanedMath.includes('$'));

console.log('training courses verified: advanced/progress templates, 10 days, CSP-J/S/GESP references and OJ ids are valid');
