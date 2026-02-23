import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { getPopularPostsService } from "../service/getPopularPostsService";
import { sendSuccess } from "../../utils/response";

/**
 * GET /api/posts/popular - 인기 블로그 글 조회
 */
export const getPopularPostsController = tryCatchWrapper(async (req: Request, res: Response) => {
    // [getPopularPostsService]: 조회수/추천수 기반 인기 블로그 글 TOP 5를 조회합니다.
    const result = await getPopularPostsService();
    sendSuccess(res, result);
});
