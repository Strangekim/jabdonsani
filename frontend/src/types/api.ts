/* ================================================================
   API 공통 타입 — 백엔드 API 응답 형식을 TypeScript로 정의
   api.md의 공통 응답 형식을 기반으로 합니다.
   ================================================================ */

/** API 성공 응답 */
export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
}

/** API 에러 응답 */
export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
    };
}

/** API 응답 유니온 타입 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/** 커서 기반 페이지네이션 응답 필드 */
export interface PaginatedData<T> {
    items: T[];
    nextCursor: string | null;
    hasMore: boolean;
    totalCount: number;
}

/** 커서 기반 페이지네이션 요청 파라미터 */
export interface PaginationParams {
    cursor?: string;
    limit?: number;
}
