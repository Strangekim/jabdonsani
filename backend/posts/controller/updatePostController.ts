import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { updatePostService } from "../service/updatePostService";
import { sendSuccess } from "../../utils/response";

/**
 * PUT /api/posts/:id - 블로그 글 수정
 */
export const updatePostController = tryCatchWrapper(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    // [updatePostService]: 특정 ID의 블로그 글 내용을 수정합니다.
    const result = await updatePostService(id, req.body);
    sendSuccess(res, result);
});
