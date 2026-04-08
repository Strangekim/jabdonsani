import { Router } from "express";
import { submitScoreController } from "./controller/submitScoreController";
import { getRankingsController } from "./controller/getRankingsController";
import { validate, validateParams } from "../middleware/validate";
import { z } from "zod";

const router = Router();

// 게임 ID 검증 스키마
const gameIdSchema = z.object({
    gameId: z.string().min(1, "INVALID_GAME_ID:게임 ID는 필수입니다.")
});

// 점수 등록 body 검증 스키마
const scoreBodySchema = z.object({
    nickname: z.string()
        .min(1, "NICKNAME_REQUIRED:닉네임은 필수입니다.")
        .max(20, "NICKNAME_TOO_LONG:닉네임은 20자 이하여야 합니다."),
    score: z.number()
        .int("SCORE_INVALID:점수는 정수여야 합니다.")
        .min(0, "SCORE_INVALID:점수는 0 이상이어야 합니다.")
        .max(10000, "SCORE_INVALID:점수가 허용 범위를 초과했습니다.")
});

// GET /api/games/:gameId/rankings — 랭킹 조회
router.get("/:gameId/rankings",
    validateParams(gameIdSchema),
    getRankingsController
);

// POST /api/games/:gameId/scores — 점수 등록
router.post("/:gameId/scores",
    validateParams(gameIdSchema),
    validate(scoreBodySchema),
    submitScoreController
);

export default router;
