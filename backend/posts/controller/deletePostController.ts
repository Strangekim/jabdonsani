import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { deletePostService } from "../service/deletePostService";
import { sendSuccess } from "../../utils/response";

/**
 * DELETE /api/posts/:id - 블로그 글 삭제
 */
export const deletePostController = tryCatchWrapper(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    // [deletePostService]: 특정 ID의 블로그 글을 삭제합니다.
    const result = await deletePostService(id);
    sendSuccess(res, result);
});
