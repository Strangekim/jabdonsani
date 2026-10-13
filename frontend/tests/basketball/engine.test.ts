import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, ACTION_LIST, ATTRIBUTE_KEYS, createGame, submitAction, getObservation, getLegalActions, validateAction, queueActions, cancelQueue, chooseAIAction, runAIDecision, exportReplay, replayGame } from '../../src/lib/basketball';
import type { ActionCommand, ActionId, GameState } from '../../src/lib/basketball/types';
import { allAttributes, assertStateBounds, fixture, pair, decisionPair } from './helpers';

const dribble = (actionId: ActionId = 'NormalDribble'): ActionCommand => ({ actionId, direction: { x: 0, y: 1 }, speed: 0 });

test('기본 규칙: 하프코트, 12초, 드리블 3회, 11점, 체크볼', () => {
  const state = createGame();
  assert.equal(state.config.shotClock, 12);
  assert.equal(state.config.maxDribbles, 3);
  assert.equal(state.config.targetScore, 11);
  assert.equal(state.status, 'playing');
  assert.equal(state.ball.ownerId, state.offenseId);
  assert.ok(state.events.some(event => event.type === 'check_ball'));
  assertStateBounds(state);
});
test('명세 30개 능력치와 공격·수비 행동 전체가 정의된다', () => {
  assert.equal(ATTRIBUTE_KEYS.length, 30);
  const required = ['NormalDribble','SpeedDribble','ProtectedDribble','Crossover','BetweenTheLegs','BehindTheBack','Hesitation','InAndOut','SpinMove','RetreatDribble','Walk','Sprint','Stop','ProtectBall','JabStep','Pivot','StepBack','SideStep','PumpFake','Gather','Layup','Floater','JumpShot','Dunk','StandingShot','PullUpJumper','StepBackShot','ReverseLayup','HoldPosition','DefensiveSlideLeft','DefensiveSlideRight','RetreatStep','ForwardStep','CloseOut','CutOffDrivingLane','ShadeLeft','ShadeRight','AnticipateDirection','StealAttempt','ReachIn','BodyUp','ContestShot','JumpContest','BlockAttempt','RecoverBalance'];
  for (const id of required) assert.ok(ACTION_LIST.some(action => action.id === id), id);
  for (const action of ACTION_LIST) {
    assert.ok(action.duration > 0 && action.primaryAttributes.length > 0, action.id);
    assert.ok(action.secondaryAttributes.length > 0 && action.opposingAttributes.length > 0, action.id);
    assert.ok(action.interruptWindows.length > 0, action.id);
  }
});
test('첫 제출은 시간·난수·선수·결과를 진행시키지 않는다', () => {
  const state = fixture();
  const result = submitAction(state, 'p1', state.decisionId, dribble());
  assert.equal(result.error, undefined);
  assert.equal(result.resolved, false);
  for (const key of ['time', 'rngState', 'shotClock', 'decisionId', 'players', 'events', 'stats']) assert.deepEqual(result.state[key as keyof GameState], state[key as keyof GameState], key);
  assert.deepEqual(state.submissions, {}, '입력 상태를 변경하지 않는다');
});
test('양측 제출 순서가 최종 상태와 이벤트에 영향을 주지 않는다', () => {
  const state = fixture();
  const comparable = (value: GameState) => ({ ...value, operations: [] });
  assert.deepEqual(comparable(pair(state, dribble('Crossover'), { actionId: 'ShadeRight' })), comparable(pair(state, dribble('Crossover'), { actionId: 'ShadeRight' }, true)));
});
test('중복 제출과 이전 결정점 명령은 상태를 변경하지 않고 거부된다', () => {
  const state = fixture();
  const submitted = submitAction(state, 'p1', state.decisionId, dribble()).state;
  const duplicate = submitAction(submitted, 'p1', state.decisionId, { actionId: 'JumpShot' });
  assert.ok(duplicate.error); assert.deepEqual(duplicate.state, submitted);
  const after = pair(state, dribble());
  const stale = submitAction(after, 'p1', state.decisionId, dribble());
  assert.ok(stale.error); assert.deepEqual(stale.state, after);
});
test('공개 관측과 AI 선택은 상대 숨겨진 명령·큐·난수에 독립이다', () => {
  const state = fixture();
  const before = getObservation(state, 'p2');
  const submitted = submitAction(state, 'p1', state.decisionId, { actionId: 'JumpShot' }).state;
  const after = getObservation(submitted, 'p2');
  assert.deepEqual(after, before);
  for (const key of ['submissions', 'queues', 'rngState', 'seed', 'history']) assert.ok(!(key in after), key);
  for (const difficulty of ['easy', 'normal', 'hard'] as const) assert.deepEqual(chooseAIAction(after, difficulty), chooseAIAction(before, difficulty));
  after.players[0].stamina = 0;
  assert.notEqual(submitted.players[0].stamina, 0, '관측은 엔진 상태 참조를 누출하지 않는다');
});
test('0회에서 첫 드리블은 시작 이벤트와 횟수 1을 만든다', () => {
  const state = pair(fixture(), dribble());
  assert.equal(state.stats.totalDribbles, 1);
  assert.equal(state.players[0].dribblesUsed, 1);
  assert.ok(state.events.some(event => event.type === 'dribble'));
});
test('2회에서 마지막 드리블은 허용되고 네 번째는 거부된다', () => {
  const state = fixture(); state.players[0].dribblesUsed = 2; state.players[0].dribbleState = 'live';
  const after = pair(state, dribble());
  assert.equal(after.players[0].dribblesUsed, 3);
  assert.equal(validateAction(after, 'p1', dribble()).valid, false);
  assert.ok(!getLegalActions(after, 'p1').some(action => action.category === 'dribble'));
});
test('검증 실패와 시작 전 큐 취소는 드리블 횟수를 소모하지 않는다', () => {
  const state = fixture();
  const invalid = submitAction(state, 'p2', state.decisionId, dribble());
  assert.ok(invalid.error); assert.deepEqual(invalid.state, state);
  const queued = queueActions(state, 'p1', [dribble('Hesitation'), dribble('Crossover')]);
  assert.equal(queued.error, undefined); assert.equal(queued.state.players[0].dribblesUsed, 0);
  const cancelled = cancelQueue(queued.state, 'p1');
  assert.equal(cancelled.state.players[0].dribblesUsed, 0);
  assert.equal(cancelled.state.queues.p1.length, 0);
});
test('복합 명령의 각 드리블 단위가 계산되며 4단위는 거부된다', () => {
  const state = fixture();
  const valid = { ...dribble('Hesitation'), combo: ['Crossover', 'BehindTheBack'] as ActionId[] };
  assert.equal(validateAction(state, 'p1', valid).valid, true);
  const after = pair(state, valid);
  assert.equal(after.stats.totalDribbles, 3);
  assert.equal(after.players[0].dribblesUsed, 3);
  assert.equal(validateAction(state, 'p1', { ...valid, combo: [...valid.combo, 'SpinMove'] }).valid, false);
});
test('예약 행동 전체 및 복합 행동을 합산해 3회 초과를 거부한다', () => {
  const state = fixture();
  assert.ok(queueActions(state, 'p1', [dribble(), dribble(), dribble(), dribble()]).error);
  assert.ok(queueActions(state, 'p1', [{ ...dribble(), combo: ['Crossover', 'SpinMove'] }, dribble()]).error);
  const limited = fixture(); limited.players[0].dribblesUsed = 2;
  assert.ok(queueActions(limited, 'p1', [dribble(), dribble()]).error);
});
test('개더 이후 남은 횟수와 관계없이 재드리블은 거부된다', () => {
  const state = fixture(); state.players[0].dribbleState = 'live'; state.players[0].dribblesUsed = 1;
  const after = pair(state, { actionId: 'Gather' });
  assert.equal(after.players[0].dribbleState, 'ended');
  assert.equal(after.players[0].dribblesUsed, 1);
  assert.equal(validateAction(after, 'p1', dribble()).valid, false);
});
test('피벗·잽스텝·슛 페이크는 드리블 단위를 소비하지 않는다', () => {
  for (const actionId of ['Pivot', 'JabStep', 'PumpFake'] as ActionId[]) {
    const after = pair(fixture(), { actionId });
    assert.equal(after.players[0].dribblesUsed, 0, actionId);
    assert.equal(after.stats.totalDribbles, 0, actionId);
  }
});
test('공을 잡은 초기 무단 이동과 개더 이후 세 번째 스텝은 거부된다', () => {
  const state = fixture();
  assert.equal(validateAction(state, 'p1', { actionId: 'Sprint' }).valid, false);
  state.players[0].dribbleState = 'ended'; state.players[0].footworkState = 'gathered'; state.players[0].gatheredSteps = 2;
  assert.equal(validateAction(state, 'p1', { actionId: 'Walk' }).valid, false);
  assert.equal(validateAction(state, 'p1', { actionId: 'SideStep' }).valid, false);
});
test('같은 공격자의 루즈볼 회수는 포제션과 드리블 카운트를 유지한다', () => {
  const state = fixture(); state.players[0].dribblesUsed = 2; state.players[0].dribbleState = 'live'; state.players[0].ballPossession = false;
  state.ball = { status: 'loose', ownerId: null, position: { ...state.players[0].position }, lastTouchId: 'p1' };
  const after = pair(state, { actionId: 'RecoverBall' }, { actionId: 'RecoverBall', speed: 0 });
  assert.equal(after.ball.ownerId, 'p1'); assert.equal(after.possession, state.possession); assert.equal(after.players[0].dribblesUsed, 2);
});
test('드리블 중 스틸은 시작된 횟수 기록 후 공격권을 바꾼다', () => {
  let found = false;
  for (let seed = 1; seed <= 500 && !found; seed += 1) {
    const state = fixture(seed); state.players[0].attributes = allAttributes(10); state.players[1].attributes = allAttributes(100);
    state.players[1].position = { x: 7.8, y: 7 }; state.players[0].ballControl = 30;
    const after = pair(state, dribble('SpeedDribble'), { actionId: 'StealAttempt', speed: 0 });
    if (after.events.some(event => event.type === 'steal')) {
      found = true; assert.equal(after.stats.totalDribbles, 1); assert.equal(after.offenseId, 'p2'); assert.equal(after.players[1].dribblesUsed, 0);
      const started = after.events.findIndex(event => event.type === 'dribble');
      const stolen = after.events.findIndex(event => event.type === 'steal');
      assert.ok(started >= 0 && stolen > started);
    }
  }
  assert.ok(found, '500개 고정 시드의 적절한 스틸 상황에서 실제 스틸 관측');
});
test('공격 제한시간이 소진되면 턴오버와 체크볼로 역할을 교체한다', () => {
  const state = fixture(); state.shotClock = 0.1; state.players[0].dribblesUsed = 3;
  const after = pair(state, { actionId: 'ProtectBall' });
  assert.equal(after.offenseId, 'p2'); assert.equal(after.shotClock, after.config.shotClock);
  assert.equal(after.players[1].dribblesUsed, 0);
  assert.ok(after.events.some(event => event.type === 'shot_clock'));
});
test('슛 거리 선행 조건과 아크 2점 규칙이 작동한다', () => {
  const far = fixture(); far.players[0].position = { x: 7.5, y: 10 }; far.ball.position = { ...far.players[0].position };
  assert.equal(validateAction(far, 'p1', { actionId: 'Dunk' }).valid, false);
  assert.equal(validateAction(far, 'p1', { actionId: 'Layup' }).valid, false);
  let observed = false;
  for (let seed = 1; seed <= 50 && !observed; seed += 1) {
    far.seed = seed; far.rngState = seed;
    const after = pair(far, { actionId: 'StandingShot', releaseTiming: 0 });
    if (after.score.p1 > 0) { observed = true; assert.equal(after.score.p1, 2); assert.equal(after.offenseId, 'p2'); }
  }
  assert.ok(observed);
});
test('양측 역할 모두 체력을 소모하고 유한 상태 범위를 지킨다', () => {
  const state = fixture();
  const after = pair(state, { actionId: 'SpeedDribble', direction: { x: 1, y: -1 }, speed: 1 }, { actionId: 'DefensiveSlideRight', speed: 1 });
  assert.ok(after.stats.staminaSpent.p1 > 0); assert.ok(after.stats.staminaSpent.p2 > 0);
  assert.ok(after.players[0].stamina < state.players[0].stamina); assert.ok(after.players[1].stamina < state.players[1].stamina);
  assertStateBounds(after);
});
test('수비만 직접 조작하는 흐름에서도 AI와 같은 검증을 거쳐 경기가 끝난다', () => {
  let state = createGame({ targetScore: 3 }, 887);
  let turns = 0;
  while (state.status !== 'finished' && turns++ < 1000) {
    const offense = chooseAIAction(getObservation(state, state.offenseId));
    const defenseId = state.offenseId === 'p1' ? 'p2' : 'p1';
    const defense = chooseAIAction(getObservation(state, defenseId));
    assert.equal(validateAction(state, state.offenseId, offense).valid, true);
    assert.equal(validateAction(state, defenseId, defense).valid, true);
    state = pair(state, offense, defense, true); assertStateBounds(state);
  }
  assert.equal(state.status, 'finished'); assert.ok(state.winner); assert.ok(turns > 0);
});
test('재생은 기록된 명령을 다시 실행해 상태와 이벤트를 정확히 재현한다', () => {
  let original = createGame({ targetScore: 3 }, 999);
  for (let turn = 0; turn < 1000 && original.status !== 'finished'; turn++) original = runAIDecision(original);
  assert.equal(original.status, 'finished');
  const data = exportReplay(original);
  assert.ok(data.decisions.length > 1);
  assert.ok(!('events' in data) && !('state' in data), '완성된 결과 복사가 아닌 명령 재실행');
  const replayed = replayGame(JSON.parse(JSON.stringify(data)));
  assert.deepEqual(replayed, original);
  let manual = createGame(data.config, data.seed, data.players);
  for (const decision of data.decisions) {
    const first = submitAction(manual, 'p2', decision.decisionId, decision.commands.p2);
    assert.equal(first.error, undefined);
    const second = submitAction(first.state, 'p1', decision.decisionId, decision.commands.p1);
    assert.equal(second.error, undefined); manual = second.state;
  }
  assert.deepEqual({ ...manual, operations: [] }, { ...original, operations: [] });
});
test('다양한 틱 간격과 역할 교체에서도 동일 검증과 경기 진행이 적용된다', () => {
  for (const tickDuration of [0.05, 0.1, 0.2]) {
    let state = createGame({ targetScore: 1, tickDuration }, 14);
    for (let turn = 0; turn < 1000 && state.status === 'playing'; turn++) {
      const offense = getLegalActions(state, state.offenseId);
      const defender = state.offenseId === 'p1' ? 'p2' : 'p1';
      if (state.ball.ownerId) {
        assert.ok(offense.some(action => action.id === 'JumpShot' || action.id === 'ContinueAction'));
        assert.ok(!getLegalActions(state, defender).some(action => action.id === 'NormalDribble'));
      }
      state = runAIDecision(state); assertStateBounds(state);
    }
    assert.equal(state.status, 'finished');
  }
});

