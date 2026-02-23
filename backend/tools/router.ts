import { Router } from "express";
import { getToolsUsageController } from "./controller/getToolsUsageController";
import { useToolController } from "./controller/useToolController";
import { validateParams, stringIdSchema } from "../middleware/validate";

const router = Router();

// GET /api/tools/usage 도구별 누적 사용 횟수 조회
router.get("/usage",
    getToolsUsageController
);

router.post("/:id/use",
    validateParams(stringIdSchema),
    useToolController
);

export default router;
