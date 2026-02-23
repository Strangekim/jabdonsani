import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { getPopularPostsService } from "../service/getPopularPostsService";

/**
 * GET /api/posts/popular - 인기 블로그 글 조회
 */
export const getPopularPostsController = tryCatchWrapper(async (req: Request, res: Response) => {
    const result = await getPopularPostsService();
    res.json({ success: true, data: result });
});
