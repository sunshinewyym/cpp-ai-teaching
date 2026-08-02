const MIN_SECONDS_PER_ITEM = {
  choice: 16,
  judgment: 12,
  reading: 45,
  completion: 45,
};

function minimumDurationSeconds(questionType, itemCount) {
  const count = Math.max(1, Number(itemCount) || 1);
  return count * (MIN_SECONDS_PER_ITEM[questionType] || MIN_SECONDS_PER_ITEM.choice);
}

function isLeaderboardDurationValid(questionType, itemCount, durationSeconds) {
  // 旧记录没有计时字段，继续保留；新记录必须达到对应题型的最低合理用时。
  if (durationSeconds === null || durationSeconds === undefined) return true;
  const duration = Number(durationSeconds);
  return Number.isFinite(duration)
    && duration >= minimumDurationSeconds(questionType, itemCount);
}

module.exports = {
  minimumDurationSeconds,
  isLeaderboardDurationValid,
};
