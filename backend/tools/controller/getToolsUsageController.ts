import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { getToolsUsageService } from "../service/getToolsUsageService";
import { sendSuccess } from "../../utils/response";

/**
 * GET /api/tools/usage - 도구별 누적 사용 횟수 조회
 */
export const getToolsUsageController = tryCatchWrapper(async (req: Request, res: Response) => {
    const result = await getToolsUsageService();
    sendSuccess(res, result);
});
