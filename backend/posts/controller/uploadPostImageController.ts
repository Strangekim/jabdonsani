import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { uploadPostImageService } from "../service/uploadPostImageService";
import { sendSuccess } from "../../utils/response";

/**
 * POST /api/posts/upload - 게시글 이미지 업로드용
 */
export const uploadPostImageController = tryCatchWrapper(async (req: Request, res: Response) => {
    // [uploadPostImageService]: 블로그 글 작성 시 첨부되는 이미지를 업로드 처리합니다.
    const result = await uploadPostImageService(req.body);
    sendSuccess(res, result);
});
