import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { ACTION_LIST, ATTRIBUTE_KEYS, DEFAULT_ATTRIBUTES, PLAYER_PRESETS, createGame, getObservation, chooseAIAction, runAIDecision } from '../../src/lib/basketball';
import { createStatisticsAccumulator, stepStatistics, statisticsReport, runStatistics } from '../../src/lib/basketball/statistics';
import { runSpatialProbes } from './spatial-probes';
import { runStarterAudit } from './starter-audit';
import { pair } from '../../tests/basketball/helpers';
import { attributeWitnesses } from '../../tests/basketball/attribute-witnesses';
import type { ActionCommand, AttributeKey, GameState, PlayerSetup } from '../../src/lib/basketball/types';

const possessionTarget = Number(process.argv[2] ?? 10000);
const gameTarget = Number(process.argv[3] ?? 100);
const outputDirectory = join(process.cwd(), 'docs', 'basketball', 'results');
mkdirSync(outputDirectory, { recursive: true });
const write = (name: string, data: unknown) => writeFileSync(join(outputDirectory, name), `${JSON.stringify(data, null, 2)}\n`);
const started = performance.now();
const accumulator = createStatisticsAccumulator({ seed: 20261013, possessions: possessionTarget, games: gameTarget });
let announced = 0;
while (!accumulator.done) {
  const progress = stepStatistics(accumulator, 1000);
  if (accumulator.completedGames >= announced + 50) {
    announced = accumulator.completedGames;
    console.log(`${progress.report.completedPossessions}개 포제션 / ${announced}개 전체 경기 완료`);
  }
}
const report = statisticsReport(accumulator);
write('baseline.json', { ...report, wallClockSeconds: (performance.now() - started) / 1000, note: '경기 시작부터 종료까지 진행한 전체 경기만 포함한다. 기술 성공은 볼 제어 성공이며 돌파 성공과 별도다.' });
console.log(JSON.stringify({ possessions: report.completedPossessions, games: report.completedGames, shooting: report.shooting, turnoverRate: report.turnoverRate, anomalies: report.anomalies }, null, 2));

/** 동일 시드·상대에 능력치 하나만 바꾼 경기 승률. 소표본은 불확실성을 명시한다. */
const attributeResults: Record<string, unknown> = {};
for (const attribute of ATTRIBUTE_KEYS) {
  const rows = [20, 95].map(value => {
    const players: [PlayerSetup, PlayerSetup] = [{ name: `${attribute} ${value}`, attributes: { ...DEFAULT_ATTRIBUTES, [attribute]: value } }, { name: '기준 65', attributes: { ...DEFAULT_ATTRIBUTES } }];
    const sample = runStatistics({ seed: 9501, possessions: 1, games: 8, players });
    return { value, games: sample.completedGames, possessions: sample.completedPossessions, winRate: sample.playerWins.p1.winRate, shooting: sample.shooting, steals: sample.steals, breakthrough: sample.breakthrough, staminaPerPossession: sample.averageStaminaSpent.p1, averageGameSeconds: sample.averageGameSeconds };
  });
  attributeResults[attribute] = { low: rows[0], high: rows[1], highMinusLowWinRate: Number(rows[1].winRate) - Number(rows[0].winRate) };
}
write('attribute-win-rates.json', { seed: 9501, baseline: 65, gamesPerValue: 8, caveat: '각 능력치는 20/95에서 동일한 시드의 8경기를 비교한다. 경기 승률은 소표본이며 단조 관계의 통계적 증명이 아니다. 요구된 8개 관계는 별도 256~512회 통제 실험으로 검증한다.', attributes: attributeResults });

const profileResults: Record<string, unknown> = {};
for (const attacker of PLAYER_PRESETS) for (const defender of PLAYER_PRESETS) {
  const sample = runStatistics({ seed: 12807, possessions: 1, games: 4, players: [{ name: attacker.name, attributes: attacker.attributes }, { name: defender.name, attributes: defender.attributes }] });
  profileResults[`${attacker.id}/${defender.id}`] = { games: sample.completedGames, possessions: sample.completedPossessions, p1Wins: sample.playerWins.p1, shooting: sample.shooting, turnovers: sample.turnoverRate, breakthroughs: sample.breakthrough, ratingCombinations: sample.ratingCombinations, averageGameSeconds: sample.averageGameSeconds };
}
write('profile-matchups.json', { seed: 12807, gamesPerMatchup: 4, caveat: '각 경기는 양쪽 선수가 공격·수비 역할을 모두 맡는다. 25개 선수 조합의 결과와 공격/수비 능력치 구간별 세부 성능이다.', matchups: profileResults });

