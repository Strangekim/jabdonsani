import { query } from "../../config/db";

interface ScoreInput {
    gameId: string;
    nickname: string;
    score: number;
}

interface ScoreRow {
    id: number;
    game_id: string;
    nickname: string;
    score: number;
    created_at: string;
}

/**
 * 게임 점수 저장 서비스
 */
export const submitScoreService = async ({ gameId, nickname, score }: ScoreInput): Promise<ScoreRow> => {
    const sql = `
        INSERT INTO game_scores (game_id, nickname, score)
        VALUES ($1, $2, $3)
        RETURNING id, game_id, nickname, score, created_at
    `;
    const result = await query(sql, [gameId, nickname, score]);
    return result.rows[0];
};
