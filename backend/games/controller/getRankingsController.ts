import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { getRankingsService } from "../service/getRankingsService";
import { sendSuccess } from "../../utils/response";

/**
 * GET /api/games/:gameId/rankings — 게임별 랭킹 조회
 */
export const getRankingsController = tryCatchWrapper(async (req: Request, res: Response) => {
    const { gameId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const rankings = await getRankingsService(gameId, limit);
    sendSuccess(res, rankings);
});
