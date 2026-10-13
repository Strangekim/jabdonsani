import { ATTRIBUTE_KEYS, createGame, validateAction } from '../../src/lib/basketball';
import type { ActionCommand, GameState } from '../../src/lib/basketball/types';
import { pair } from './helpers';

/** 입력 능력치 자체와 카탈로그는 비교에서 제외하고 실제 상태 전이만 관찰한다. */
function signature(state: GameState) {
  return JSON.stringify({
    time: state.time, ball: state.ball, score: state.score, stats: state.stats,
    players: state.players.map(player => {
      const { attributes: _attributes, ...dynamic } = player;
      void _attributes;
      return dynamic;
    }),
    events: state.events.map(event => ({ type: event.type, position: event.position, data: event.data })),
  });
}
export function attributeWitnesses(): Record<string, string> {
  const scenarios: { attack: ActionCommand; defense: ActionCommand; y?: number; live?: boolean }[] = [
    { attack: { actionId: 'Crossover', direction: { x: -1, y: -1 }, speed: 1 }, defense: { actionId: 'DefensiveSlideRight', speed: 1 } },
    { attack: { actionId: 'SpeedDribble', direction: { x: 0, y: -1 }, speed: 1 }, defense: { actionId: 'CutOffDrivingLane', speed: 1 } },
    { attack: { actionId: 'ProtectedDribble', speed: 0.3 }, defense: { actionId: 'StealAttempt' } },
    { attack: { actionId: 'StandingShot' }, defense: { actionId: 'ContestShot' }, y: 3 },
    { attack: { actionId: 'StandingShot' }, defense: { actionId: 'ContestShot' }, y: 6 },
    { attack: { actionId: 'StandingShot' }, defense: { actionId: 'ContestShot' }, y: 9 },
    { attack: { actionId: 'Dunk' }, defense: { actionId: 'BlockAttempt' }, y: 3 },
    { attack: { actionId: 'Layup' }, defense: { actionId: 'JumpContest' }, y: 3 },
    { attack: { actionId: 'PumpFake' }, defense: { actionId: 'AnticipateDirection', anticipatedDirection: { x: 1, y: 0 } } },
    { attack: { actionId: 'RetreatDribble', direction: { x: 0, y: 1 }, speed: 1 }, defense: { actionId: 'BodyUp' } },
    { attack: { actionId: 'StepBackShot', direction: { x: 0, y: 1 } }, defense: { actionId: 'CloseOut' }, live: true },
  ];
  const witnesses: Record<string, string> = {};
  for (const attribute of ATTRIBUTE_KEYS) {
    outer: for (const scenario of scenarios) for (const index of [0, 1] as const) {
      const states = [20, 95].map(value => {
        const state = createGame({}, 731);
        state.players[0].position = { x: 7.5, y: scenario.y ?? 7 };
        state.players[1].position = { x: 8.1, y: (scenario.y ?? 7) - 0.6 };
        state.players[0].bodyBalance = 55; state.players[1].bodyBalance = 60;
        state.players[0].velocity = { x: 1.5, y: -0.5 }; state.players[1].velocity = { x: -0.5, y: 0.5 };
        state.players[index].attributes[attribute] = value;
        state.ball.position = { ...state.players[0].position };
        if (scenario.live) state.players[0].dribbleState = 'live';
        return state;
      });
      if (!states.every(state => validateAction(state, 'p1', scenario.attack).valid && validateAction(state, 'p2', scenario.defense).valid)) continue;
      const outputs = states.map(state => pair(state, scenario.attack, scenario.defense));
      if (signature(outputs[0]) !== signature(outputs[1])) {
        witnesses[attribute] = `${index === 0 ? '공격' : '수비'}: ${scenario.attack.actionId} / ${scenario.defense.actionId}`;
        break outer;
      }
    }
  }
  return witnesses;
}
