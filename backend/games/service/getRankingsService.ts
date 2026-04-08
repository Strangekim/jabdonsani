import { query } from "../../config/db";

interface RankingRow {
    nickname: string;
    score: number;
    created_at: string;
}

/**
 * 게임별 랭킹 TOP N 조회 서비스
 */
export const getRankingsService = async (gameId: string, limit: number = 10): Promise<RankingRow[]> => {
    const sql = `
        SELECT nickname, score, created_at
        FROM game_scores
        WHERE game_id = $1
        ORDER BY score DESC, created_at ASC
        LIMIT $2
    `;
    const result = await query(sql, [gameId, limit]);
    return result.rows;
};
