import { Router } from "express";
import { getPublicMessageController } from "./controller/getPublicMessageController";
import { getDMController } from "./controller/getDMController";
import { isAuthenticated } from "../middleware/auth";
import { validateQuery, validateParams } from "../middleware/validate";
import { GetPublicMessagesQuerySchema, GetDMParamsSchema } from "./model";

const router = Router();

// GET /api/messages/public 전체 공개 메시지 조회
router.get("/public",
    validateQuery(GetPublicMessagesQuerySchema),
    isAuthenticated,
    getPublicMessageController
)

// GET /api/messages/dm/:userId 특정 사용자와의 DM 조회
router.get("/dm/:userId",
    validateParams(GetDMParamsSchema),
    isAuthenticated,
    getDMController
)

export default router
