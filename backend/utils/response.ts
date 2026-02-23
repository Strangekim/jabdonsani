import { Response } from "express";

/**
 * 공통 성공 응답 래퍼 함수
 * @param res Express Response 객체
 * @param data 응답할 데이터
 * @param statusCode HTTP 상태 코드 (기본값 200)
 */
export const sendSuccess = <T>(res: Response, data: T, statusCode: number = 200) => {
    res.status(statusCode).json({
        success: true,
        data
    });
};
