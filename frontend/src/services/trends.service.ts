/* ================================================================
   동향 서비스 — 순수 API 호출 함수 모음
   ================================================================ */

import { apiGet } from '@/lib/api';
import type { PaginatedData } from '@/types/api';
import type { TrendItem, TrendPopularItem, TrendSearchItem } from '@/types/trend';

/** 동향 목록 조회 파라미터 */
export interface GetTrendsParams {
    /** 분야 필터 (ai | dev | robotics), 미지정 시 전체 */
    field?: string;
    /** 소스 필터 (hn | localllama | ml | programming | robotics), 미지정 시 전체 */
    source?: string;
    /** 커서 기반 페이지네이션 커서 */
    cursor?: string;
    /** 페이지당 항목 수 (기본: 20) */
    limit?: number;
}

/**
 * 동향 목록 조회 (커서 기반 페이지네이션)
 * GET /api/trends
 */
export const getTrends = (params?: GetTrendsParams) =>
    apiGet<PaginatedData<TrendItem>>('/trends', {
        field: params?.field || undefined,
        source: params?.source || undefined,
        cursor: params?.cursor,
        limit: params?.limit ?? 20,
    });

/**
 * 동향 검색
 * GET /api/trends/search?q={query}
 */
export const searchTrends = (query: string) =>
    apiGet<TrendSearchItem[]>('/trends/search', { q: query });

/**
 * 동향 인기글 조회
 * GET /api/trends/popular
 */
export const getPopularTrends = () =>
    apiGet<TrendPopularItem[]>('/trends/popular');
