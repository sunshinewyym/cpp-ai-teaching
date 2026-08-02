const path = require('node:path');
const { pathToFileURL } = require('node:url');

let questionBankPromise;

function loadModule(file) {
  return import(pathToFileURL(path.join(__dirname, '../../web/src/data', file)).href);
}

async function loadQuestionBank() {
  if (!questionBankPromise) {
    questionBankPromise = Promise.all([
      loadModule('cspChoicePapers.js'),
      loadModule('cspProgramProblems.js'),
      loadModule('csp2025.js'),
      loadModule('gespPapers.js'),
      loadModule('trainingCspS.js'),
    ]).then(([choices, programs, newest, gesp, cspS]) => {
      const bank = new Map();
      const choiceItems = Object.values({
        ...choices.cspChoicePapers,
        ...newest.csp2025ChoicePapers,
      }).flat();
      const programItems = [
        ...programs.cspProgramProblems,
        ...newest.csp2025ProgramProblems,
      ];

      for (const item of choiceItems) {
        bank.set(item.id, {
          id: item.id,
          parts: [{
            id: item.id,
            answers: [item.answer],
            options: Object.keys(item.options || {}),
            score: 1,
          }],
        });
      }
      for (const item of gesp.listGespQuestions()) {
        if (!['choice', 'judgment'].includes(item.source?.questionType)) continue;
        bank.set(item.id, {
          id: item.id,
          parts: [{
            id: item.id,
            answers: [item.answer],
            options: Object.keys(item.options || {}),
            score: Number(item.source?.scorePerQuestion) || 1,
          }],
        });
      }
      for (const item of cspS.cspSTrainingChoices) {
        bank.set(item.id, {
          id: item.id,
          parts: [{
            id: item.id,
            answers: [item.answer],
            options: Object.keys(item.options || {}),
            score: 1,
          }],
        });
      }
      for (const item of cspS.cspSTrainingPrograms) {
        bank.set(item.id, {
          id: item.id,
          parts: item.questions.map(question => ({
            id: question.id,
            answers: question.answers,
            options: Object.keys(question.options || {}),
            score: Number(question.score) || 1,
          })),
        });
      }
      for (const item of programItems) {
        bank.set(item.id, {
          id: item.id,
          parts: item.questions.map(question => ({
            id: question.id,
            answers: question.answers,
            options: Object.keys(question.options || {}),
            score: Number(question.score) || 1,
          })),
        });
      }
      return bank;
    });
  }
  return questionBankPromise;
}

function normalizeSelected(value) {
  const selected = Array.isArray(value) ? value : [value];
  return [...new Set(selected.map(item => String(item || '').trim()).filter(Boolean))].sort();
}

async function gradeQuestion(questionId, submittedAnswers) {
  const bank = await loadQuestionBank();
  const question = bank.get(questionId);
  if (!question) throw new Error('题库中未找到该题');
  if (!submittedAnswers || typeof submittedAnswers !== 'object' || Array.isArray(submittedAnswers)) {
    throw new Error('请完成本题后再提交');
  }

  let score = 0;
  let maxScore = 0;
  const answers = {};
  for (const part of question.parts) {
    const selected = normalizeSelected(submittedAnswers[part.id]);
    if (!selected.length || selected.some(item => !part.options.includes(item))) {
      throw new Error('请完成本题的所有小题后再提交');
    }
    const correct = normalizeSelected(part.answers);
    answers[part.id] = selected;
    maxScore += part.score;
    if (selected.length === correct.length && selected.every((item, index) => item === correct[index])) {
      score += part.score;
    }
  }

  return { answers, score, maxScore };
}

module.exports = { gradeQuestion, loadQuestionBank };
