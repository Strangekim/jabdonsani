import { ACTIONS } from './actions';
import type { ActionCommand, ActionDefinition, ActionId, PlayerObservation } from './types';

/** 엔진과 기존 리플레이의 기술 목록은 유지하고 새 선택 화면만 간결하게 구성한다. */
export function compactActions(o: PlayerObservation): ActionDefinition[] {
  const me = o.players.find(p => p.playerId === o.playerId)!;
  const offense = o.playerId === o.offenseId;
  const legal = new Set(o.legalActions.map(a => a.id));
  let ids: ActionId[];
  if (o.ball.status === 'loose') ids = ['RecoverBall'];
  else if (o.ball.status === 'rebound') ids = ['Rebound'];
  else if (offense) {
    const finish: ActionId = legal.has('Layup') ? 'Layup' : 'Floater';
    ids = ['NormalDribble', 'Crossover', 'RetreatDribble', 'JumpShot', finish];
    if (!me.forcedPickup && (me.bodyBalance < 45 || me.stamina < 25)) ids.push('RecoverBalance');
  } else if (o.situation.kind === 'pickup') ids = ['ContestShot', 'BlockAttempt', 'CloseOut'];
  else if (o.situation.kind === 'advantage') ids = ['CloseOut', 'RetreatStep', 'ContestShot', 'CutOffDrivingLane'];
  else ids = ['HoldPosition', 'CutOffDrivingLane', 'ContestShot', 'StealAttempt'];
  const choices = ids.filter(id => legal.has(id)).map(id => ACTIONS[id]);
  // 특수 상태에서도 실행 가능한 선택 하나는 남긴다.
  return choices.length ? choices : o.legalActions.slice(0, 1);
}

export function usesLane(id: ActionId, o?: PlayerObservation): boolean {
  if (!['NormalDribble', 'Crossover', 'CutOffDrivingLane'].includes(id)) return false;
  if (!o) return true;
  const attacker = o.players.find(p => p.playerId === o.offenseId)!;
  // 림 높이에서는 좌우가 같은 진입 경로가 되므로 방향 조작 없이 골대로 접근한다.
  return Math.abs(o.config.hoop.y - attacker.position.y) > .25;
}

export function actionLabel(id: ActionId): string {
  return id === 'NormalDribble' ? '돌파' : id === 'RetreatDribble' ? '후퇴' : id === 'CloseOut' ? '추격 · 슛 압박' : ACTIONS[id].name;
}

/** 좌우는 두 선수 모두 화면의 같은 코트 방향이다. 세부 조작은 행동별 기본값으로 묶는다. */
export function compactCommand(o: PlayerObservation, actionId: ActionId, side: 'left' | 'right'): ActionCommand {
  const me = o.players.find(p => p.playerId === o.playerId)!;
  const offense = o.playerId === o.offenseId;
  const attacker = o.players.find(p => p.playerId === o.offenseId)!;
  const dx = o.config.hoop.x - attacker.position.x, dy = o.config.hoop.y - attacker.position.y;
  const distance = Math.hypot(dx, dy);
  // 골대 방향과 수직인 두 경로로 만들어 반대 예측이 같은 방향이 되지 않게 한다.
  // 수비도 공격자 기준의 같은 벡터를 쓰며, 화면 가로축 기준으로 좌우를 정한다.
  const toward = { x: distance ? dx / distance : 0, y: distance ? dy / distance : -1 };
  const tangent = { x: Math.abs(toward.y), y: -toward.x * Math.sign(toward.y) };
  const bias = usesLane(actionId, o) ? (side === 'left' ? -1.3 : 1.3) : 0;
  const lane = { x: toward.x + tangent.x * bias, y: toward.y + tangent.y * bias };
  const command: ActionCommand = { actionId, speed: actionId === 'NormalDribble' || actionId === 'CloseOut' ? .9 : .7 };
  if (offense && actionId !== 'Crossover') command.hand = me.ballHand;
  if (actionId === 'NormalDribble' || actionId === 'Crossover') command.direction = lane;
  if (!offense) {
    command.desiredGap = o.situation.kind === 'pickup' ? .9 : 1.4;
    if (actionId === 'CutOffDrivingLane') command.anticipatedDirection = lane;
  }
  // 후퇴와 슛은 방향을 전달하지 않아 엔진이 골대 기준으로 자동 처리한다.
  if (ACTIONS[actionId].category === 'shot') command.releaseTiming = 0;
  return command;
}
