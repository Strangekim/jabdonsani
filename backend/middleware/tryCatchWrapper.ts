import { RequestHandler } from "express";

/**
 * async 컨트롤러를 감싸서 에러를 자동으로 next()로 전달하는 래퍼 함수
 * @param fn 비동기 컨트롤러 함수
 * @returns 에러 핸들링이 추가된 RequestHandler
 */
export const tryCatchWrapper = (fn: RequestHandler): RequestHandler => {
    return async (req, res, next) => {
        try {
            await fn(req, res, next);
        } catch (error) {
            // 에러 발생 시 공통 에러 핸들러로 전달
            next(error);
        }
    };
};
