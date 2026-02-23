import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { deletePostService } from "../service/deletePostService";

/**
 * DELETE /api/posts/:id - 블로그 글 삭제
 */
export const deletePostController = tryCatchWrapper(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await deletePostService(id);
    res.json({ success: true, data: result });
});
