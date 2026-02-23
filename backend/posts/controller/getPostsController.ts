import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { getPostsService } from "../service/getPostsService";
import { sendSuccess } from "../../utils/response";

/**
 * GET /api/posts - 블로그 글 목록 조회 (커서 기반)
 */
export const getPostsController = tryCatchWrapper(async (req: Request, res: Response) => {
    const result = await getPostsService();
    sendSuccess(res, result);
});
