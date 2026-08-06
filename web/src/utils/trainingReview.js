export function buildLiveQuestionStats(questions) {
  return Object.fromEntries((questions || []).flatMap(item => {
    if (!item.submitted || !Number.isFinite(item.averagePercent)) return [];
    return [[item.questionId, {
      submitted: item.submitted,
      total: item.total,
      averagePercent: item.averagePercent,
    }]];
  }));
}
