import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { useToolService } from "../service/useToolService";

/**
 * POST /api/tools/:id/use - 도구 사용 기록 (카운트 +1)
 */
export const useToolController = tryCatchWrapper(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await useToolService(id);
    res.json({ success: true, data: result });
});
