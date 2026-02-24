import { Router } from "express";
import { getPostsController } from "./controller/getPostsController";
import { getPostByIdController } from "./controller/getPostByIdController";
import { createPostController } from "./controller/createPostController";
import { updatePostController } from "./controller/updatePostController";
import { deletePostController } from "./controller/deletePostController";
import { getPopularPostsController } from "./controller/getPopularPostsController";
import { uploadPostImageController } from "./controller/uploadPostImageController";
import { isAuthenticated } from "../middleware/auth";
import { validate, validateParams, validateQuery, numericIdSchema } from "../middleware/validate";
import { postBodySchema, postsQuerySchema } from "./model";
import { uploadMiddleware } from "../config/multer";

const router = Router();

// GET /api/posts/popular 인기 글 TOP 5
router.get("/popular",
    getPopularPostsController
);

// POST /api/posts/upload 이미지 업로드 (인증 필요)
router.post("/upload",
    isAuthenticated,
    uploadMiddleware,
    uploadPostImageController
);

// GET /api/posts 글 목록 조회
router.get("/",
    validateQuery(postsQuerySchema),
    getPostsController
);

// GET /api/posts/:id 글 상세 조회
router.get("/:id",
    validateParams(numericIdSchema),
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
    validateParams(numericIdSchema),
    validate(postBodySchema),
    updatePostController
);

// DELETE /api/posts/:id 글 삭제 (인증 필요)
router.delete("/:id",
    isAuthenticated,
    validateParams(numericIdSchema),
    deletePostController
);

export default router;
