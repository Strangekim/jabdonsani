import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { sendSuccess } from "../../utils/response";

/**
 * GET /api/auth/me - 현재 로그인 상태 확인
 */
export const getMeController = tryCatchWrapper(async (req: Request, res: Response) => {
    if (req.session.userId) {
        sendSuccess(res, {
            authenticated: true,
            id: req.session.loginId
        });
    } else {
        sendSuccess(res, {
            authenticated: false
        });
    }
});
