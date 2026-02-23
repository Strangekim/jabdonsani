import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { logInService } from "../service/logInService";
import { sendSuccess } from "../../utils/response";

/**
 * POST /api/auth/login - 관리자 로그인
 */
export const logInController = tryCatchWrapper(async (req: Request, res: Response) => {
    const { userId, loginId } = await logInService(req.body);

    // 세션에 사용자 정보 저장
    req.session.userId = userId;
    req.session.loginId = loginId;

    sendSuccess(res, { message: "로그인 성공" });
});
