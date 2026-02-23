import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { getBatchStatusService } from "../service/getBatchStatusService";
import { sendSuccess } from "../../utils/response";

/**
 * GET /api/batch/status - 마지막 배치 실행 상태 조회
 */
export const getBatchStatusController = tryCatchWrapper(async (req: Request, res: Response) => {
    const result = await getBatchStatusService();
    sendSuccess(res, result);
});
