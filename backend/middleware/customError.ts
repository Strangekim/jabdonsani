/**
 * 커스텀 에러 인터페이스 - statusCode, code, isCustom 필드를 포함
 */
export interface CustomError extends Error {
    statusCode: number;
    code: string;
    isCustom: boolean;
}

/**
 * 커스텀 에러 생성 팩토리 함수
 * @param message 에러 메시지
 * @param statusCode HTTP 상태 코드
 * @param code 문자열 에러 코드 (ex. UNAUTHORIZED)
 * @returns CustomError 객체
 */
export const createCustomError = (message: string, statusCode: number, code: string): CustomError => {
    const error: CustomError = new Error(message) as CustomError;
    error.statusCode = statusCode;
    error.code = code;
    error.isCustom = true;
    return error;
};

// ============ 공통 에러 ============

// 인증 실패 에러 (401)
export const unAuthError = (message = "인증이 필요합니다.") =>
    createCustomError(message, 401, "UNAUTHORIZED");

// 잘못된 요청 에러 (400)
export const badRequestError = (message = "잘못된 요청입니다.", code = "BAD_REQUEST") =>
    createCustomError(message, 400, code);

// 리소스 미발견 에러 (404)
export const notFoundError = (message = "요청한 리소스가 존재하지 않습니다.", code = "NOT_FOUND") =>
    createCustomError(message, 404, code);

// 이미 로그인 에러 (400)
export const alreadyLoggedInError = () =>
    createCustomError("이미 로그인 되어 있습니다.", 400, "ALREADY_LOGGED_IN");

// 로그아웃 실패 에러 (500)
export const logoutFailedError = () =>
    createCustomError("로그아웃에 실패했습니다.", 500, "LOGOUT_FAILED");

// 중복 사용자 에러 (409)
export const conflictError = () =>
    createCustomError("중복된 사용자명입니다.", 409, "CONFLICT");
