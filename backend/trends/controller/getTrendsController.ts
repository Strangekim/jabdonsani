import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { getTrendsService } from "../service/getTrendsService";

/**
 * GET /api/trends - 동향 카드 목록 조회 (커서 기반 멀티 필터링)
 */
export const getTrendsController = tryCatchWrapper(async (req: Request, res: Response) => {
    const result = await getTrendsService();
    res.json({ success: true, data: result });
});
