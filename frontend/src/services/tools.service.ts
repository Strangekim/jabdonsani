/* ================================================================
   도구 서비스 — 순수 API 호출 함수 모음
   ================================================================ */

import { apiGet, apiPost } from '@/lib/api';
import type { ToolUsageItem } from '@/types/tool';

/**
 * 도구 사용량 통계 조회
 * GET /api/tools/usage
 */
export const getToolUsage = () => apiGet<ToolUsageItem[]>('/tools/usage');

/**
 * 도구 사용 횟수 증가
 * POST /api/tools/:id/use
 */
export const recordToolUse = (toolId: string) =>
    apiPost<null>(`/tools/${toolId}/use`);
