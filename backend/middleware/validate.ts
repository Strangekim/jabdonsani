import { RequestHandler } from 'express';
import { ZodSchema } from 'zod';
import { badRequestError } from './customError';

/**
 * body 검증 미들웨어
 * Zod 스키마로 req.body를 검증하고, 실패 시 400 에러 반환
 * @param schema Zod 스키마
 * @returns RequestHandler 미들웨어
 */
export const validate = (schema: ZodSchema): RequestHandler => (req, res, next) => {
    try {
        // body 데이터를 스키마로 검증
        schema.parse(req.body);
        next();
    } catch (e) {
        next(badRequestError());
    }
};

/**
 * query 검증 미들웨어
 * Zod 스키마로 req.query를 검증하고, 변환된 값을 req.validatedQuery에 저장
 * @param schema Zod 스키마
 * @returns RequestHandler 미들웨어
 */
export const validateQuery = (schema: ZodSchema): RequestHandler => (req, res, next) => {
    try {
        // 검증 후 변환된 값을 별도 속성에 저장 (타입 호환성 유지)
        (req as any).validatedQuery = schema.parse(req.query);
        next();
    } catch (e) {
        next(badRequestError());
    }
};

/**
 * params 검증 미들웨어
 * Zod 스키마로 req.params를 검증하고, 변환된 값을 req.validatedParams에 저장
 * @param schema Zod 스키마
 * @returns RequestHandler 미들웨어
 */
export const validateParams = (schema: ZodSchema): RequestHandler => (req, res, next) => {
    try {
        // 검증 후 변환된 값을 별도 속성에 저장
        (req as any).validatedParams = schema.parse(req.params);
        next();
    } catch (e) {
        next(badRequestError());
    }
};