test('라이브 드리블 중 걷기/달리기는 자동 개더하지 않는다', () => {
  for (const actionId of ['Walk', 'Sprint'] as ActionId[]) {
    const state = fixture(); state.players[0].dribbleState = 'live'; state.players[0].dribblesUsed = 1; state.ball.status = 'dribbling';
    const after = pair(state, { actionId, direction: { x: 1, y: 0 }, speed: 1 });
    assert.equal(after.players[0].dribbleState, 'live', actionId);
    assert.equal(after.players[0].gatheredSteps, 0, actionId);
    assert.equal(after.players[0].dribblesUsed, 2, actionId);
  }
});
test('예약 이후 현재 행동이 개더하면 다음 드리블을 재검증해 취소한다', () => {
  const state = fixture(); state.players[0].dribbleState = 'live'; state.players[0].dribblesUsed = 1;
  const queued = queueActions(state, 'p1', [dribble('Crossover')]);
  assert.equal(queued.error, undefined);
  const after = pair(queued.state, { actionId: 'Gather' });
  assert.equal(after.players[0].dribbleState, 'ended');
  let next = runAIDecision(after);
  assert.equal(next.stats.totalDribbles, 0, '부적격 큐가 실행되지 않는다');
  assert.ok(next.events.some(event => event.type === 'queue_cancelled'));
  next = runAIDecision(next); assertStateBounds(next);
});
test('플레이어 ID를 바꿔도 동일한 공격·수비 상태 전이가 적용된다', () => {
  const first = fixture(732);
  const swapped = createGame({ initialOffenseId: 'p2' }, 732, [first.initialPlayers[1], first.initialPlayers[0]]);
  swapped.players[1].position = { ...first.players[0].position }; swapped.players[0].position = { ...first.players[1].position }; swapped.ball.position = { ...first.ball.position };
  const a = pair(first, { actionId: 'Crossover', direction: { x: 1, y: -1 }, speed: 0.8 }, { actionId: 'DefensiveSlideRight', speed: 0.9 });
  const b = pair(swapped, { actionId: 'Crossover', direction: { x: 1, y: -1 }, speed: 0.8 }, { actionId: 'DefensiveSlideRight', speed: 0.9 });
  const canonical = (state: GameState) => state.players.map(player => ({ role: player.playerId === state.config.initialOffenseId ? 'attack' : 'defend', position: player.position, velocity: player.velocity, stamina: player.stamina, balance: player.bodyBalance, burst: player.burstEnergy, dribblesUsed: player.dribblesUsed, dribbleState: player.dribbleState })).sort((left, right) => left.role.localeCompare(right.role));
  assert.deepEqual(canonical(a), canonical(b)); assert.equal(a.time, b.time);
});
test('종료된 경기는 추가 명령을 거부하며 새 경기는 완전히 초기화된다', () => {
  let state = createGame({ targetScore: 1 }, 928);
  while (state.status === 'playing' && state.stats.totalDecisions < 1000) state = runAIDecision(state);
  assert.equal(state.status, 'finished');
  assert.ok(submitAction(state, 'p1', state.decisionId, { actionId: 'RecoverBalance' }).error);
  const reset = createGame(state.config, state.seed, state.initialPlayers);
  assert.equal(reset.time, 0); assert.equal(reset.decisionId, 1); assert.equal(reset.status, 'playing');
  assert.deepEqual(reset.score, { p1: 0, p2: 0 }); assert.equal(reset.history.length, 0);
  reset.players.forEach(player => { assert.equal(player.dribblesUsed, 0); assert.equal(player.stamina, 100); });
});
test('잘못된 재생 자료와 불법 명령 가져오기는 명시적으로 거부된다', () => {
  const replay = exportReplay(createGame());
  assert.throws(() => replayGame({ ...replay, version: 999 } as unknown as typeof replay));
  assert.throws(() => replayGame({ ...replay, operations: undefined, decisions: [{ decisionId: 1, commands: { p1: { actionId: 'UnknownAction' }, p2: { actionId: 'HoldPosition' } } }] } as unknown as typeof replay));
  assert.throws(() => replayGame({ ...replay, operations: undefined, decisions: [{ decisionId: 999, commands: { p1: { actionId: 'NormalDribble' }, p2: { actionId: 'HoldPosition' } } }] }));
});
test('큐 실행 및 시작 전 취소 이후에도 실제 명령 재생 결과가 동일하다', () => {
  let state = createGame({ targetScore: 3 }, 399);
  state = queueActions(state, 'p1', [{ actionId: 'Hesitation' }, { actionId: 'Crossover' }]).state;
  state = queueActions(state, 'p2', [{ actionId: 'ShadeLeft' }]).state;
  state = cancelQueue(state, 'p2').state;
  state = runAIDecision(state);
  assert.equal(state.history[0].commands.p1.actionId, 'Hesitation');
  state = runAIDecision(state);
  for (let turn = 0; turn < 1000 && state.status === 'playing'; turn++) state = runAIDecision(state);
  const replay = replayGame(exportReplay(state));
  assert.deepEqual(replay, state);
});

