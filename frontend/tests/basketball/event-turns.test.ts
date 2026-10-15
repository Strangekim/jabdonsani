import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, ACTION_LIST, chooseAIAction, createGame, getLegalActions, getObservation, queueActions, submitAction, validateAction } from '../../src/lib/basketball';
import { blockProbability, contestStrength, distance, movementSpeed, shotProbability } from '../../src/lib/basketball/formulas';
import type { ActionCommand } from '../../src/lib/basketball/types';
import { allAttributes, assertStateBounds, fixture, pair } from './helpers';

function pickedUp() {
  const state = fixture();
  state.players[0].forcedPickup = true;
  state.players[0].dribbleState = 'ended';
  state.players[0].dribblesUsed = 1;
  state.players[0].footworkState = 'gathered';
  state.ball.status = 'held';
  state.situation = { kind: 'pickup', advantage: 0, lastOutcome: '돌파 차단으로 강제 픽업' };
  return state;
}

test('공개 사건 상태는 체크볼 대면으로 시작하고 독립된 관측으로 전달된다', () => {
  const state = createGame();
  assert.equal(state.version, 2);
  assert.equal(state.situation.kind, 'face_up');
  assert.equal(state.situation.advantage, 0);
  assert.ok(state.situation.lastOutcome.length > 0);
  for (const player of state.players) {
    assert.equal(player.forcedPickup, false);
    assert.equal(player.beaten, 0);
  }
  for (const id of ['p1', 'p2'] as const) {
    const observation = getObservation(state, id);
    assert.deepEqual(observation.situation, state.situation);
    observation.situation.lastOutcome = '관측 변경';
    observation.situation.advantage = 1;
    assert.notEqual(state.situation.lastOutcome, '관측 변경');
    assert.equal(state.situation.advantage, 0);
  }
});

test('강제 픽업 후 공격자는 남은 드리블 예산과 관계없이 슛만 선택한다', () => {
  const state = pickedUp();
  const legal = getLegalActions(state, 'p1');
  assert.ok(legal.length > 0);
  assert.ok(legal.every(action => action.category === 'shot'));
  for (const action of ACTION_LIST) {
    const command: ActionCommand = { actionId: action.id };
    if (action.category !== 'shot') assert.equal(validateAction(state, 'p1', command).valid, false, action.id);
  }
  assert.equal(validateAction(state, 'p1', { actionId: 'JumpShot' }).valid, true);
  for (const difficulty of ['easy', 'normal', 'hard'] as const) {
    const selected = chooseAIAction(getObservation(state, 'p1'), difficulty);
    assert.ok(legal.some(action => action.id === selected.actionId), difficulty);
  }
  assertStateBounds(state);
});

test('강제 픽업 이후 불법 이동·재드리블 제출과 예약은 상태를 바꾸지 않는다', () => {
  const state = pickedUp();
  for (const actionId of ['NormalDribble', 'SpeedDribble', 'Walk', 'Sprint', 'Pivot', 'PumpFake'] as const) {
    const command = { actionId };
    const submitted = submitAction(state, 'p1', state.decisionId, command);
    assert.ok(submitted.error, actionId);
    assert.deepEqual(submitted.state, state, actionId);
    const queued = queueActions(state, 'p1', [command]);
    assert.ok(queued.error, actionId);
    assert.deepEqual(queued.state, state, actionId);
  }
});

test('제친 수비수의 컨테스트와 블록은 같은 위치의 정면 수비보다 약하다', () => {
  const state = fixture();
  const [attacker, defender] = state.players;
  attacker.position = { x: 7.5, y: 6 };
  defender.position = { x: 7.5, y: 5.2 };
  defender.actionState = 'BlockAttempt';
  defender.recoveryTime = 0;
  defender.reactionDelay = 0.1;
  const command: ActionCommand = { actionId: 'JumpShot' };
  const faceUp = {
    contest: contestStrength(attacker, defender, command, state.config),
    block: blockProbability(attacker, defender, command, state.config),
    shot: shotProbability(attacker, defender, command, state.config),
  };
  defender.beaten = 0.9;
  const trailing = {
    contest: contestStrength(attacker, defender, command, state.config),
    block: blockProbability(attacker, defender, command, state.config),
    shot: shotProbability(attacker, defender, command, state.config),
  };
  assert.ok(trailing.contest < faceUp.contest * 0.6, JSON.stringify({ faceUp, trailing }));
  assert.ok(trailing.block < faceUp.block * 0.6, JSON.stringify({ faceUp, trailing }));
  assert.ok(trailing.shot > faceUp.shot, JSON.stringify({ faceUp, trailing }));
});

