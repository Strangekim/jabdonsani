import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { trackVisitorService } from "../service/trackVisitorService";
import { sendSuccess } from "../../utils/response";

/**
 * POST /api/visitors/track - 방문 기록 (페이지 접속 시)
 */
export const trackVisitorController = tryCatchWrapper(async (req: Request, res: Response) => {
    const result = await trackVisitorService();
    sendSuccess(res, result);
});
