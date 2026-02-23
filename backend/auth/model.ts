import { z } from "zod";

// 로그인 바디 검증 스키마
export const loginSchema = z.object({
    id: z.string().min(1, "BAD_REQUEST:아이디를 입력해주세요."),
    password: z.string().min(1, "BAD_REQUEST:비밀번호를 입력해주세요.")
});

export type LoginBody = z.infer<typeof loginSchema>;
