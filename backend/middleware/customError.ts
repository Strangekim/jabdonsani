/**
 * 커스텀 에러 인터페이스 - statusCode와 isCustom 필드를 포함
 */
export interface CustomError extends Error {
    statusCode: number;
    isCustom: boolean;
}

/**
 * 커스텀 에러 생성 팩토리 함수
 * @param message 에러 메시지
 * @param statusCode HTTP 상태 코드
 * @returns CustomError 객체
 */
export const createCustomError = (message: string, statusCode: number): CustomError => {
    const error: CustomError = new Error(message) as CustomError;
    error.statusCode = statusCode;
    error.isCustom = true;
    return error;
};

// 인증 실패 에러 (401)
export const unAuthError = () => createCustomError("인증이 필요합니다.", 401);

// 중복 사용자 에러 (409)
export const conflictError = () => createCustomError("중복된 사용자명입니다.", 409);

// 이미 로그인 에러 (400)
export const alreadyLoggedInError = () => createCustomError("이미 로그인 되어 있습니다.", 400);

// 로그아웃 실패 에러 (500)
export const logoutFailedError = () => createCustomError("로그아웃에 실패했습니다.", 500);

// 잘못된 요청 에러 (400)
export const badRequestError = () => createCustomError("잘못된 요청입니다.", 400);
