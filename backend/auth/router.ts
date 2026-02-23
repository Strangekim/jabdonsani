import { Router } from "express";
import { logInController } from "./controller/logInController";
import { logOutController } from "./controller/logOutController";
import { getMeController } from "./controller/getMeController";

const router = Router();

// POST /api/auth/login 관리자 로그인
router.post("/login", logInController);

// POST /api/auth/logout 로그아웃
router.post("/logout", logOutController);

// GET /api/auth/me 현재 로그인 상태 확인
router.get("/me", getMeController);

export default router;
