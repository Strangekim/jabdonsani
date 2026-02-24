/* ================================================================
   태그 서비스 — 순수 API 호출 함수 모음
   ================================================================ */

import { apiGet } from '@/lib/api';
import type { TagItem } from '@/types/post';

/**
 * 블로그 태그 목록 조회
 * GET /api/tags
 */
export const getTags = () => apiGet<TagItem[]>('/tags');
