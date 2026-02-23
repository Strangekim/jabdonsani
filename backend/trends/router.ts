import { Router } from "express";
import { getTrendsController } from "./controller/getTrendsController";
import { searchTrendsController } from "./controller/searchTrendsController";
import { getPopularTrendsController } from "./controller/getPopularTrendsController";
import { validateQuery } from "../middleware/validate";
import { trendsQuerySchema, searchQuerySchema } from "./model";

const router = Router();

// GET /api/trends/search 동향 검색 (커서 기반) — 반드시 /popular, /search를 /:id보다 먼저
router.get("/search",
    validateQuery(searchQuerySchema),
    searchTrendsController
);

// GET /api/trends/popular 오늘의 인기글 TOP 5
router.get("/popular",
    getPopularTrendsController
);

// GET /api/trends 동향 카드 목록 조회 (커서 기반)
router.get("/",
    validateQuery(trendsQuerySchema),
    getTrendsController
);

export default router;