function resolve(state: GameState, attack: ActionCommand, defense: ActionCommand) {
  return pair(state, attack, defense);
}
const techniqueResults: Record<string, unknown> = {};
const defenseActions: ActionCommand[] = [{ actionId: 'HoldPosition', speed: 0 }, { actionId: 'CutOffDrivingLane', anticipatedDirection: { x: 0, y: -1 } }, { actionId: 'StealAttempt', speed: 0 }, { actionId: 'DefensiveSlideRight' }, { actionId: 'AnticipateDirection', anticipatedDirection: { x: 1, y: -1 } }, { actionId: 'BodyUp', speed: 0 }];
for (const technique of ACTION_LIST.filter(action => action.category === 'dribble')) for (const defense of defenseActions) {
  const tally = { trials: 128, attempts: 0, controls: 0, drives: 0, steals: 0, fouls: 0, looseBalls: 0, offenseProgressMeters: 0, offenseStaminaSpent: 0, defenseStaminaSpent: 0 };
  for (let seed = 1; seed <= tally.trials; seed++) {
    const state = createGame({}, Math.imul(seed + 8723, 2654435761) >>> 0);
    state.players[0].position = { x: 7.5, y: 6 }; state.players[1].position = { x: 7.5, y: 5 };
    state.ball.position = { ...state.players[0].position };
    const result = resolve(state, { actionId: technique.id, direction: { x: 0.5, y: -1 }, speed: 0.9 }, defense);
    tally.attempts += result.stats.dribbleAttempts[technique.id] ?? 0;
    tally.controls += result.stats.dribbleSuccesses[technique.id] ?? 0;
    tally.drives += result.stats.drives.p1; tally.steals += result.stats.steals.p2;
    tally.fouls += result.stats.fouls.p1 + result.stats.fouls.p2;
    tally.looseBalls += Number(result.events.some(event => event.type === 'loose_ball'));
    const lastMovement = result.events.filter(event => event.type === 'movement' && event.playerId === 'p1').at(-1);
    tally.offenseProgressMeters += 6 - (lastMovement?.position?.y ?? result.players[0].position.y);
    tally.offenseStaminaSpent += result.stats.staminaSpent.p1; tally.defenseStaminaSpent += result.stats.staminaSpent.p2;
  }
  techniqueResults[`${technique.id}/${defense.actionId}`] = { ...tally, controlRate: tally.controls / tally.attempts, breakthroughRate: tally.drives / tally.attempts, averageProgressMeters: tally.offenseProgressMeters / tally.trials, averageOffenseStamina: tally.offenseStaminaSpent / tally.trials, averageDefenseStamina: tally.defenseStaminaSpent / tally.trials };
}
write('technique-defense-matrix.json', { trialsPerCombination: 128, combinations: techniqueResults });