/** 행동명, ID, 이벤트 설명, 카탈로그를 지운 실제 실행 서명으로 별칭만 있는 행동을 찾는다. */
function actionSignature(state: GameState) {
  return JSON.stringify({ time: state.time, score: state.score, ball: state.ball, players: state.players.map(player => ({ position: player.position, velocity: player.velocity, stamina: player.stamina, burst: player.burstEnergy, fatigue: player.fatigue, balance: player.bodyBalance, control: player.ballControl, hand: player.ballHand, steps: player.gatheredSteps, recovery: player.recoveryTime, stance: player.defensiveStance })), outcomes: state.events.filter(event => ['shot', 'miss', 'block', 'steal', 'foul', 'fake', 'drive_advantage', 'lane_blocked'].includes(event.type)).map(event => ({ type: event.type, position: event.position, data: event.data })) });
}
test('10개 드리블·8개 슛·17개 수비가 실제 시간/이동/자원/상호작용에서 구분된다', () => {
  const groups = [ACTION_LIST.filter(action => action.category === 'dribble'), ACTION_LIST.filter(action => action.category === 'shot'), ACTION_LIST.filter(action => action.role === 'defense')];
  for (const actions of groups) {
    const signatures = new Map<string, string>();
    for (const action of actions) {
      const state = fixture(391);
      state.players[0].position = { x: 7.2, y: 3 }; state.players[1].position = { x: 7.5, y: 2.5 };
      state.players[0].dribbleState = 'live'; state.ball.position = { ...state.players[0].position };
      state.players[0].bodyBalance = 73; state.players[1].bodyBalance = 72;
      const output = action.role === 'defense'
        ? pair(state, { actionId: 'NormalDribble', direction: { x: 1, y: -1 }, speed: 0.7 }, { actionId: action.id })
        : pair(state, { actionId: action.id }, { actionId: 'HoldPosition', speed: 0 });
      const signature = actionSignature(output);
      assert.ok(!signatures.has(signature), `${action.id}와 ${signatures.get(signature)}의 실제 실행이 동일`);
      signatures.set(signature, action.id);
    }
  }
});