test('공개 관측은 상대 큐와 미래 난수 변경에도 같고 세 AI 난이도 선택도 같다', () => {
  const state = fixture();
  const before = getObservation(state, 'p2');
  const hidden = queueActions(state, 'p1', [{ actionId: 'Crossover' }]);
  assert.equal(hidden.error, undefined);
  hidden.state.rngState = 0xffffffff;
  hidden.state.seed = 873;
  const after = getObservation(hidden.state, 'p2');
  assert.deepEqual(after, before);
  for (const difficulty of ['easy', 'normal', 'hard'] as const) {
    assert.deepEqual(chooseAIAction(after, difficulty), chooseAIAction(before, difficulty));
  }
});

const rightDrive: ActionCommand = { actionId: 'SpeedDribble', direction: { x: 1, y: 0 }, speed: 1 };
function driveFixture(seed: number) {
  const state = fixture(Math.imul(seed, 2654435761) >>> 0);
  state.players.forEach(player => { player.attributes = allAttributes(70); });
  state.players[0].position = { x: 7.5, y: 8.5 };
  state.players[1].position = { x: 7.5, y: 7.2 };
  state.ball.position = { ...state.players[0].position };
  return state;
}
function prediction(x: number): ActionCommand {
  return { actionId: 'AnticipateDirection', anticipatedDirection: { x, y: 0 }, speed: 0 };
}
function successfulWrongGuess() {
  for (let seed = 1; seed <= 100; seed++) {
    const state = pair(driveFixture(seed), rightDrive, prediction(-1));
    if (state.situation.kind === 'advantage' && state.ball.ownerId === 'p1') return state;
  }
  throw new Error('고정 시드 표본에서 반대 예측을 제치는 돌파가 있어야 한다');
}

test('같은 능력치에서 방향을 맞힌 수비가 더 잘 막지만 결과는 확률적이다', () => {
  const outcomes = { matching: { stops: 0, advances: 0 }, opposite: { stops: 0, advances: 0 } };
  for (let seed = 1; seed <= 256; seed++) {
    for (const [label, x] of [['matching', 1], ['opposite', -1]] as const) {
      const state = pair(driveFixture(seed), rightDrive, prediction(x));
      if (state.events.some(event => event.type === 'lane_blocked')) outcomes[label].stops++;
      if (state.events.some(event => event.type === 'drive_advantage')) outcomes[label].advances++;
      assert.equal(state.stats.totalDribbles, 1);
      assertStateBounds(state);
    }
  }
  assert.ok(outcomes.matching.stops > outcomes.opposite.stops + 100, JSON.stringify(outcomes));
  assert.ok(outcomes.matching.advances > 0, '맞힌 예측도 돌파를 완전히 보장해 막지는 않는다');
  assert.ok(outcomes.opposite.stops > 0, '틀린 예측도 경합 결과를 확정하지 않는다');
  assert.ok(outcomes.opposite.advances > outcomes.matching.advances, JSON.stringify(outcomes));
});