/** 요구된 단조 관계는 공식 값 대신 실제 실행 결과 표본을 함께 저장한다. */
const controlledExperiments: Record<string, unknown> = {};
function compare(name: string, attribute: AttributeKey, playerIndex: 0 | 1, attack: ActionCommand, defense: ActionCommand, measure: (state: GameState) => number, setup: (state: GameState) => void = () => {}, trials = 512) {
  const values = [20, 95].map(value => {
    let total = 0;
    for (let seed = 1; seed <= trials; seed++) {
      const state = createGame({}, Math.imul(seed, 2654435761) >>> 0, [{ attributes: Object.fromEntries(ATTRIBUTE_KEYS.map(key => [key, 90])) }, { attributes: Object.fromEntries(ATTRIBUTE_KEYS.map(key => [key, 60])) }]);
      state.players[0].position = { x: 7.5, y: 7 }; state.players[1].position = { x: 2, y: 3 }; state.ball.position = { ...state.players[0].position };
      setup(state); state.players[playerIndex].attributes[attribute] = value;
      total += measure(resolve(state, attack, defense));
    }
    return total / trials;
  });
  controlledExperiments[name] = { attribute, trialsPerValue: trials, lowAttribute: 20, highAttribute: 95, lowMean: values[0], highMean: values[1], difference: values[1] - values[0] };
}
const hold: ActionCommand = { actionId: 'HoldPosition', speed: 0 };
const near = (state: GameState) => { state.players[1].position = { x: 7.5, y: 6.1 }; };
compare('볼 핸들링 → 제어', 'BallHandling', 0, { actionId: 'Crossover', speed: 0 }, hold, state => state.players[0].ballControl);
compare('스틸 → 성공', 'Steal', 1, { actionId: 'SpeedDribble', speed: 0 }, { actionId: 'StealAttempt', speed: 0 }, state => state.stats.steals.p2, state => { near(state); state.players[0].attributes.BallControl = 50; state.players[0].attributes.DribbleProtection = 45; state.players[0].attributes.Composure = 50; });
compare('대인 수비 → 전진 제한', 'PerimeterDefense', 1, { actionId: 'SpeedDribble', direction: { x: 0, y: -1 }, speed: 1 }, { actionId: 'CutOffDrivingLane', anticipatedDirection: { x: 0, y: -1 }, speed: 0 }, state => state.players[0].position.y, near);
compare('횡이동 → 방향 대응', 'LateralQuickness', 1, { actionId: 'ProtectBall' }, { actionId: 'DefensiveSlideRight', direction: { x: 1, y: 0 }, speed: 1 }, state => { const start = state.events.find(event => event.type === 'action_start' && event.playerId === 'p1'); const sharedTime = Number(start?.data?.duration) * 0.7; const sample = state.events.find(event => event.type === 'movement' && event.playerId === 'p2' && Math.abs(event.time - sharedTime) < 1e-6); if (!sample?.position) throw new Error('같은 시간의 방향 전환 측정값 없음'); return sample.position.x; }, state => { state.players[1].velocity = { x: -1, y: 0 }; });
compare('중거리 슛 → 성공', 'MidRangeShot', 0, { actionId: 'StandingShot' }, hold, state => state.stats.madeShots.p1);
compare('컨테스트 → 피슛 성공', 'ShotContest', 1, { actionId: 'StandingShot' }, { actionId: 'ContestShot', speed: 0 }, state => state.stats.madeShots.p1, near);
compare('지구력 → 체력 소비', 'Endurance', 0, { actionId: 'SpeedDribble', direction: { x: 0, y: 1 }, speed: 1 }, { actionId: 'DefensiveSlideRight', speed: 1 }, state => state.stats.staminaSpent.p1);
compare('균형 → 회복', 'Balance', 0, { actionId: 'Crossover', direction: { x: -1, y: 0 }, speed: 1 }, hold, state => state.players[0].bodyBalance, state => { state.players[0].bodyBalance = 35; state.players[0].velocity = { x: 3, y: 0 }; state.players[0].movementDirection = { x: 1, y: 0 }; });
write('controlled-attributes.json', { description: '동일 초기 상태·시드 쌍에서 실제 명령을 실행한 결과 평균. 낮은/높은 값 외 조건 고정.', experiments: controlledExperiments });

// 공개 관측으로만 선택한 자동 명령의 검증은 별도 단위 테스트에서도 수행한다.
const sample = createGame({}, 47);
const aiExamples = ['p1', 'p2'].map(id => ({ player: id, command: chooseAIAction(getObservation(sample, id as 'p1' | 'p2')) }));
let smoke = sample;
for (let i = 0; i < 10 && smoke.status === 'playing'; i++) smoke = runAIDecision(smoke);
write('spatial-technique-probes.json', runSpatialProbes());
write('first-possession-symmetry.json', runStarterAudit());
write('attribute-path-witnesses.json', { method: '능력치 입력/카탈로그/행동 라벨을 제외한 실제 상태 전이에 차이가 생긴 첫 실행 경로. 각 능력치만 20/95로 변경.', witnesses: attributeWitnesses() });
write('run-summary.json', { generatedAt: new Date().toISOString(), command: `npm run stats:basketball -- ${possessionTarget} ${gameTarget}`, wallClockSeconds: (performance.now() - started) / 1000, baselinePossessions: report.completedPossessions, baselineGames: report.completedGames, spatialTechniqueTrials: 5760, additionalStarterAuditGames: 200, additionalAttributeGames: ATTRIBUTE_KEYS.length * 2 * 8, additionalProfileGames: PLAYER_PRESETS.length ** 2 * 4, techniqueTrials: ACTION_LIST.filter(action => action.category === 'dribble').length * defenseActions.length * 128, aiExamples, anomalies: report.anomalies });
console.log(`통계 파일 저장: ${outputDirectory} (${((performance.now() - started) / 1000).toFixed(1)}초)`);
