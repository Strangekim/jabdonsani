/* ================================================================
   블로그(Post) 관련 타입 — api.md의 블로그 API 응답을 기반으로 정의
   ================================================================ */

/** 블로그 글 목록 아이템 */
export interface PostListItem {
    id: number;
    /** 글 제목 */
    title: string;
    /** 짧은 설명 */
    description: string;
    /** 태그 배열 */
    tags: string[];
    /** 조회수 */
    views: number;
    /** 작성 일시 (ISO 8601) */
    createdAt: string;
}

/** 블로그 글 상세 */
export interface PostDetail {
    id: number;
    title: string;
    /** Markdown 본문 */
    content: string;
    tags: string[];
    views: number;
    createdAt: string;
    updatedAt: string;
    /** 이전 글 정보 */
    prevPost: PostNavItem | null;
    /** 다음 글 정보 */
    nextPost: PostNavItem | null;
}

/** 이전/다음 글 네비게이션 아이템 */
export interface PostNavItem {
    id: number;
    title: string;
}

/** 블로그 인기 글 아이템 */
export interface PostPopularItem {
    id: number;
    title: string;
    views: number;
    createdAt: string;
}

/** 태그 클라우드 아이템 */
export interface TagItem {
    name: string;
    count: number;
}
