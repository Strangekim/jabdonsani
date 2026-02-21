import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";

/**
 * GET /api/users - 전체 사용자 조회 컨트롤러
 * 등록된 모든 사용자 목록을 반환합니다.
 */
export const getUsersController = tryCatchWrapper(async (req: Request, res: Response) => {
    // TODO: 핵심 로직 구현
});
