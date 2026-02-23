import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { useToolService } from "../service/useToolService";
import { sendSuccess } from "../../utils/response";

/**
 * POST /api/tools/:id/use - 도구 사용 기록 (카운트 +1)
 */
export const useToolController = tryCatchWrapper(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    // [useToolService]: 특정 도구(id)를 사용 시 호출되며, 해당 도구의 사용 횟수를 1 증가시킵니다.
    const result = await useToolService(id);
    sendSuccess(res, result);
});
