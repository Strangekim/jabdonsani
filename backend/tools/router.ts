import { Router } from "express";
import { getToolsUsageController } from "./controller/getToolsUsageController";
import { useToolController } from "./controller/useToolController";

const router = Router();

// GET /api/tools/usage 도구별 누적 사용 횟수 조회
router.get("/usage", getToolsUsageController);

// POST /api/tools/:id/use 도구 사용 기록 (카운트 +1)
router.post("/:id/use", useToolController);

export default router;
