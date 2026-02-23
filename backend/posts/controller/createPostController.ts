import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { createPostService } from "../service/createPostService";

/**
 * POST /api/posts - 블로그 글 작성
 */
export const createPostController = tryCatchWrapper(async (req: Request, res: Response) => {
    const result = await createPostService(req.body);
    res.status(201).json({
        success: true,
        data: result
    });
});
