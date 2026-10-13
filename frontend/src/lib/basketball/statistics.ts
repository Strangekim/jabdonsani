import { createGame } from './engine';
import { ACTIONS } from './actions';
import { runAIDecision } from './ai';
import type { ActionId, AttributeKey, ConfigOverrides, Difficulty, GameState, GameStats, PlayerSetup } from './types';

/** 포제션과 경기를 구분하며, 시도가 없는 성공률은 null로 표시한다. */
export interface StatisticsOptions {
  seed?: number;
  possessions?: number;
  games?: number;
  difficulty?: Difficulty;
  players?: [PlayerSetup, PlayerSetup];
  config?: ConfigOverrides;
  maxDecisionsPerGame?: number;
}
export interface RateSample { attempts: number; successes: number; rate: number | null }
export interface WinSample { appearances: number; wins: number; winRate: number | null; confidence95: { low: number; high: number } | null }
export interface CombinationSample {
  decisions: number; possessions: number; points: number; turnovers: number;
  shots: number; madeShots: number; drives: number;
}
export interface StatisticsReport {
  version: 1; seed: number; initialOffenseId: 'p1' | 'p2'; requestedPossessions: number; completedPossessions: number;
  completedGames: number; decisions: number; simulatedSeconds: number;
  averagePossessionSeconds: number; averageDecisionPoints: number; averageDribbles: number;
  averageGameSeconds: number; averageGamePossessions: number; averageGameDecisions: number;
  turnoverRate: number; shooting: RateSample; steals: RateSample; blocks: RateSample;
  breakthrough: RateSample; foulsPerPossession: number; fouls: number;
  averageStaminaSpent: { p1: number; p2: number; both: number };
  techniques: Partial<Record<ActionId, RateSample>>;
  playerWins: { p1: WinSample; p2: WinSample };
  attributeWinRates: Partial<Record<AttributeKey, Record<string, WinSample>>>;
  ratingCombinations: Record<string, CombinationSample>;
  actionCombinations: Record<string, CombinationSample>;
  anomalies: string[];
}
interface Totals {
  possessions: number; seconds: number; decisions: number; dribbles: number;
  shots: number; madeShots: number; turnovers: number; steals: number; stealAttempts: number;
  blocks: number; blockAttempts: number; fouls: number; drives: number; driveAttempts: number;
  stamina: { p1: number; p2: number };
}
export interface StatisticsAccumulator {
  options: Required<Pick<StatisticsOptions, 'seed' | 'possessions' | 'games' | 'difficulty' | 'maxDecisionsPerGame'>> & StatisticsOptions;
  state: GameState; completedGames: number; totals: Totals;
  techniques: Partial<Record<ActionId, RateSample>>;
  playerWins: { p1: WinSample; p2: WinSample };
  attributeWinRates: StatisticsReport['attributeWinRates'];
  ratingCombinations: Record<string, CombinationSample>;
  actionCombinations: Record<string, CombinationSample>;
  anomalies: string[]; done: boolean; currentDriveAttempts: number;
}
const sum = (record: Record<'p1' | 'p2', number>) => record.p1 + record.p2;
const rate = (successes: number, attempts: number): RateSample => ({ attempts, successes, rate: attempts ? successes / attempts : null });
const wins = (): WinSample => ({ appearances: 0, wins: 0, winRate: null, confidence95: null });
/** 윌슨 95% 이항 구간으로 소표본의 불확실성과 선공 효과를 함께 드러낸다. */
export function winConfidence95(successes: number, samples: number): { low: number; high: number } | null {
  if (!samples) return null;
  const z = 1.96, p = successes / samples, divisor = 1 + z * z / samples;
  const center = (p + z * z / (2 * samples)) / divisor;
  const margin = z * Math.sqrt(p * (1 - p) / samples + z * z / (4 * samples * samples)) / divisor;
  return { low: center - margin, high: center + margin };
}
export function sampleWarnings(report: Pick<StatisticsReport, 'completedPossessions' | 'completedGames' | 'techniques' | 'playerWins' | 'initialOffenseId'>): string[] {
  const warnings: string[] = [];
  if (report.completedPossessions >= 100) {
    const absent = Object.values(ACTIONS).filter(action => action.category === 'dribble' && !(report.techniques[action.id]?.attempts)).map(action => action.id);
    if (absent.length) warnings.push(`기본 AI 표본에서 미관측 드리블: ${absent.join(', ')}. 별도 기술 대결 실험이 필요합니다.`);
  }
  const sample = report.playerWins.p1, interval = winConfidence95(sample.wins, sample.appearances);
  if (report.completedGames >= 100 && interval && (interval.low > 0.5 || interval.high < 0.5)) warnings.push(`P1 승률 ${((sample.winRate ?? 0) * 100).toFixed(2)}% (윌슨 95% 구간 ${(interval.low * 100).toFixed(2)}~${(interval.high * 100).toFixed(2)}%). 모든 경기의 선공은 ${report.initialOffenseId.toUpperCase()}이며 능력치·선공 효과와 ID 편향은 구분해야 합니다.`);
  return warnings;
}
const combination = (): CombinationSample => ({ decisions: 0, possessions: 0, points: 0, turnovers: 0, shots: 0, madeShots: 0, drives: 0 });
const bucket = (value: number) => value < 40 ? '0–39' : value < 70 ? '40–69' : '70–100';
const offenseAttributes: AttributeKey[] = ['BallHandling', 'BallControl', 'DribbleSpeed', 'CloseShot', 'MidRangeShot', 'LongRangeShot', 'Layup', 'ShotCreation'];
const defenseAttributes: AttributeKey[] = ['PerimeterDefense', 'LateralQuickness', 'Steal', 'Block', 'ShotContest', 'DefensiveAwareness', 'Reaction'];

