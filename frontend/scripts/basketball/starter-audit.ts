import { runStatistics, winConfidence95 } from '../../src/lib/basketball/statistics';

/** 같은 능력치·시드 목록에서 선공만 바꾸어 ID 편향과 선공 이점을 분리한다. */
export function runStarterAudit(games = 100) {
  const first = runStatistics({ seed: 20261013, possessions: 1, games, config: { initialOffenseId: 'p1' } });
  const second = runStatistics({ seed: 20261013, possessions: 1, games, config: { initialOffenseId: 'p2' } });
  const p1Wins = first.playerWins.p1.wins + second.playerWins.p1.wins;
  const starterWins = first.playerWins.p1.wins + second.playerWins.p2.wins;
  return {
    seed: 20261013, matchedSeeds: games, totalGames: games * 2,
    note: '동일한 능력치와 시드의 경기를 선공 P1/P2로 각각 실행한다. 확률 경합의 표본 분산은 남는다. 아래 윌슨 구간은 단순 이항 기술통계이며 짝지은 표본의 독립성을 보장하지 않는다.',
    p1First: { wins: first.playerWins, possessions: first.completedPossessions },
    p2First: { wins: second.playerWins, possessions: second.completedPossessions },
    pooledP1: { wins: p1Wins, games: games * 2, rate: p1Wins / (games * 2), confidence95: winConfidence95(p1Wins, games * 2) },
    pooledStarter: { wins: starterWins, games: games * 2, rate: starterWins / (games * 2), confidence95: winConfidence95(starterWins, games * 2) },
  };
}
