import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { createPostService } from "../service/createPostService";

/**
 * POST /api/posts - 블로그 글 작성
 */
export const createPostController = tryCatchWrapper(async (req: Request, res: Response) => {
    // [createPostService]: 새로운 블로그 글을 작성하고 DB에 저장합니다.
    const result = await createPostService(req.body);
    res.status(201).json({
        success: true,
        data: result
    });
});
