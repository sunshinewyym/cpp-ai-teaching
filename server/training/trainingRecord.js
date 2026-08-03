function trainingRecordMeta(questionId) {
  const gesp = /^gesp-cpp([2-8])-(\d{4})-(\d{2})-(choice|judgment)-\d+$/i.exec(questionId);
  if (gesp) {
    return {
      level: `GESP-${gesp[1]}`,
      year: Number(gesp[2]),
      session: `${gesp[2]}-${gesp[3]}`,
      questionType: gesp[4].toLowerCase(),
    };
  }

  const cspS = /^csp-s-(\d{4})-(choice|reading|completion)-\d+$/i.exec(questionId);
  if (cspS) {
    return {
      level: 'CSP-S',
      year: Number(cspS[1]),
      session: cspS[1],
      questionType: cspS[2].toLowerCase(),
    };
  }

  const legacy = /^(\d{4})-(choice|reading|completion)-\d+$/i.exec(questionId);
  if (legacy) {
    return {
      level: 'CSP-J',
      year: Number(legacy[1]),
      session: legacy[1],
      questionType: legacy[2].toLowerCase(),
    };
  }
  return null;
}

function trainingPartNumber(questionId, index, questionType) {
  const root = new RegExp(`-${questionType}-(\\d+)$`, 'i').exec(questionId);
  if (!root) return index + 1;
  return ['choice', 'judgment'].includes(questionType)
    ? Number(root[1])
    : `${root[1]}.${index + 1}`;
}

function buildTrainingPracticeRecord(questionId, result, duration, trainingSubmissionId = null) {
  const meta = trainingRecordMeta(questionId);
  if (!meta) return null;
  const questions = result.parts.map((part, index) => {
    const userAnswer = part.selected.join('、');
    const correctAnswer = part.correctAnswers.join('、');
    return {
      id: part.id,
      number: trainingPartNumber(questionId, index, meta.questionType),
      user_answer: userAnswer,
      user_answer_label: userAnswer,
      correct_answer: correctAnswer,
      correct_answer_label: correctAnswer,
      correct: part.correct,
      score: part.score,
    };
  });
  return {
    training_submission_id: trainingSubmissionId,
    level: meta.level,
    year: meta.year,
    question_type: meta.questionType,
    total_score: result.score,
    max_score: result.maxScore,
    answers: {
      source: '集训课程',
      session: meta.session,
      questions,
    },
    duration_seconds: duration,
  };
}

function normalizeAnswers(value) {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map(item => String(item || '').trim()).filter(Boolean))].sort();
}

function buildTrainingPracticeRecordFromSubmission(questionId, definition, answers, score, maxScore, duration, trainingSubmissionId) {
  const parts = definition.parts.map(part => {
    const selected = normalizeAnswers(answers?.[part.id]);
    const correctAnswers = normalizeAnswers(part.answers);
    const correct = selected.length === correctAnswers.length
      && selected.every((item, index) => item === correctAnswers[index]);
    return {
      id: part.id,
      selected,
      correctAnswers,
      correct,
      score: correct ? part.score : 0,
      maxScore: part.score,
    };
  });
  return buildTrainingPracticeRecord(questionId, {
    score: Number(score),
    maxScore: Number(maxScore),
    parts,
  }, duration, trainingSubmissionId);
}

module.exports = {
  buildTrainingPracticeRecord,
  buildTrainingPracticeRecordFromSubmission,
};
