import assert from 'node:assert/strict';
import { createGame, submitAction } from '../../src/lib/basketball/engine';
import { ATTRIBUTE_KEYS } from '../../src/lib/basketball/config';
import type { ActionCommand, Attributes, GameState, PlayerId } from '../../src/lib/basketball/types';

export const allAttributes = (value: number): Attributes => Object.fromEntries(ATTRIBUTE_KEYS.map(key => [key, value])) as Attributes;
/** 규칙 경계 검사를 위한 테스트 전용 상태. 제품 UI에서는 직접 상태 변경을 하지 않는다. */
export function fixture(seed = 123): GameState {
  const state = createGame({}, seed, [{ name: '공격 검증', attributes: allAttributes(90) }, { name: '수비 검증', attributes: allAttributes(60) }]);
  state.players[0].position = { x: 7.5, y: 7 };
  state.players[1].position = { x: 2, y: 3 };
  state.ball.position = { ...state.players[0].position };
  return state;
}
export function decisionPair(state: GameState, offense: ActionCommand, defense: ActionCommand = { actionId: 'HoldPosition', speed: 0 }, defenseFirst = false): GameState {
  const offenseId = state.offenseId, defenseId: PlayerId = offenseId === 'p1' ? 'p2' : 'p1';
  const firstId = defenseFirst ? defenseId : offenseId;
  const firstCommand = defenseFirst ? defense : offense;
  const secondId = defenseFirst ? offenseId : defenseId;
  const secondCommand = defenseFirst ? offense : defense;
  let next = state;
  let resolved = false;
  for (const [id, command] of [[firstId, firstCommand], [secondId, secondCommand]] as [PlayerId, ActionCommand][]) {
    if (next.decisionId !== state.decisionId) break;
    if (next.submissions[id]) continue;
    const result = submitAction(next, id, state.decisionId, command);
    assert.equal(result.error, undefined, `명령 ${command.actionId}: ${result.error}`);
    next = result.state; resolved ||= !!result.resolved;
  }
  assert.ok(resolved || next.decisionId > state.decisionId);
  return next;
}
/** 하나의 제출 쌍은 공격·수비 상호작용 전체를 해결하는 사건 턴이다. */
export function pair(state: GameState, offense: ActionCommand, defense: ActionCommand = { actionId: 'HoldPosition', speed: 0 }, defenseFirst = false): GameState {
  const next = decisionPair(state, offense, defense, defenseFirst);
  assert.deepEqual(next.ongoingActions, {}, '사건 사이에 미완료 행동을 남기지 않는다');
  assert.equal(next.history.length, state.history.length + 1, '하나의 상호작용에 한 번만 명령을 기록한다');
  assert.equal(next.stats.totalDecisions, state.stats.totalDecisions + 1);
  return next;
}
export function assertStateBounds(state: GameState) {
  assert.ok(Number.isFinite(state.time) && state.time >= 0);
  assert.ok(Number.isFinite(state.shotClock) && state.shotClock >= -1e-8);
  assert.ok(['face_up', 'advantage', 'pickup', 'contested', 'loose_ball', 'rebound'].includes(state.situation.kind));
  assert.ok(Number.isFinite(state.situation.advantage) && state.situation.advantage >= 0 && state.situation.advantage <= 1);
  assert.equal(typeof state.situation.lastOutcome, 'string');
  for (const player of state.players) {
    assert.equal(typeof player.forcedPickup, 'boolean');
    assert.ok(Number.isFinite(player.beaten) && player.beaten >= 0 && player.beaten <= 1);
    for (const key of ['stamina', 'burstEnergy', 'fatigue', 'bodyBalance', 'ballControl'] as const) {
      assert.ok(Number.isFinite(player[key]), `${key} 유한성`);
      assert.ok(player[key] >= -1e-8 && player[key] <= 100 + 1e-8, `${key} 범위: ${player[key]}`);
    }
    assert.ok(player.dribblesUsed >= 0 && player.dribblesUsed <= state.config.maxDribbles);
    assert.ok(player.position.x >= 0 && player.position.x <= state.config.courtWidth);
    assert.ok(player.position.y >= 0 && player.position.y <= state.config.courtLength);
    assert.ok(Number.isFinite(player.velocity.x) && Number.isFinite(player.velocity.y));
  }
}
