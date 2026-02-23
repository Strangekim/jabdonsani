import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { getVisitorsService } from "../service/getVisitorsService";

/**
 * GET /api/visitors - Today / Total 방문자 수 조회
 */
export const getVisitorsController = tryCatchWrapper(async (req: Request, res: Response) => {
    const result = await getVisitorsService();
    res.json({
        success: true,
        data: result
    });
});
