import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { getPostByIdService } from "../service/getPostByIdService";
import { sendSuccess } from "../../utils/response";

/**
 * GET /api/posts/:id - 블로그 글 상세 조회
 */
export const getPostByIdController = tryCatchWrapper(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    // [getPostByIdService]: 특정 ID의 블로그 글 상세 정보와 댓글을 조회합니다.
    const result = await getPostByIdService(id);
    sendSuccess(res, result);
});