test('실제 중단 창에서 새 결정점을 만들고 ContinueAction은 드리블을 재소비하지 않는다', () => {
  const state = fixture(99);
  const first = decisionPair(state, { actionId: 'Crossover', direction: { x: 1, y: 0 }, speed: 0.5 }, { actionId: 'HoldPosition', speed: 0 });
  assert.ok(first.ongoingActions.p1 || first.ongoingActions.p2);
  assert.ok(first.players.some(player => player.actionProgress > 0 && player.actionProgress < 1));
  assert.equal(first.stats.totalDribbles, 1);
  const next = decisionPair(first, { actionId: 'ContinueAction' }, first.ongoingActions.p2 ? { actionId: 'ContinueAction' } : { actionId: 'RecoverBalance' });
  assert.equal(next.stats.totalDribbles, 1);
  assert.ok(next.time > first.time);
  assert.ok(next.history.length > first.history.length);
});
test('interruptWindows 설정은 로그 외 실제 결정점 시간도 바꾼다', () => {
  const original = [...ACTIONS.NormalDribble.interruptWindows];
  const originalDefense = [...ACTIONS.HoldPosition.interruptWindows];
  try {
    ACTIONS.HoldPosition.interruptWindows = [0.95];
    ACTIONS.NormalDribble.interruptWindows = [0.2, 0.7];
    const earlier = decisionPair(fixture(24), { actionId: 'NormalDribble', speed: 0 }, { actionId: 'HoldPosition', speed: 0 });
    ACTIONS.NormalDribble.interruptWindows = [0.6, 0.9];
    const later = decisionPair(fixture(24), { actionId: 'NormalDribble', speed: 0 }, { actionId: 'HoldPosition', speed: 0 });
    assert.ok(later.time > earlier.time, `${earlier.time} → ${later.time}`);
  } finally {
    ACTIONS.NormalDribble.interruptWindows = original; ACTIONS.HoldPosition.interruptWindows = originalDefense;
  }
});

