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
/** 규칙/공식 실험은 중간 결정점마다 같은 동작을 계속해 최초 두 동작의 실행을 끝낸다. */
export function pair(state: GameState, offense: ActionCommand, defense: ActionCommand = { actionId: 'HoldPosition', speed: 0 }, defenseFirst = false): GameState {
  const originalPossession = state.possession;
  const originalActions: Record<PlayerId, ActionCommand> = state.offenseId === 'p1' ? { p1: offense, p2: defense } : { p1: defense, p2: offense };
  let next = decisionPair(state, offense, defense, defenseFirst);
  const remaining = new Set<PlayerId>((['p1', 'p2'] as PlayerId[]).filter(id => next.ongoingActions[id]?.command.actionId === originalActions[id].actionId));
  for (let turn = 0; remaining.size && next.status === 'playing' && next.possession === originalPossession; turn++) {
    assert.ok(turn < 200, '처음 선택한 동작의 계속 실행이 종료되어야 한다');
    const continuation = (id: PlayerId): ActionCommand => next.ongoingActions[id] ? { actionId: 'ContinueAction' } : { actionId: 'RecoverBalance' };
    next = decisionPair(next, continuation(next.offenseId), continuation(next.offenseId === 'p1' ? 'p2' : 'p1'), defenseFirst);
    for (const id of remaining) if (!next.ongoingActions[id] || next.ongoingActions[id]?.command.actionId !== originalActions[id].actionId) remaining.delete(id);
  }
  return next;
}
export function assertStateBounds(state: GameState) {
  assert.ok(Number.isFinite(state.time) && state.time >= 0);
  assert.ok(Number.isFinite(state.shotClock) && state.shotClock >= -1e-8);
  for (const player of state.players) {
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
