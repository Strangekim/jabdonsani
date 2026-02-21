import { z } from "zod";

// 회원가입/로그인 공통 입력 스키마
const UserCredentialsSchema = z.object({
    username: z
        .string()
        .min(4)
        .max(20)
        .regex(/^[a-zA-Z0-9]+$/, "아이디는 영문과 숫자만 입력 가능합니다."),
    password: z.string().min(8),
});

// 회원가입 스키마
export const CreateUserSchema = UserCredentialsSchema;

// 로그인 스키마
export const LoginUserSchema = UserCredentialsSchema;
