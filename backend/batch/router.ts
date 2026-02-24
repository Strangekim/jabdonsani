import { Router } from "express";
import { runBatchController } from "./controller/runBatchController";
import { getBatchStatusController } from "./controller/getBatchStatusController";
import { isAuthenticated } from "../middleware/auth";

const router = Router();

// POST /api/batch/crawl 수집 배치 수동 실행 (인증 필요)
router.post("/crawl",
    // isAuthenticated,
    runBatchController
);

// GET /api/batch/status 마지막 배치 실행 상태 조회 (인증 필요)
router.get("/status",
    // isAuthenticated,
    getBatchStatusController
);

export default router;
