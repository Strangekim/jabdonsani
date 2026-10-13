import test from 'node:test';
import assert from 'node:assert/strict';
import { createStatisticsAccumulator, stepStatistics, statisticsReport, runStatistics } from '../../src/lib/basketball/statistics';

test('통계는 시도 없는 성공률을 null로 표시한다', () => {
  const report = statisticsReport(createStatisticsAccumulator({ possessions: 1, games: 1 }));
  assert.equal(report.completedGames, 0); assert.equal(report.completedPossessions, 0);
  assert.equal(report.shooting.rate, null); assert.equal(report.steals.rate, null); assert.equal(report.blocks.rate, null);
});
test('증분 실행 묶음 크기는 최종 결과를 바꾸지 않는다', () => {
  const options = { seed: 739, possessions: 20, games: 2, config: { targetScore: 3 } };
  const incremental = createStatisticsAccumulator(options);
  let lastProgress = 0;
  while (!incremental.done) {
    const step = stepStatistics(incremental, 7);
    assert.ok(step.progress >= lastProgress); lastProgress = step.progress;
  }
  assert.equal(lastProgress, 1);
  assert.deepEqual(statisticsReport(incremental), runStatistics(options));
});
test('통계의 분모·범위·경기 길이는 실제 완료 경기 표본과 일치한다', () => {
  const report = runStatistics({ seed: 713, possessions: 100, games: 3, config: { targetScore: 3 } });
  assert.ok(report.completedPossessions >= 100); assert.ok(report.completedGames >= 3);
  assert.ok(report.averageDribbles >= 0 && report.averageDribbles <= 3);
  assert.ok(report.averagePossessionSeconds > 0); assert.ok(report.averageDecisionPoints > 0);
  assert.equal(report.playerWins.p1.appearances, report.completedGames);
  assert.equal(report.playerWins.p2.appearances, report.completedGames);
  assert.ok(Math.abs(report.averageGameSeconds * report.completedGames - report.simulatedSeconds) < 1e-6);
  for (const metric of [report.shooting, report.steals, report.blocks, report.breakthrough, ...Object.values(report.techniques)]) {
    assert.ok(metric.attempts >= metric.successes);
    assert.ok(metric.rate === null || (metric.rate >= 0 && metric.rate <= 1));
  }
  assert.equal(Object.keys(report.attributeWinRates).length, 30);
  assert.ok(Object.keys(report.actionCombinations).length > 0);
});
test('잘못된 규모와 진행 중단은 명시적 오류를 낸다', () => {
  assert.throws(() => createStatisticsAccumulator({ possessions: 0 }));
  assert.throws(() => createStatisticsAccumulator({ games: 0 }));
  assert.throws(() => createStatisticsAccumulator({ possessions: Infinity }));
  const accumulator = createStatisticsAccumulator({ possessions: 1, games: 1, maxDecisionsPerGame: 1 });
  assert.throws(() => stepStatistics(accumulator, 100));
});
