import test from 'node:test';
import assert from 'node:assert/strict';
import { compactActions, compactCommand, usesLane } from '../../src/lib/basketball/compact';
import { createGame, getObservation } from '../../src/lib/basketball/engine';
import { dot, normalize, subtract } from '../../src/lib/basketball/formulas';

// 코트의 모서리와 역할 교대에서도 같은 좌우 경로를 공유한다.
test('compact lanes match defense anticipation without turning drives into retreat', () => {
  for (const offenseId of ['p1', 'p2'] as const) {
    for (const position of [{ x: .3, y: .3 }, { x: 14, y: .3 }, { x: 7.5, y: 8 }, { x: 7.5, y: 1.2 }]) {
      const state = createGame({ initialOffenseId: offenseId });
      state.players.find(p => p.playerId === offenseId)!.position = position;
      const defenseId = offenseId === 'p1' ? 'p2' : 'p1';
      for (const side of ['left', 'right'] as const) {
        const drive = compactCommand(getObservation(state, offenseId), 'NormalDribble', side);
        const block = compactCommand(getObservation(state, defenseId), 'CutOffDrivingLane', side);
        assert.deepEqual(drive.direction, block.anticipatedDirection);
        assert.ok(dot(normalize(drive.direction!), normalize(subtract(state.config.hoop, position))) >= 0);
      }
    }
  }
});

test('compact controls keep only three dribbles and automatic shot, retreat and crossover details', () => {
  const state = createGame();
  const o = getObservation(state, 'p1');
  assert.deepEqual(compactActions(o).filter(a => a.category === 'dribble').map(a => a.id), ['NormalDribble', 'Crossover', 'RetreatDribble']);
  assert.equal(compactCommand(o, 'Crossover', 'left').hand, undefined);
  for (const id of ['RetreatDribble', 'JumpShot', 'Layup'] as const) {
    assert.equal(usesLane(id), false);
    assert.equal(compactCommand(o, id, 'left').direction, undefined);
    assert.deepEqual(compactCommand(o, id, 'left'), compactCommand(o, id, 'right'));
  }
  state.players[0].forcedPickup = true;
  state.players[0].dribbleState = 'ended';
  state.situation.kind = 'pickup';
  assert.ok(compactActions(getObservation(state, 'p1')).every(a => a.category === 'shot'));
});

// 림 높이의 좌우 중복 입력은 숨기고, 그 밖의 화면 좌우는 서로 다른 경로다.
test('baseline uses automatic approach while visible left/right lanes are distinct', () => {
  for (const position of [{ x: .3, y: 1.2 }, { x: 14, y: 1.2 }, { x: .3, y: .3 }, { x: 14, y: 5 }, { x: 7.5, y: 8 }]) {
    const state = createGame();
    state.players[0].position = position;
    const o = getObservation(state, 'p1');
    const left = normalize(compactCommand(o, 'NormalDribble', 'left').direction!);
    const right = normalize(compactCommand(o, 'NormalDribble', 'right').direction!);
    if (Math.abs(position.y - state.config.hoop.y) <= .25) {
      assert.equal(usesLane('NormalDribble', o), false);
      assert.equal(usesLane('CutOffDrivingLane', getObservation(state, 'p2')), false);
      assert.deepEqual(left, right);
    } else {
      assert.equal(usesLane('NormalDribble', o), true);
      assert.ok(left.x < right.x);
      assert.ok(dot(left, right) < 0, 'opposite lane predictions must be distinct');
    }
  }
});
