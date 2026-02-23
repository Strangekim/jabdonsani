/**
 * 커서 기반 페이지네이션 공통 응답 포맷
 */
export interface CursorPage<T> {
    items: T[];
    nextCursor: string | null;
    hasMore: boolean;
    totalCount: number;
}
