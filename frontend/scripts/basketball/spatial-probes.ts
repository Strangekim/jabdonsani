import { ACTION_LIST, createGame } from '../../src/lib/basketball';
import type { ActionId, PlayerSetup, Vec2 } from '../../src/lib/basketball/types';
import { pair } from '../../tests/basketball/helpers';

/** 정면 밀착 한 가지 조건으로 돌파 전체를 해석하지 않도록 별도 공간 표본을 만든다. */
export function runSpatialProbes(trials = 64) {
  const scenarios: { id: string; description: string; defender: Vec2; direction: Vec2; players: [PlayerSetup, PlayerSetup] }[] = [
    { id: 'frontal', description: '동일 능력치, 정면 1m 수비', defender: { x: 7.5, y: 5 }, direction: { x: 0.5, y: -1 }, players: [{}, {}] },
    { id: 'open_left', description: '동일 능력치, 오른쪽으로 치우친 수비의 반대편 경로', defender: { x: 8.4, y: 5.8 }, direction: { x: -0.8, y: -1 }, players: [{}, {}] },
    { id: 'speed_mismatch', description: '비대칭 공간에서 빠른 공격 대 느린 수비, 능력치 조합 변경 명시', defender: { x: 8, y: 5.7 }, direction: { x: -0.6, y: -1 }, players: [{ attributes: { Speed: 90, Acceleration: 90, Agility: 90, DribbleSpeed: 90 } }, { attributes: { Speed: 40, Acceleration: 40, LateralQuickness: 40, PerimeterDefense: 45 } }] },
  ];
  const defenses: ActionId[] = ['HoldPosition', 'CutOffDrivingLane', 'DefensiveSlideLeft'];
  const results: Record<string, { attempts: number; controls: number; drives: number; controlRate: number; breakthroughRate: number }> = {};
  for (const scenario of scenarios) for (const action of ACTION_LIST.filter(candidate => candidate.category === 'dribble')) for (const defense of defenses) {
    let controls = 0, drives = 0;
    for (let seed = 1; seed <= trials; seed++) {
      const state = createGame({}, Math.imul(seed + 773, 2654435761) >>> 0, scenario.players);
      state.players[0].position = { x: 7.5, y: 6 }; state.players[1].position = { ...scenario.defender }; state.ball.position = { ...state.players[0].position };
      const result = pair(state, { actionId: action.id, direction: scenario.direction, speed: 1 }, { actionId: defense, anticipatedDirection: scenario.direction, speed: defense === 'HoldPosition' ? 0 : 0.9 });
      controls += result.stats.dribbleSuccesses[action.id] ?? 0; drives += result.stats.drives.p1;
    }
    results[`${scenario.id}/${action.id}/${defense}`] = { attempts: trials, controls, drives, controlRate: controls / trials, breakthroughRate: drives / trials };
  }
  return { trialsPerCombination: trials, totalTrials: Object.keys(results).length * trials, note: '드리블 1동작의 공간 돌파 성공을 측정한다. 정면 조건의 실패는 기술 전체의 실패가 아니다. 동일한 임의 방향을 입력해 각 기술의 기본 방향을 재정의한 통제 조건이다.', scenarios, combinations: results };
}
