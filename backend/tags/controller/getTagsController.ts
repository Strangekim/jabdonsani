import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { getTagsService } from "../service/getTagsService";

/**
 * GET /api/tags - 태그 클라우드용 목록 반환
 */
export const getTagsController = tryCatchWrapper(async (req: Request, res: Response) => {
    const result = await getTagsService();
    res.json({
        success: true,
        data: result
    });
});
