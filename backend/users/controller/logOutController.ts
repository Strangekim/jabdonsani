import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";

/**
 * POST /api/users/logout - 로그아웃 컨트롤러
 * 세션을 파기하여 로그아웃을 처리합니다.
 */
export const logOutController = tryCatchWrapper(async (req: Request, res: Response) => {
    // TODO: 핵심 로직 구현
});
