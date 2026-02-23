import { Router } from "express";
import { z } from "zod";
import { logInController } from "./controller/logInController";
import { logOutController } from "./controller/logOutController";
import { getMeController } from "./controller/getMeController";
import { isAuthenticated, isNotAuthenticated } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

// 로그인 바디 검증 스키마
const loginSchema = z.object({
    password: z.string().min(1, "비밀번호를 입력해주세요.")
});

// POST /api/auth/login 관리자 로그인
router.post("/login",
    isNotAuthenticated,
    validate(loginSchema),
    logInController
);

// POST /api/auth/logout 로그아웃
router.post("/logout",
    isAuthenticated,
    logOutController
);

// GET /api/auth/me 현재 로그인 상태 확인
router.get("/me",
    isAuthenticated,
    getMeController
);

export default router;
