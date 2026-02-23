import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { searchTrendsService } from "../service/searchTrendsService";

/**
 * GET /api/trends/search - 동향 검색 (커서 기반)
 */
export const searchTrendsController = tryCatchWrapper(async (req: Request, res: Response) => {
    const result = await searchTrendsService();
    res.json({
        success: true,
        data: result
    });
});
