/* ================================================================
   API 클라이언트 — 백엔드 API 호출을 위한 fetch 래퍼
   api.md의 공통 사항(Base URL, 응답 형식)을 반영합니다.
   ================================================================ */

import type { ApiResponse } from '@/types/api';

/** API 기본 URL */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * API 요청을 보내고 타입세이프한 응답을 반환하는 범용 fetch 래퍼
 *
 * @template T - 응답 data 필드의 타입
 * @param endpoint - API 경로 (예: '/trends', '/posts/1')
 * @param options - fetch 옵션 (method, body 등)
 * @returns 파싱된 API 응답
 */
export async function apiFetch<T>(
    endpoint: string,
    options?: RequestInit
): Promise<ApiResponse<T>> {
    const url = `${BASE_URL}${endpoint}`;

    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        ...options,
    });

    const data: ApiResponse<T> = await response.json();
    return data;
}

/**
 * GET 요청 간편 헬퍼
 *
 * @template T - 응답 data 필드의 타입
 * @param endpoint - API 경로
 * @param params - 쿼리 파라미터 객체 (선택)
 */
export async function apiGet<T>(
    endpoint: string,
    params?: Record<string, string | number | undefined>
): Promise<ApiResponse<T>> {
    /* undefined 값은 제외하고 쿼리스트링 구성 */
    const searchParams = new URLSearchParams();
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
                searchParams.set(key, String(value));
            }
        });
    }

    const query = searchParams.toString();
    const url = query ? `${endpoint}?${query}` : endpoint;

    return apiFetch<T>(url, { method: 'GET' });
}

/**
 * POST 요청 간편 헬퍼
 *
 * @template T - 응답 data 필드의 타입
 * @param endpoint - API 경로
 * @param body - 요청 본문 객체
 */
export async function apiPost<T>(
    endpoint: string,
    body?: unknown
): Promise<ApiResponse<T>> {
    return apiFetch<T>(endpoint, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
    });
}