test('실제 돌파 차단은 강제 픽업·루즈볼·탈취로 나뉘고 새 공격 상태도 초기화한다', () => {
  const observed = new Set<string>();
  for (let seed = 1; seed <= 256 && observed.size < 3; seed++) {
    const before = driveFixture(seed);
    const after = pair(before, rightDrive, prediction(1));
    if (!after.events.some(event => event.type === 'lane_blocked')) continue;
    assert.equal(after.stats.totalDribbles, 1);
    assert.ok(after.stats.staminaSpent.p1 > 0 && after.stats.staminaSpent.p2 > 0);
    if (after.offenseId === 'p2') {
      observed.add('turnover');
      assert.equal(after.stats.steals.p2, 1);
      assert.equal(after.stats.stealAttempts.p2, 1);
      assert.equal(after.stats.turnovers.p1, 1);
      assert.equal(after.possession, before.possession + 1);
      assert.equal(after.situation.kind, 'face_up');
      assert.equal(after.situation.advantage, 0);
      for (const player of after.players) {
        assert.equal(player.forcedPickup, false);
        assert.equal(player.beaten, 0);
        assert.equal(player.dribblesUsed, 0);
      }
      continue;
    }
    assert.equal(after.stats.steals.p2, 0);
    assert.equal(after.possession, before.possession);
    assert.equal(after.players[0].dribblesUsed, 1);
    if (after.situation.kind === 'pickup') {
      observed.add('pickup');
      assert.equal(after.players[0].forcedPickup, true);
      assert.equal(after.players[0].dribbleState, 'ended');
      assert.equal(after.ball.ownerId, 'p1');
      assert.ok(getLegalActions(after, 'p1').every(action => action.category === 'shot'));
    } else {
      observed.add('loose');
      assert.equal(after.situation.kind, 'loose_ball');
      assert.equal(after.ball.ownerId, null);
      for (const id of ['p1', 'p2'] as const) assert.ok(getLegalActions(after, id).some(action => action.id === 'RecoverBall'));
    }
  }
  assert.deepEqual([...observed].sort(), ['loose', 'pickup', 'turnover']);
});

test('수비 능력치가 높으면 같은 예측의 돌파 저지율이 높아진다', () => {
  const stops: number[] = [];
  for (const skill of [20, 95]) {
    let stopped = 0;
    for (let seed = 1; seed <= 256; seed++) {
      const before = driveFixture(seed);
      before.players[1].attributes = allAttributes(skill);
      const after = pair(before, rightDrive, prediction(1));
      if (after.events.some(event => event.type === 'lane_blocked')) stopped++;
    }
    stops.push(stopped);
  }
  assert.ok(stops[1] > stops[0] + 50, JSON.stringify(stops));
});

test('반대 예측을 제친 우측 돌파는 중거리에서 오픈 슛과 추가 돌파를 남긴다', () => {
  const state = successfulWrongGuess();
  const attacker = state.players[0], defender = state.players[1];
  const hoopDistance = distance(attacker.position, state.config.hoop);
  assert.ok(hoopDistance > 3.4 && hoopDistance < state.config.arcRadius, String(hoopDistance));
  assert.ok(attacker.position.x > 7.5);
  assert.ok(attacker.position.y < 8.5);
  assert.equal(attacker.dribblesUsed, 1);
  assert.equal(attacker.forcedPickup, false);
  assert.equal(attacker.dribbleState, 'live');
  assert.ok(defender.beaten > 0.45);
  assert.equal(state.situation.advantage, defender.beaten);
  assert.ok((defender.position.x - attacker.position.x) * (state.config.hoop.x - attacker.position.x)
    + (defender.position.y - attacker.position.y) * (state.config.hoop.y - attacker.position.y) < 0, '수비가 공격자 뒤에 남는다');
  const legal = getLegalActions(state, 'p1');
  assert.ok(legal.some(action => action.id === 'JumpShot'));
  assert.ok(legal.some(action => action.id === 'SpeedDribble'));
  assert.deepEqual(getObservation(state, 'p2').situation, state.situation);
});

test('돌파로 얻은 우위가 다음 슛의 실제 컨테스트와 성공 확률에 반영된다', () => {
  const advantage = successfulWrongGuess();
  const recovered = structuredClone(advantage);
  recovered.players[1].beaten = 0;
  recovered.players[1].recoveryTime = 0;
  recovered.players[1].reactionDelay = 0;
  const toHoop = {
    x: recovered.config.hoop.x - recovered.players[0].position.x,
    y: recovered.config.hoop.y - recovered.players[0].position.y,
  };
  const hoopDistance = Math.hypot(toHoop.x, toHoop.y);
  recovered.players[1].position = {
    x: recovered.players[0].position.x + toHoop.x / hoopDistance * 0.8,
    y: recovered.players[0].position.y + toHoop.y / hoopDistance * 0.8,
  };
  recovered.situation = { kind: 'contested', advantage: 0, lastOutcome: '비교용 정면 수비 복귀' };
  const shot: ActionCommand = { actionId: 'JumpShot', releaseTiming: 0 };
  const defense: ActionCommand = { actionId: 'BlockAttempt', speed: 0 };
  const open = pair(advantage, shot, defense);
  const guarded = pair(recovered, shot, defense);
  const openShot = open.events.find(event => event.type === 'shot' && event.decisionId === advantage.decisionId);
  const guardedShot = guarded.events.find(event => event.type === 'shot' && event.decisionId === advantage.decisionId);
  assert.ok(openShot && guardedShot);
  assert.ok(Number(openShot.data?.probability) > Number(guardedShot.data?.probability));
  assert.ok(Number(openShot.data?.blockProbability) <= Number(guardedShot.data?.blockProbability));
  assert.equal(open.stats.totalDribbles, 1, '슛은 우위나 남은 드리블을 다시 소비하지 않는다');
});

