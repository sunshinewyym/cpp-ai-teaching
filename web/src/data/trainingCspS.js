import { cspSChoicePapers, cspSProgramProblems } from './cspS.js';

const prefix = 'csp-s-';

export const cspSTrainingChoices = Object.values(cspSChoicePapers)
  .flat()
  .map(item => ({
    ...item,
    id: `${prefix}${item.id}`,
    source: {
      level: 'CSP-S',
      year: Number(item.id.slice(0, 4)),
      session: '初赛',
      typeLabel: '选择题',
    },
  }));

export const cspSTrainingPrograms = cspSProgramProblems.map(item => ({
  ...item,
  id: `${prefix}${item.id}`,
  questions: item.questions.map(question => ({
    ...question,
    id: `${prefix}${question.id}`,
  })),
  source: {
    level: 'CSP-S',
    year: Number(item.year),
    session: '初赛',
  },
}));
