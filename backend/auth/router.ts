import { Router } from "express";
import { logInController } from "./controller/logInController";
import { logOutController } from "./controller/logOutController";
import { getMeController } from "./controller/getMeController";
import { isAuthenticated, isNotAuthenticated } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { loginSchema } from "./model";

const router = Router();

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
