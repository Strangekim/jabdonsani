import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";

/**
 * POST /api/users/login - 로그인 컨트롤러
 * 사용자 인증 및 세션 생성을 처리합니다.
 */
export const logInController = tryCatchWrapper(async (req: Request, res: Response) => {
    // TODO: 핵심 로직 구현
});
