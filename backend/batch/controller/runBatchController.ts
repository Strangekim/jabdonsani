import { Request, Response } from "express";
import { tryCatchWrapper } from "../../middleware/tryCatchWrapper";
import { runBatchService } from "../service/runBatchService";

/**
 * POST /api/batch/crawl - 데이터 수집 배치 수동 실행
 */
export const runBatchController = tryCatchWrapper(async (req: Request, res: Response) => {
    const result = await runBatchService();
    res.json({ success: true, data: result });
});
