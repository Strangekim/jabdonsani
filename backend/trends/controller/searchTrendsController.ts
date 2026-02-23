import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { searchTrendsService } from "../service/searchTrendsService";
import { sendSuccess } from "../../utils/response";

/**
 * GET /api/trends/search - 동향 검색 (커서 기반)
 */
export const searchTrendsController = tryCatchWrapper(async (req: Request, res: Response) => {
    const result = await searchTrendsService();
    sendSuccess(res, result);
});
