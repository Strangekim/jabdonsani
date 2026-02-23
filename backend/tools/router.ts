import { Router } from "express";
import { z } from "zod";
import { getToolsUsageController } from "./controller/getToolsUsageController";
import { useToolController } from "./controller/useToolController";
import { validateParams } from "../middleware/validate";

const router = Router();

// 파라미터 :id 검증 스키마
const idParamSchema = z.object({
    id: z.string().min(1, "도구 ID는 필수입니다.")
});

// GET /api/tools/usage 도구별 누적 사용 횟수 조회
router.get("/usage",
    getToolsUsageController
);

// POST /api/tools/:id/use 도구 사용 기록 (카운트 +1)
router.post("/:id/use",
    validateParams(idParamSchema),
    useToolController
);

export default router;
