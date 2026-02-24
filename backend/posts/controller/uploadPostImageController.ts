import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { uploadPostImageService } from "../service/uploadPostImageService";
import { sendSuccess } from "../../utils/response";
import { badRequestError } from "../../middleware/customError";

/**
 * POST /api/posts/upload — 게시글 이미지 업로드
 * multer(uploadMiddleware) 실행 후 req.file에 저장된 파일 정보 사용
 */
export const uploadPostImageController = tryCatchWrapper(async (req: Request, res: Response) => {
    if (!req.file) {
        throw badRequestError('업로드된 파일이 없습니다.', 'NO_FILE');
    }

    const result = await uploadPostImageService(req.file);
    sendSuccess(res, result, 201);
});
