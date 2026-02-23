import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { logOutService } from "../service/logOutService";
import { sendSuccess } from "../../utils/response";

/**
 * POST /api/auth/logout - 로그아웃
 */
export const logOutController = tryCatchWrapper(async (req: Request, res: Response) => {
    const result = await logOutService();
    sendSuccess(res, result);
});
