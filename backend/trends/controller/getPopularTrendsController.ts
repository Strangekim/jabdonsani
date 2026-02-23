import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { getPopularTrendsService } from "../service/getPopularTrendsService";
import { sendSuccess } from "../../utils/response";

/**
 * GET /api/trends/popular - 인기 동향 조회
 */
export const getPopularTrendsController = tryCatchWrapper(async (req: Request, res: Response) => {
    // [getPopularTrendsService]: 오늘의 인기 동향 정보(업보트 기준) TOP 5를 가져옵니다.
    const result = await getPopularTrendsService();
    sendSuccess(res, result);
});
