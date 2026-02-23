import { z } from "zod";

// 로그인 바디 검증 스키마
export const loginSchema = z.object({
    password: z.string().min(1, "비밀번호를 입력해주세요.")
});
