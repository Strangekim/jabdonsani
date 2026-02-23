import { Router } from "express";
import { z } from "zod";
import { getPostsController } from "./controller/getPostsController";
import { getPostByIdController } from "./controller/getPostByIdController";
import { createPostController } from "./controller/createPostController";
import { updatePostController } from "./controller/updatePostController";
import { deletePostController } from "./controller/deletePostController";
import { getPopularPostsController } from "./controller/getPopularPostsController";
import { uploadPostImageController } from "./controller/uploadPostImageController";
import { isAuthenticated } from "../middleware/auth";
import { validate, validateParams } from "../middleware/validate";

const router = Router();

// 파라미터 :id 검증 스키마
const idParamSchema = z.object({
    id: z.string().regex(/^\d+$/, "ID는 숫자여야 합니다.")
});

// 게시글 생성/수정 바디 검증 스키마
const postBodySchema = z.object({
    title: z.string().min(1, "제목은 필수입니다.").max(200, "제목이 너무 깁니다."),
    content: z.string().min(1, "내용은 필수입니다."),
    tags: z.array(z.string()).optional()
});

// GET /api/posts/popular 인기 글 TOP 5
router.get("/popular",
    getPopularPostsController
);

// POST /api/posts/upload 이미지 업로드 (인증 필요)
router.post("/upload",
    isAuthenticated,
    uploadPostImageController
);

// GET /api/posts 글 목록 조회
router.get("/",
    getPostsController
);

// GET /api/posts/:id 글 상세 조회
router.get("/:id",
    validateParams(idParamSchema),
    getPostByIdController
);

// POST /api/posts 글 작성 (인증 필요)
router.post("/",
    isAuthenticated,
    validate(postBodySchema),
    createPostController
);

// PUT /api/posts/:id 글 수정 (인증 필요)
router.put("/:id",
    isAuthenticated,
    validateParams(idParamSchema),
    validate(postBodySchema),
    updatePostController
);

// DELETE /api/posts/:id 글 삭제 (인증 필요)
router.delete("/:id",
    isAuthenticated,
    validateParams(idParamSchema),
    deletePostController
);

export default router;