test('추가 돌파는 골밑 진입 또는 수비 복귀를 만들고 남은 드리블을 소비한다', () => {
  const observed = new Set<string>();
  for (let seed = 1; seed <= 256 && observed.size < 2; seed++) {
    const first = pair(driveFixture(seed), rightDrive, prediction(-1));
    if (first.situation.kind !== 'advantage') continue;
    const beforeDistance = distance(first.players[0].position, first.config.hoop);
    const second = pair(first, { actionId: 'NormalDribble', direction: { x: 0, y: -1 }, speed: 1 }, { actionId: 'Sprint', anticipatedDirection: { x: 0, y: -1 }, speed: 1 });
    assert.equal(second.stats.totalDribbles, 2);
    const newEvents = second.events.filter(event => event.decisionId === first.decisionId);
    if (newEvents.some(event => event.type === 'lane_blocked')) observed.add('recovery');
    if (second.possession !== first.possession) {
      assert.equal(second.offenseId, 'p2');
      assert.equal(second.players[1].dribblesUsed, 0);
      continue;
    }
    assert.equal(second.players[0].dribblesUsed, 2);
    assert.ok(distance(second.players[0].position, second.config.hoop) < beforeDistance);
    if (newEvents.some(event => event.type === 'drive_advantage')) {
      observed.add('rim');
      assert.ok(distance(second.players[0].position, second.config.hoop) <= 3.4);
      assert.equal(validateAction(second, 'p1', { actionId: 'Layup' }).valid, true);
    }
    assertStateBounds(second);
  }
  assert.deepEqual([...observed].sort(), ['recovery', 'rim']);
});

test('멀리 떨어진 공은 가만히 있는 선수에게 순간 회수되지 않는다', () => {
  const state = fixture();
  state.players[0].ballPossession = false;
  state.players[0].position = { x: 1, y: 12 };
  state.players[1].position = { x: 14, y: 12 };
  state.ball = { status: 'loose', ownerId: null, lastTouchId: 'p1', position: { x: 7.5, y: 1.2 } };
  state.situation = { kind: 'loose_ball', advantage: 0, lastOutcome: '공 회수 경합' };
  const after = pair(state, { actionId: 'RecoverBall', speed: 0 }, { actionId: 'RecoverBall', speed: 0 });
  assert.equal(after.ball.ownerId, null);
  assert.equal(after.situation.kind, 'loose_ball');
  assert.equal(after.possession, state.possession);
  assert.ok(!after.events.some(event => event.type === 'ball_recovered'));
  assert.ok(getLegalActions(after, 'p1').some(action => action.id === 'RecoverBall'));
});

test('돌파 차단으로 강제 픽업되면 예약한 다음 드리블은 재검증해 취소된다', () => {
  let checked = false;
  for (let seed = 1; seed <= 100 && !checked; seed++) {
    const queued = queueActions(driveFixture(seed), 'p1', [{ actionId: 'Crossover' }]);
    assert.equal(queued.error, undefined);
    const state = pair(queued.state, rightDrive, prediction(1));
    if (state.situation.kind !== 'pickup') continue;
    checked = true;
    assert.equal(state.stats.totalDribbles, 1);
    assert.equal(state.players[0].dribblesUsed, 1);
    assert.deepEqual(state.queues.p1, []);
    assert.ok(!state.submissions.p1);
    assert.ok(state.events.some(event => event.type === 'queue_cancelled' && event.playerId === 'p1'));
  }
  assert.ok(checked);
});

