import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, ATTRIBUTE_KEYS } from '../../src/lib/basketball';
import { performanceFactor, shotProbability, stealProbability, balanceRecovery, dribbleControlScore } from '../../src/lib/basketball/formulas';
import type { ActionCommand, AttributeKey, GameState } from '../../src/lib/basketball/types';
import { fixture, pair } from './helpers';
import { attributeWitnesses } from './attribute-witnesses';

function experiment(attribute: AttributeKey, playerIndex: 0 | 1, offense: ActionCommand, defense: ActionCommand, measure: (state: GameState) => number, prepare: (state: GameState) => void = () => {}, trials = 256) {
  const means: number[] = [];
  for (const value of [20, 95]) {
    let total = 0;
    for (let seed = 1; seed <= trials; seed++) {
      const state = fixture(Math.imul(seed, 2654435761) >>> 0);
      prepare(state); state.players[playerIndex].attributes[attribute] = value;
      total += measure(pair(state, offense, defense));
    }
    means.push(total / trials);
  }
  return { low: means[0], high: means[1] };
}
const closeDefense = (state: GameState) => { state.players[1].position = { x: 7.5, y: 6.1 }; };
const stillDribble: ActionCommand = { actionId: 'Crossover', speed: 0 };
const hold: ActionCommand = { actionId: 'HoldPosition', speed: 0 };

test('BallHandling 증가 → 실제 드리블 평균 제어 성능 향상', () => {
  const result = experiment('BallHandling', 0, stillDribble, hold, state => state.players[0].ballControl);
  assert.ok(result.high > result.low + 5, JSON.stringify(result));
});
test('Steal 증가 → 적절한 근접 상황의 실제 스틸 빈도 향상', () => {
  const result = experiment('Steal', 1, { actionId: 'SpeedDribble', speed: 0 }, { actionId: 'StealAttempt', speed: 0 }, state => state.stats.steals.p2, state => {
    closeDefense(state); state.players[0].attributes.BallControl = 50; state.players[0].attributes.DribbleProtection = 45; state.players[0].attributes.Composure = 50;
  }, 512);
  assert.ok(result.high > result.low, JSON.stringify(result));
});
test('PerimeterDefense 증가 → 같은 경로에서 실제 돌파 저지 증가', () => {
  const result = experiment('PerimeterDefense', 1, { actionId: 'SpeedDribble', direction: { x: 0, y: -1 }, speed: 1 }, { actionId: 'CutOffDrivingLane', anticipatedDirection: { x: 0, y: -1 }, speed: 0 }, state => state.players[0].position.y, closeDefense);
  assert.ok(result.high > result.low, JSON.stringify(result));
});
test('LateralQuickness 증가 → 같은 경과시간의 방향 전환 대응 향상', () => {
  const result = experiment('LateralQuickness', 1, { actionId: 'ProtectBall' }, { actionId: 'CloseOut', direction: { x: 1, y: 0 }, speed: 1 }, state => {
    const start = state.events.find(event => event.type === 'action_start' && event.playerId === 'p2');
    assert.ok(Math.abs(state.time - Number(start?.data?.duration)) < 1e-5, 'LateralQuickness가 길이를 바꾸지 않는 수비 행동으로 경과 시간을 고정한다');
    return state.players[1].position.x;
  }, state => { state.players[1].velocity = { x: -1, y: 0 }; });
  assert.ok(result.high > result.low, JSON.stringify(result));
});
test('거리별 슈팅 능력 증가 → 동일 조건 실제 슛 성공률 향상', () => {
  for (const [attribute, y] of [['CloseShot', 3], ['MidRangeShot', 6], ['LongRangeShot', 9]] as [AttributeKey, number][]) {
    const result = experiment(attribute, 0, { actionId: 'StandingShot' }, hold, state => state.stats.madeShots.p1, state => { state.players[0].position = { x: 7.5, y }; state.ball.position = { ...state.players[0].position }; }, 512);
    assert.ok(result.high > result.low, `${attribute}: ${JSON.stringify(result)}`);
  }
});
test('ShotContest 증가 → 실제 피슛 성공률 감소', () => {
  const result = experiment('ShotContest', 1, { actionId: 'StandingShot' }, { actionId: 'ContestShot', speed: 0 }, state => state.stats.madeShots.p1, closeDefense, 512);
  assert.ok(result.high < result.low, JSON.stringify(result));
});
test('Endurance 증가 → 공격과 수비 양측 실제 에너지 비용 감소', () => {
  for (const index of [0, 1] as const) {
    const result = experiment('Endurance', index, { actionId: 'SpeedDribble', direction: { x: 0, y: 1 }, speed: 1 }, { actionId: 'DefensiveSlideRight', speed: 1 }, state => state.stats.staminaSpent[index === 0 ? 'p1' : 'p2']);
    assert.ok(result.high < result.low, JSON.stringify(result));
  }
});
test('Balance 증가 → 급격한 방향 전환 이후 실제 균형 회복 향상', () => {
  const result = experiment('Balance', 0, { actionId: 'Crossover', direction: { x: -1, y: 0 }, speed: 1 }, hold, state => state.players[0].bodyBalance, state => {
    state.players[0].bodyBalance = 35; state.players[0].velocity = { x: 3, y: 0 }; state.players[0].movementDirection = { x: 1, y: 0 };
  });
  assert.ok(result.high > result.low, JSON.stringify(result));
});
test('피로 감쇠는 연속적이며 양측 핵심 공식에 영향을 준다', () => {
  const state = fixture(), [a, d] = state.players;
  d.position = { x: 7.5, y: 6 }; d.actionState = 'ContestShot';
  const fresh = [performanceFactor(a), shotProbability(a, d, { actionId: 'JumpShot' }, state.config), dribbleControlScore(a, d, ACTIONS.Crossover), balanceRecovery(a)];
  a.stamina = 10; a.burstEnergy = 10; a.fatigue = 80;
  const tired = [performanceFactor(a), shotProbability(a, d, { actionId: 'JumpShot' }, state.config), dribbleControlScore(a, d, ACTIONS.Crossover), balanceRecovery(a)];
  fresh.forEach((value, i) => assert.ok(value > tired[i]));
  const stealFresh = stealProbability(a, d, 0.8, 10); d.stamina = 10; d.fatigue = 80;
  assert.ok(stealFresh > stealProbability(a, d, 0.8, 10));
  for (let stamina = 1; stamina <= 100; stamina++) {
    a.stamina = stamina; const current = performanceFactor(a); a.stamina = stamina - 1;
    assert.ok(Math.abs(current - performanceFactor(a)) < 0.01);
  }
});

test('30개 모든 능력치가 실제 시뮬레이션 상태 전이에서 관측 가능한 차이를 만든다', () => {
  const witnesses = attributeWitnesses();
  assert.deepEqual(ATTRIBUTE_KEYS.filter(key => !witnesses[key]), [], JSON.stringify(witnesses, null, 2));
});
