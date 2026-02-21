import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";

/**
 * GET /api/users/me - 현재 로그인된 사용자 정보 조회 컨트롤러
 * 세션 체크용 API
 */
export const getMeController = tryCatchWrapper(async (req: Request, res: Response) => {
    // TODO: 핵심 로직 구현
});