test('성공·실패·블록·슈팅 파울이 실제 실행에서 관측된다', () => {
  const observed = new Set<string>();
  for (let seed = 1; seed <= 600 && observed.size < 4; seed++) {
    const state = fixture(Math.imul(seed, 2654435761) >>> 0);
    state.players[0].position = { x: 7.5, y: 3 }; state.players[1].position = { x: 7.5, y: 2.3 };
    state.players[0].attributes = allAttributes(65); state.players[1].attributes = allAttributes(85);
    state.ball.position = { ...state.players[0].position };
    const after = pair(state, { actionId: 'StandingShot' }, { actionId: 'BlockAttempt', speed: 0 });
    for (const event of after.events) if (['score', 'miss', 'block', 'foul'].includes(event.type)) observed.add(event.type);
  }
  assert.deepEqual([...observed].sort(), ['block', 'foul', 'miss', 'score']);
});
test('골밑 필드골은 1점이며 자유투 외 추가 득점은 없다', () => {
  let made = false;
  for (let seed = 1; seed <= 100 && !made; seed++) {
    const state = fixture(seed); state.players[0].position = { x: 7.5, y: 3 }; state.ball.position = { ...state.players[0].position };
    const after = pair(state, { actionId: 'StandingShot' });
    if (after.stats.madeShots.p1) { assert.equal(after.score.p1, 1); made = true; }
  }
  assert.ok(made);
});
test('수비 리바운드는 새 공격의 드리블 카운트를 0으로 바꾼다', () => {
  const state = fixture(197);
  state.players[0].dribblesUsed = 3; state.players[0].dribbleState = 'ended'; state.players[0].ballPossession = false;
  state.players[0].position = { x: 14, y: 13 }; state.players[1].position = { x: 7.5, y: 1.5 };
  state.ball = { status: 'rebound', ownerId: null, lastTouchId: 'p1', position: { x: 7.5, y: 1.5 } };
  const after = pair(state, { actionId: 'Rebound', speed: 0 }, { actionId: 'Rebound', speed: 0 });
  assert.equal(after.stats.rebounds.p2, 1); assert.equal(after.offenseId, 'p2'); assert.equal(after.players[1].dribblesUsed, 0);
});
test('공격 리바운드는 동일 포제션 예산을 유지하며 재드리블을 허용하지 않는다', () => {
  const state = fixture(197);
  state.players[0].dribblesUsed = 3; state.players[0].dribbleState = 'ended'; state.players[0].ballPossession = false;
  state.players[0].position = { x: 7.5, y: 1.5 }; state.players[1].position = { x: 14, y: 13 };
  state.ball = { status: 'rebound', ownerId: null, lastTouchId: 'p1', position: { x: 7.5, y: 1.5 } };
  const after = pair(state, { actionId: 'Rebound', speed: 0 }, { actionId: 'Rebound', speed: 0 });
  assert.equal(after.stats.rebounds.p1, 1); assert.equal(after.possession, state.possession);
  assert.equal(after.players[0].dribblesUsed, 3); assert.equal(validateAction(after, 'p1', dribble()).valid, false);
});
test('비슈팅 파울은 드리블 예산을 새로 주지 않는다', () => {
  let found = false;
  for (let seed = 1; seed <= 300 && !found; seed++) {
    const state = fixture(Math.imul(seed, 2654435761) >>> 0); state.players[0].dribblesUsed = 2; state.players[0].dribbleState = 'ended';
    state.players[1].position = { x: 7.5, y: 6.3 }; state.players[1].attributes.Steal = 0; state.players[1].attributes.BodyControl = 0;
    const after = pair(state, { actionId: 'ProtectBall' }, { actionId: 'ReachIn', speed: 0 });
    if (after.events.some(event => event.type === 'foul')) {
      found = true; assert.equal(after.possession, state.possession); assert.equal(after.players[0].dribblesUsed, 2); assert.equal(after.players[0].dribbleState, 'ended');
    }
  }
  assert.ok(found);
});
test('피벗 발을 유지하는 행동은 관성을 이용해 위치 이동을 우회하지 못한다', () => {
  for (const actionId of ['Pivot', 'JabStep', 'ProtectBall', 'PumpFake'] as ActionId[]) {
    const state = fixture(); state.players[0].velocity = { x: 5, y: -4 };
    const after = pair(state, { actionId, direction: { x: 1, y: -1 }, speed: 1 });
    assert.deepEqual(after.players[0].position, state.players[0].position, actionId);
  }
});
test('공개 유효 명령에서 고른 무작위 양역할 경합도 상태 불변식을 유지한다', () => {
  let state = createGame({ maxPossessions: 60 }, 332);
  let rng = 171;
  const nextInt = () => { rng = Math.imul(rng, 1664525) + 1013904223 | 0; return rng >>> 0; };
  for (let turn = 0; turn < 1500 && state.status === 'playing'; turn++) {
    const choices = (id: 'p1' | 'p2') => {
      const legal = getLegalActions(state, id);
      const action = legal[nextInt() % legal.length];
      return { actionId: action.id, speed: (nextInt() % 11) / 10 };
    };
    const attack = choices(state.offenseId), defense = choices(state.offenseId === 'p1' ? 'p2' : 'p1');
    state = decisionPair(state, attack, defense, !!(nextInt() % 2));
    assertStateBounds(state);
  }
  assert.ok(state.stats.totalDecisions >= 100 || state.status === 'finished');
});

