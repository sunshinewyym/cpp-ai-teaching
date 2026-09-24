const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let questionBankPromise;

const localDataDir = path.resolve(__dirname, '../../web/src/data');
const packagedDataDir = path.resolve(__dirname, '../web/src/data');
const dataDir = process.env.QUESTION_BANK_DATA_DIR
  || (fs.existsSync(path.join(localDataDir, 'cspChoicePapers.js')) ? localDataDir : packagedDataDir);

function loadModule(file) {
  return import(pathToFileURL(path.join(dataDir, file)).href);
}

async function loadQuestionBank() {
  if (!questionBankPromise) {
    questionBankPromise = Promise.all([
      loadModule('cspChoicePapers.js'),
      loadModule('cspProgramProblems.js'),
      loadModule('csp2025.js'),
      loadModule('csp2026.js'),
      loadModule('gespPapers.js'),
      loadModule('trainingCspS.js'),
      loadModule('noipProgramProblems.js'),
    ]).then(([choices, programs, newest, year2026, gesp, cspS, noip]) => {
      const bank = new Map();
      const choiceItems = Object.values({
        ...choices.cspChoicePapers,
        ...newest.csp2025ChoicePapers,
        ...year2026.csp2026ChoicePapers,
      }).flat();
      const programItems = [
        ...programs.cspProgramProblems,
        ...newest.csp2025ProgramProblems,
        ...year2026.csp2026ProgramProblems,
        ...noip.noipProgramProblems,
      ];

      for (const item of choiceItems) {
        bank.set(item.id, {
          id: item.id,
          question: item.question || '',
          options: item.options || {},
          tags: Array.isArray(item.tags) ? item.tags : [],
          parts: [{
          answer: item.answer,
          explanation: item.explanation || '',
          source: item.source || null,
          number: item.number,
          type: item.type || item.source?.questionType || '',
            id: item.id,
            answers: [item.answer],
            options: Object.keys(item.options || {}),
            score: 2,
          }],
        });
      }
      for (const item of gesp.listGespQuestions()) {
        if (!['choice', 'judgment'].includes(item.source?.questionType)) continue;
        bank.set(item.id, {
          id: item.id,
          question: item.question || '',
          options: item.options || {},
          tags: Array.isArray(item.tags) ? item.tags : [],
          parts: [{
          answer: item.answer,
          explanation: item.explanation || '',
          source: item.source || null,
          number: item.number,
          type: item.type || item.source?.questionType || '',
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
          question: item.question || '',
          options: item.options || {},
          tags: Array.isArray(item.tags) ? item.tags : [],
          parts: [{
          answer: item.answer,
          explanation: item.explanation || '',
          source: item.source || null,
          number: item.number,
          type: item.type || item.source?.questionType || '',
            id: item.id,
            answers: [item.answer],
            options: Object.keys(item.options || {}),
            score: 2,
          }],
        });
      }
      for (const item of cspS.cspSTrainingPrograms) {
        bank.set(item.id, {
          id: item.id,
          title: item.title || '',
          description: item.description || '',
          statement: item.statement || '',
          tags: Array.isArray(item.tags) ? item.tags : [],
          parts: item.questions.map(question => ({
          source: item.source || null,
          number: item.number,
          type: item.type || '',
          questions: item.questions || [],
            id: question.id,
            text: question.text || question.question || '',
            answers: question.answers,
            options: Object.keys(question.options || {}),
            score: Number(question.score) || 1,
          })),
        });
      }
      for (const item of programItems) {
        bank.set(item.id, {
          id: item.id,
          title: item.title || '',
          description: item.description || '',
          statement: item.statement || '',
          tags: Array.isArray(item.tags) ? item.tags : [],
          parts: item.questions.map(question => ({
          source: item.source || null,
          number: item.number,
          type: item.type || '',
          questions: item.questions || [],
            id: question.id,
            text: question.text || question.question || '',
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

// Most program questions are stored as a flat list of subquestions. Keep
// compatibility with older imports that wrapped that list in one `questions` section.
function questionParts(question) {
  const parts = Array.isArray(question?.parts) ? question.parts : [];
  if (parts.length === 1 && Array.isArray(parts[0]?.questions) && parts[0].questions.length) {
    return parts[0].questions;
  }
  return parts;
}

function partOptionKeys(part) {
  if (Array.isArray(part?.options)) return part.options;
  if (part?.options && typeof part.options === 'object') return Object.keys(part.options);
  return [];
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
  const parts = [];
  for (const part of questionParts(question)) {
    const selected = normalizeSelected(submittedAnswers[part.id]);
    if (!selected.length || selected.some(item => !partOptionKeys(part).includes(item))) {
      throw new Error('请完成本题的所有小题后再提交');
    }
    const correct = normalizeSelected(part.answers);
    answers[part.id] = selected;
    maxScore += part.score;
    const isCorrect = selected.length === correct.length && selected.every((item, index) => item === correct[index]);
    if (isCorrect) score += part.score;
    parts.push({
      id: part.id,
      selected,
      correctAnswers: correct,
      correct: isCorrect,
      score: isCorrect ? part.score : 0,
      maxScore: part.score,
    });
  }

  return { answers, score, maxScore, parts };
}

module.exports = { gradeQuestion, loadQuestionBank };
