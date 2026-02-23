import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { getTrendsService } from "../service/getTrendsService";
import { sendSuccess } from "../../utils/response";
import { TrendsQuery } from "../model";

/**
 * GET /api/trends - 동향 카드 목록 조회 (커서 기반 멀티 필터링)
 */
export const getTrendsController = tryCatchWrapper(async (req: Request, res: Response) => {
    const { field, source, cursor, limit } = (req as any).validatedQuery as TrendsQuery;

    const result = await getTrendsService(field, source, cursor, limit ?? 20);
    sendSuccess(res, result);
});
