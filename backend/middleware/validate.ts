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
 * ZodError를 파싱하여 CustomError 로 변환
 */
const handleZodError = (e: any, next: any) => {
    if (e instanceof z.ZodError) {
        const zodError = e as z.ZodError;
        const firstError = zodError.errors[0];
        const msg = firstError.message;
        if (msg.includes(':')) {
            const [code, ...rest] = msg.split(':');
            return next(badRequestError(rest.join(':').trim(), code.trim()));
        }
        return next(badRequestError(msg, "BAD_REQUEST"));
    }
    return next(badRequestError());
};

/**
 * body 검증 미들웨어
 */
export const validate = (schema: ZodSchema): RequestHandler => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (e) {
        handleZodError(e, next);
    }
};

/**
 * query 검증 미들웨어
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
 * params 검증 미들웨어
 */
export const validateParams = (schema: ZodSchema): RequestHandler => (req, res, next) => {
    try {
        (req as any).validatedParams = schema.parse(req.params);
        next();
    } catch (e) {
        handleZodError(e, next);
    }
};
