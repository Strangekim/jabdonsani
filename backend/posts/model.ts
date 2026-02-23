import { z } from "zod";

// 게시글 생성/수정 바디 검증 스키마
export const postBodySchema = z.object({
    title: z.string().min(1, "TITLE_REQUIRED:제목은 필수입니다.").max(200, "INVALID_TITLE:제목이 너무 깁니다."),
    content: z.string().min(1, "CONTENT_REQUIRED:내용은 필수입니다."),
    tags: z.array(z.string()).optional()
});
