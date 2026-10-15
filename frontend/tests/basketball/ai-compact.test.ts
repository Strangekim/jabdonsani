import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseAIAction, runAIDecision } from '../../src/lib/basketball/ai';
import { compactActions, compactCommand } from '../../src/lib/basketball/compact';
import { createGame, getObservation, validateAction } from '../../src/lib/basketball/engine';

test('AI uses only the compact contextual choices and shared left/right commands at every difficulty', () => {
  for (const difficulty of ['easy', 'normal', 'hard'] as const) {
    for (let seed = 1; seed <= 6; seed++) {
      let state = createGame({ targetScore: 3, maxPossessions: 12 }, seed);
      for (let turn = 0; turn < 300 && state.status === 'playing'; turn++) {
        for (const playerId of ['p1', 'p2'] as const) {
          const observation = getObservation(state, playerId);
          const command = chooseAIAction(observation, difficulty);
          assert.ok(compactActions(observation).some(action => action.id === command.actionId), `${difficulty}: ${command.actionId}`);
          assert.ok(validateAction(state, playerId, command).valid);
          const { releaseTiming, ...movement } = command;
          void releaseTiming;
          const options = (['left', 'right'] as const).map(side => {
            const { releaseTiming, ...compact } = compactCommand(observation, command.actionId, side);
            void releaseTiming;
            return compact;
          });
          assert.ok(options.some(option => JSON.stringify(option) === JSON.stringify(movement)), 'AI and human controls share the same command builder');
        }
        const next = runAIDecision(state, difficulty);
        assert.ok(next.decisionId > state.decisionId || next.status === 'finished');
        state = next;
      }
      assert.equal(state.status, 'finished');
    }
  }
});

test('AI tolerates a single contextual choice at every variety roll', () => {
  for (let decisionId = 0; decisionId < 100; decisionId++) {
    const observation = getObservation(createGame({}, 1), 'p1');
    observation.decisionId = decisionId;
    observation.legalActions = observation.legalActions.filter(action => action.id === 'JumpShot');
    assert.equal(chooseAIAction(observation, 'normal').actionId, 'JumpShot');
  }
});
