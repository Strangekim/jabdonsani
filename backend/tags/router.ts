import { Router } from "express";
import { getTagsController } from "./controller/getTagsController";

const router = Router();

// GET /api/tags 태그 목록 및 글 수 (태그 클라우드용)
router.get("/", getTagsController);

export default router;
