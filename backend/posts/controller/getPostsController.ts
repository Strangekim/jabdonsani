import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { getPostsService } from "../service/getPostsService";
import { sendSuccess } from "../../utils/response";
import { PostsQuery } from "../model";

/**
 * GET /api/posts - 블로그 글 목록 조회 (커서 기반, 태그 필터)
 */
export const getPostsController = tryCatchWrapper(async (req: Request, res: Response) => {
    const { tag, cursor, limit } = (req as any).validatedQuery as PostsQuery;

    const result = await getPostsService(tag, cursor, limit ?? 10);
    sendSuccess(res, result);
});
