import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { getPopularTrendsService } from "../service/getPopularTrendsService";

/**
 * GET /api/trends/popular - 인기 동향 조회
 */
export const getPopularTrendsController = tryCatchWrapper(async (req: Request, res: Response) => {
    const result = await getPopularTrendsService();
    res.json({ success: true, data: result });
});