function checkBoundedInteger(name: string, value: number, minimum: number, maximum: number) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${name}: ${minimum}~${maximum} 정수여야 합니다.`);
}
export function createStatisticsAccumulator(options: StatisticsOptions = {}): StatisticsAccumulator {
  const resolved = { seed: 20261013, possessions: 10000, games: 100, difficulty: 'normal' as Difficulty, maxDecisionsPerGame: 10000, ...options };
  checkBoundedInteger('포제션', resolved.possessions, 1, 1000000);
  checkBoundedInteger('경기', resolved.games, 1, 100000);
  checkBoundedInteger('경기당 최대 결정점', resolved.maxDecisionsPerGame, 1, 1000000);
  return {
    options: resolved, state: createGame(resolved.config, resolved.seed, resolved.players), completedGames: 0,
    totals: { possessions: 0, seconds: 0, decisions: 0, dribbles: 0, shots: 0, madeShots: 0, turnovers: 0, steals: 0, stealAttempts: 0, blocks: 0, blockAttempts: 0, fouls: 0, drives: 0, driveAttempts: 0, stamina: { p1: 0, p2: 0 } },
    techniques: {}, playerWins: { p1: wins(), p2: wins() }, attributeWinRates: {},
    ratingCombinations: {}, actionCombinations: {}, anomalies: [], done: false, currentDriveAttempts: 0,
  };
}
function collectDelta(acc: StatisticsAccumulator, before: GameState, after: GameState) {
  const attacker = before.players.find(player => player.playerId === before.offenseId)!;
  const defender = before.players.find(player => player.playerId !== before.offenseId)!;
  const average = (keys: AttributeKey[], player: typeof attacker) => keys.reduce((total, key) => total + player.attributes[key], 0) / keys.length;
  const ratingKey = `공격 ${bucket(average(offenseAttributes, attacker))} / 수비 ${bucket(average(defenseAttributes, defender))}`;
  const last = after.history[after.history.length - 1];
  const actionKey = last ? `${last.commands[attacker.playerId].actionId} / ${last.commands[defender.playerId].actionId}` : '기록 없음';
  const s0 = before.stats, s1 = after.stats;
  // 돌파는 드리블 외 개더 스텝에도 가능하므로 분모에 실제 이동 행동 시작을 센다.
  const lastEventId = before.events.at(-1)?.id ?? 0;
  acc.currentDriveAttempts += after.events.filter(event => {
    const action = event.actionId ? ACTIONS[event.actionId] : undefined;
    return event.id > lastEventId && event.type === 'action_start' && event.playerId === before.offenseId && action && action.movementProfile > 0 && action.category !== 'ball';
  }).length;
  for (const [table, key] of [[acc.ratingCombinations, ratingKey], [acc.actionCombinations, actionKey]] as const) {
    const row = table[key] ??= combination();
    row.decisions += s1.totalDecisions - s0.totalDecisions;
    row.possessions += s1.completedPossessions - s0.completedPossessions;
    row.points += after.score[before.offenseId] - before.score[before.offenseId];
    row.turnovers += sum(s1.turnovers) - sum(s0.turnovers);
    row.shots += sum(s1.shots) - sum(s0.shots);
    row.madeShots += sum(s1.madeShots) - sum(s0.madeShots);
    row.drives += sum(s1.drives) - sum(s0.drives);
  }
}
function collectGame(acc: StatisticsAccumulator) {
  const state = acc.state, stats = state.stats, totals = acc.totals;
  acc.completedGames += 1;
  totals.possessions += stats.completedPossessions;
  totals.seconds += stats.totalPossessionTime;
  totals.decisions += stats.totalDecisions;
  totals.dribbles += stats.totalDribbles;
  totals.driveAttempts += acc.currentDriveAttempts; acc.currentDriveAttempts = 0;
  for (const key of ['shots', 'madeShots', 'turnovers', 'steals', 'stealAttempts', 'blocks', 'blockAttempts', 'fouls', 'drives'] as const) totals[key] += sum(stats[key]);
  for (const playerId of ['p1', 'p2'] as const) {
    totals.stamina[playerId] += stats.staminaSpent[playerId];
    const row = acc.playerWins[playerId];
    row.appearances += 1; row.wins += Number(state.winner === playerId); row.winRate = row.wins / row.appearances; row.confidence95 = winConfidence95(row.wins, row.appearances);
    const player = state.players.find(candidate => candidate.playerId === playerId)!;
    for (const [key, value] of Object.entries(player.attributes) as [AttributeKey, number][]) {
      const group = acc.attributeWinRates[key] ??= {};
      const sample = group[bucket(value)] ??= wins();
      sample.appearances += 1; sample.wins += Number(state.winner === playerId); sample.winRate = sample.wins / sample.appearances; sample.confidence95 = winConfidence95(sample.wins, sample.appearances);
    }
  }
  for (const [key, attempts] of Object.entries(stats.dribbleAttempts) as [ActionId, number][]) {
    const previous = acc.techniques[key] ?? rate(0, 0);
    acc.techniques[key] = rate(previous.successes + (stats.dribbleSuccesses[key] ?? 0), previous.attempts + attempts);
  }
  if (!state.winner) acc.anomalies.push(`경기 ${acc.completedGames}: 승자 없이 종료 (포제션 상한 또는 동점 규칙 확인).`);
  if (stats.completedPossessions === 0) throw new Error('포제션이 끝나지 않고 경기가 종료되었습니다.');
}
/** UI는 작은 결정점 묶음마다 호출하고, 완료된 전체 경기만 최종 통계에 합산한다. */
export function stepStatistics(acc: StatisticsAccumulator, decisionBudget = 100): { done: boolean; progress: number; report: StatisticsReport } {
  checkBoundedInteger('결정점 묶음', decisionBudget, 1, 1000000);
  for (let count = 0; count < decisionBudget && !acc.done; count += 1) {
    const before = acc.state;
    if (before.stats.totalDecisions >= acc.options.maxDecisionsPerGame) throw new Error(`경기 ${acc.completedGames + 1}가 결정점 상한을 초과했습니다.`);
    acc.state = runAIDecision(before, acc.options.difficulty);
    if (acc.state.status === 'playing' && acc.state.decisionId === before.decisionId) throw new Error(`자동 경기가 진행되지 않습니다: 결정점 ${before.decisionId}`);
    collectDelta(acc, before, acc.state);
    if (acc.state.status === 'finished') {
      collectGame(acc);
      acc.done = acc.totals.possessions >= acc.options.possessions && acc.completedGames >= acc.options.games;
      if (!acc.done) acc.state = createGame(acc.options.config, (acc.options.seed + acc.completedGames * 2654435761) >>> 0, acc.options.players);
    }
  }
  const currentPossessions = acc.totals.possessions + (acc.done ? 0 : acc.state.stats.completedPossessions);
  return { done: acc.done, progress: acc.done ? 1 : Math.min(currentPossessions / acc.options.possessions, acc.completedGames / acc.options.games, 0.999), report: statisticsReport(acc) };
}
export function statisticsReport(acc: StatisticsAccumulator): StatisticsReport {
  const t = acc.totals, p = t.possessions || 1, g = acc.completedGames || 1;
  const anomalies = [...acc.anomalies];
  if (t.possessions >= 100) {
    if (t.shots === 0) anomalies.push('슛이 관측되지 않았습니다.');
    if (t.turnovers / p > 0.6) anomalies.push('턴오버가 포제션의 60%를 넘습니다.');
    if (t.shots && (t.madeShots / t.shots < 0.1 || t.madeShots / t.shots > 0.9)) anomalies.push('슛 성공률이 10~90% 범위를 벗어납니다.');
    if (t.fouls / p > 0.5) anomalies.push('파울이 포제션당 0.5회를 넘습니다.');
    if (t.dribbles / p > (acc.state.config.maxDribbles + 0.01)) anomalies.push('평균 드리블 횟수가 제한을 초과합니다.');
    if (t.stealAttempts === 0) anomalies.push('스틸 시도가 관측되지 않았습니다.');
    if (t.blockAttempts === 0) anomalies.push('블록 시도가 관측되지 않았습니다.');
  }
  const report: StatisticsReport = {
    version: 1, seed: acc.options.seed, initialOffenseId: acc.state.config.initialOffenseId, requestedPossessions: acc.options.possessions,
    completedPossessions: t.possessions, completedGames: acc.completedGames, decisions: t.decisions, simulatedSeconds: t.seconds,
    averagePossessionSeconds: t.seconds / p, averageDecisionPoints: t.decisions / p, averageDribbles: t.dribbles / p,
    averageGameSeconds: t.seconds / g, averageGamePossessions: t.possessions / g, averageGameDecisions: t.decisions / g,
    turnoverRate: t.turnovers / p, shooting: rate(t.madeShots, t.shots), steals: rate(t.steals, t.stealAttempts), blocks: rate(t.blocks, t.blockAttempts),
    breakthrough: rate(t.drives, t.driveAttempts), foulsPerPossession: t.fouls / p, fouls: t.fouls,
    averageStaminaSpent: { p1: t.stamina.p1 / p, p2: t.stamina.p2 / p, both: (t.stamina.p1 + t.stamina.p2) / p },
    techniques: structuredClone(acc.techniques), playerWins: structuredClone(acc.playerWins), attributeWinRates: structuredClone(acc.attributeWinRates),
    ratingCombinations: structuredClone(acc.ratingCombinations), actionCombinations: structuredClone(acc.actionCombinations), anomalies,
  };
  report.anomalies.push(...sampleWarnings(report));
  return report;
}
export function runStatistics(options: StatisticsOptions = {}): StatisticsReport {
  const accumulator = createStatisticsAccumulator(options);
  while (!accumulator.done) stepStatistics(accumulator, 1000);
  return statisticsReport(accumulator);
}

/** 시뮬레이션 델타를 읽는 보조 함수. 외부 통계에서도 분모를 동일하게 사용한다. */
export function totalStat(stats: GameStats, key: 'shots' | 'madeShots' | 'turnovers' | 'steals' | 'stealAttempts' | 'blocks' | 'blockAttempts' | 'fouls' | 'drives') {
  return sum(stats[key]);
}
