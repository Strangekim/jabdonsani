import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";

/**
 * GET /api/messages/public - 전체 공개 메시지 조회 컨트롤러
 * 공개 채팅 메시지 목록을 반환합니다.
 */
export const getPublicMessageController = tryCatchWrapper(async (req: Request, res: Response) => {
    // TODO: 핵심 로직 구현
});
