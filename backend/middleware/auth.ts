import { unAuthError, alreadyLoggedInError } from "./customError";
import { RequestHandler } from "express";

/**
 * 로그인 여부 확인 미들웨어
 * 세션에 userId가 없으면 401 에러 발생
 */
export const isAuthenticated: RequestHandler = (req, res, next) => {
    // 세션에서 userId 존재 여부 확인
    if (!req.session.userId) {
        throw unAuthError();
    }
    next();
}

/**
 * 비로그인 여부 확인 미들웨어
 * 이미 로그인 상태이면 400 에러 발생
 */
export const isNotAuthenticated: RequestHandler = (req, res, next) => {
    // 이미 로그인된 사용자인지 확인
    if (req.session.userId) {
        throw alreadyLoggedInError();
    }
    next();
}
