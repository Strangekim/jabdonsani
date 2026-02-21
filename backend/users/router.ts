import { Router } from "express";
import { CreateUserSchema } from "./model";
import { validate } from "../middleware/validate";
import { createUserController } from "./controller/createUserController";
import { getUsersController } from "./controller/getUsersController";
import { getMeController } from "./controller/getMeController";
import { isNotAuthenticated, isAuthenticated } from "../middleware/auth";
import { LoginUserSchema } from "./model";
import { logInController } from "./controller/logInController";
import { logOutController } from "./controller/logOutController";

const router = Router();

// GET /api/users/me 현재 로그인한 사용자 정보 (세션 체크)
router.get("/me",
    isAuthenticated,
    getMeController
)

// GET /api/users 전체 사용자 조회
router.get("/",
    isAuthenticated,
    getUsersController
)

// POST /api/users 회원가입
router.post("/",
    isNotAuthenticated,
    validate(CreateUserSchema),
    createUserController
)

// POST /api/users/login 로그인
router.post("/login",
    validate(LoginUserSchema),
    logInController
)

// POST /api/users/logout 로그아웃
router.post("/logout",
    isAuthenticated,
    logOutController
)

export default router
