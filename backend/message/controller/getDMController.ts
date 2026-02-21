import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";

/**
 * GET /api/messages/dm/:userId - DM 조회 컨트롤러
 * 특정 사용자와의 1:1 DM 목록을 반환합니다.
 */
export const getDMController = tryCatchWrapper(async (req: Request, res: Response) => {
    // TODO: 핵심 로직 구현
});
