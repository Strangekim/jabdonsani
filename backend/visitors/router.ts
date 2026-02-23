import { Router } from "express";
import { getVisitorsController } from "./controller/getVisitorsController";
import { trackVisitorController } from "./controller/trackVisitorController";

const router = Router();

// GET /api/visitors 검색/방문자 통계(Today, Total)
router.get("/",
    getVisitorsController
);

// POST /api/visitors/track 방문 기록 추가
router.post("/track",
    trackVisitorController
);

export default router;
