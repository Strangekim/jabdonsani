import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { logInService } from "../service/logInService";

/**
 * POST /api/auth/login - 관리자 로그인
 */
export const logInController = tryCatchWrapper(async (req: Request, res: Response) => {
    const result = await logInService();
    res.json({ success: true, data: result });
});
