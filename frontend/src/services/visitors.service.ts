/* ================================================================
   방문자 서비스 — 순수 API 호출 함수 모음
   ================================================================ */

import { apiGet, apiPost } from '@/lib/api';

/** 방문자 수 응답 */
interface VisitorData {
    today: number;
    total: number;
}

/**
 * 방문자 수 조회 (오늘/총계)
 * GET /api/visitors
 */
export const getVisitors = () => apiGet<VisitorData>('/visitors');

/**
 * 방문 기록 추가
 * POST /api/visitors/track
 */
export const trackVisitor = () => apiPost<{ tracked: true }>('/visitors/track', {});