test('15개 극단 시드·틱 조합의 하드 AI 경기가 종료되고 JSON 재생이 완전히 일치한다', () => {
  for (const tickDuration of [0.02, 0.1, 0.25]) for (const seed of [0, 1, 13, 123, 0xffffffff]) {
    let state = createGame({ tickDuration, targetScore: 2, maxScore: 3, maxPossessions: 30 }, seed);
    let steps = 0;
    while (state.status === 'playing' && steps++ < 2000) {
      const next = runAIDecision(state, 'hard');
      assert.notEqual(next, state, `틱 ${tickDuration}, 시드 ${seed}`);
      state = next; assertStateBounds(state);
    }
    assert.equal(state.status, 'finished', `틱 ${tickDuration}, 시드 ${seed}`);
    assert.deepEqual(replayGame(JSON.parse(JSON.stringify(exportReplay(state)))), state);
  }
});
test('잘못된 설정의 자료형·범위·플레이어 ID를 거부한다', () => {
  const malformed = [{ tickDuration: '0.1' }, { tickDuration: NaN }, { shotClock: Infinity }, { winBy: 1.5 }, { initialOffenseId: 'p3' }];
  for (const config of malformed) assert.throws(() => createGame(config as unknown as Parameters<typeof createGame>[0]));
});
