import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { searchTrendsService } from "../service/searchTrendsService";
import { sendSuccess } from "../../utils/response";
import { SearchQuery } from "../model";

/**
 * GET /api/trends/search - 동향 검색 (커서 기반)
 */
export const searchTrendsController = tryCatchWrapper(async (req: Request, res: Response) => {
    const { q, field, source, cursor, limit } = (req as any).validatedQuery as SearchQuery;

    const result = await searchTrendsService(q, field, source, cursor, limit ?? 20);
    sendSuccess(res, result);
});
