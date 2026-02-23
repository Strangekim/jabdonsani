import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { sendSuccess } from "../../utils/response";
import { createCustomError } from "../../middleware/customError";

/**
 * POST /api/auth/logout - 로그아웃
 */
export const logOutController = tryCatchWrapper(async (req: Request, res: Response) => {
    await new Promise<void>((resolve, reject) => {
        req.session.destroy((err) => {
            if (err) {
                return reject(createCustomError("로그아웃에 실패했습니다.", 500, "LOGOUT_FAILED"));
            }
            resolve();
        });
    });

    res.clearCookie('connect.sid');
    sendSuccess(res, { message: "로그아웃 완료" });
});
