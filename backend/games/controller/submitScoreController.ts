import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { submitScoreService } from "../service/submitScoreService";
import { sendSuccess } from "../../utils/response";

/**
 * POST /api/games/:gameId/scores — 게임 점수 등록
 */
export const submitScoreController = tryCatchWrapper(async (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { nickname, score } = req.body;
    const result = await submitScoreService({ gameId, nickname, score });
    sendSuccess(res, result, 201);
});
