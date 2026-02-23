import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { getMeService } from "../service/getMeService";
import { sendSuccess } from "../../utils/response";

/**
 * GET /api/auth/me - 현재 로그인 상태 확인
 */
export const getMeController = tryCatchWrapper(async (req: Request, res: Response) => {
    const result = await getMeService();
    sendSuccess(res, result);
});