test('돌파 우위는 다음 정비 행동 뒤에도 남고 수비 회복량만큼 줄어든다', () => {
  const before = successfulWrongGuess();
  const after = pair(before, { actionId: 'RecoverBalance' }, { actionId: 'RecoverBalance' });
  assert.equal(after.possession, before.possession);
  assert.equal(after.situation.kind, 'advantage');
  assert.ok(after.players[1].beaten > 0.2);
  assert.ok(after.players[1].beaten < before.players[1].beaten);
  assert.equal(after.situation.advantage, after.players[1].beaten);
  assert.equal(after.players[0].dribblesUsed, 1);
});

test('6m 떨어진 수비는 예측을 맞혀도 순간이동하거나 닿지 않는 돌파를 막지 못한다', () => {
  for (let seed = 1; seed <= 64; seed++) {
    const before = driveFixture(seed);
    before.players[1].position = { x: 1.5, y: 8.5 };
    const after = pair(before, rightDrive, { ...prediction(1), speed: 1 });
    assert.ok(!after.events.some(event => event.type === 'lane_blocked'));
    assert.equal(after.players[0].forcedPickup, false);
    assert.equal(after.possession, before.possession);
    const maximumTravel = movementSpeed(before.players[1], ACTIONS.AnticipateDirection) * (after.time - before.time);
    assert.ok(distance(after.players[1].position, before.players[1].position) <= maximumTravel + 1e-6);
    assert.ok(distance(after.players[0].position, after.players[1].position) > 4);
  }
});

test('후퇴 드리블은 멀리 정지한 수비를 자동으로 가까이 끌어오지 않는다', () => {
  for (let seed = 1; seed <= 32; seed++) {
    const before = fixture(seed);
    const initialGap = distance(before.players[0].position, before.players[1].position);
    const after = pair(before, { actionId: 'RetreatDribble', direction: { x: 0, y: 1 }, speed: 1 }, { actionId: 'HoldPosition', speed: 0 });
    assert.deepEqual(after.players[1].position, before.players[1].position);
    assert.ok(distance(after.players[0].position, after.players[1].position) > initialGap);
    assert.equal(after.players[0].forcedPickup, false);
    assert.ok(!after.events.some(event => event.type === 'lane_blocked'));
  }
});

test('정지 상태에서 속도 0인 드리블은 위치 이동이나 돌파 우위를 만들지 않는다', () => {
  for (const actionId of ['NormalDribble', 'SpeedDribble', 'ProtectedDribble', 'Crossover'] as const) {
    const before = fixture(73);
    const after = pair(before, { actionId, direction: { x: 1, y: 0 }, speed: 0 }, { actionId: 'HoldPosition', speed: 0 });
    for (const index of [0, 1] as const) assert.deepEqual(after.players[index].position, before.players[index].position, actionId);
    assert.ok(!after.events.some(event => event.type === 'drive_advantage'), actionId);
    assert.equal(after.stats.totalDribbles, 1, actionId);
  }
});

test('스피드·보호 드리블의 이동 프로필과 선택한 속도가 실제 도착 거리를 바꾼다', () => {
  let compared = 0;
  for (let seed = 1; seed <= 32; seed++) {
    const before = fixture(seed);
    const fast = pair(before, { actionId: 'SpeedDribble', direction: { x: 1, y: 0 }, speed: 1 });
    const protectedMove = pair(before, { actionId: 'ProtectedDribble', direction: { x: 1, y: 0 }, speed: 1 });
    const slow = pair(before, { actionId: 'SpeedDribble', direction: { x: 1, y: 0 }, speed: 0.2 });
    if ([fast, protectedMove, slow].some(state => state.ball.ownerId !== 'p1')) continue;
    compared++;
    const fastDistance = distance(before.players[0].position, fast.players[0].position);
    assert.ok(fastDistance > distance(before.players[0].position, protectedMove.players[0].position) * 1.4);
    assert.ok(fastDistance > distance(before.players[0].position, slow.players[0].position) * 2);
    assert.ok(fast.stats.staminaSpent.p1 > protectedMove.stats.staminaSpent.p1);
  }
  assert.ok(compared >= 24);
});
