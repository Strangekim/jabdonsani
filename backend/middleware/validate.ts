import { RequestHandler } from 'express';
import { z, ZodSchema } from 'zod';
import { badRequestError } from './customError';

/**
 * 공통 id 검증 스키마 (숫자형 ID)
 */
export const numericIdSchema = z.object({
    id: z.string().regex(/^\d+$/, "INVALID_ID:ID는 숫자여야 합니다.")
});

/**
 * 공통 id 검증 스키마 (문자열 ID)
 */
export const stringIdSchema = z.object({
    id: z.string().min(1, "INVALID_ID:ID는 필수입니다.")
});

/**
 * ZodError를 파싱하여 CustomError로 변환
 */
const handleZodError = (e: unknown, next: Function) => {
    if (e instanceof z.ZodError) {
        const issues = e.issues;
        if (issues && issues.length > 0) {
            const firstError = issues[0];
            const msg = firstError.message;
            if (msg.includes(':')) {
                const [code, ...rest] = msg.split(':');
                return next(badRequestError(rest.join(':').trim(), code.trim()));
            }
            return next(badRequestError(msg, "BAD_REQUEST"));
        }
    }
    return next(badRequestError("잘못된 요청 파라미터입니다.", "BAD_REQUEST"));
};

/**
 * body 검증 미들웨어 — 검증 통과 시 파싱 결과로 req.body 덮어쓰기
 */
export const validate = (schema: ZodSchema): RequestHandler => (req, res, next) => {
    try {
        req.body = schema.parse(req.body);
        next();
    } catch (e) {
        handleZodError(e, next);
    }
};

/**
 * query 검증 미들웨어 — 검증 통과 시 validatedQuery에 파싱 결과 저장
 */
export const validateQuery = (schema: ZodSchema): RequestHandler => (req, res, next) => {
    try {
        (req as any).validatedQuery = schema.parse(req.query);
        next();
    } catch (e) {
        handleZodError(e, next);
    }
};

/**
 * params 검증 미들웨어 — 검증 통과 시 validatedParams에 파싱 결과 저장
 */
export const validateParams = (schema: ZodSchema): RequestHandler => (req, res, next) => {
    try {
        (req as any).validatedParams = schema.parse(req.params);
        next();
    } catch (e) {
        handleZodError(e, next);
    }
};
