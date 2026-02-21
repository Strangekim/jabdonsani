import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";

/**
 * POST /api/users - 회원가입 컨트롤러
 * 사용자 생성 로직을 처리합니다.
 */
export const createUserController = tryCatchWrapper(async (req: Request, res: Response) => {
    // TODO: 핵심 로직 구현
});
