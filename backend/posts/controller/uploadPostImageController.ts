import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { uploadPostImageService } from "../service/uploadPostImageService";
import { sendSuccess } from "../../utils/response";

/**
 * POST /api/posts/upload - 게시글 이미지 업로드용
 */
export const uploadPostImageController = tryCatchWrapper(async (req: Request, res: Response) => {
    const result = await uploadPostImageService(req.body);
    sendSuccess(res, result);
});
