/* ================================================================
   동향(Trend) 관련 타입 — api.md의 동향 API 응답을 기반으로 정의
   ================================================================ */

/** 동향 카드 데이터 */
export interface TrendItem {
    id: number;
    /** 수집 소스: hn | hfpapers | devto | lobsters */
    source: TrendSource;
    /** 분야 태그: ai | dev | robotics */
    fieldTag: TrendField;
    /** 소스 태그 목록 (예: ["#HackerNews"]) */
    sourceTags: string[];
    /** 분야 태그 목록 (예: ["#AI"]) */
    fieldTags: string[];
    /** 번역된 제목 */
    title: string;
    /** 번역된 본문 (원문 최대한 유지) */
    content: string;
    /** 썸네일 이미지 URL 배열 */
    thumbnails: string[];
    /** AI가 생성한 댓글 반응 요약 */
    commentSummary: string;
    /** 상위 댓글 목록 */
    topComments: TrendComment[];
    /** 원문 업보트 수 */
    upvotes: number;
    /** 조회수 */
    views: number;
    /** 원문 URL */
    originalUrl: string;
    /** 생성 시각 (ISO 8601) */
    createdAt: string;
}

/** 상위 댓글 */
export interface TrendComment {
    text: string;
    votes: number;
}

/** 수집 소스 타입 */
export type TrendSource =
    | 'hn'
    | 'hfpapers'
    | 'devto'
    | 'lobsters';

/** 분야 필터 타입 */
export type TrendField = 'ai' | 'dev' | 'robotics';

/** 동향 인기글 아이템 */
export interface TrendPopularItem {
    id: number;
    title: string;
    source: TrendSource;
    upvotes: number;
    createdAt: string;
}

/** 동향 검색 아이템 (relevance 추가) */
export interface TrendSearchItem extends TrendItem {
    relevance: number;
}
