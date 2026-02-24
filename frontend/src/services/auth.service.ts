/* ================================================================
   인증 서비스 — 순수 API 호출 함수 모음
   React 훅 없이 API만 호출하므로 어디서든 import 가능합니다.
   ================================================================ */

import { apiGet, apiPost } from '@/lib/api';

/** 로그인 요청 본문 */
interface LoginBody {
    id: string;
    password: string;
}

/** 인증 상태 응답 */
interface MeResponse {
    authenticated: boolean;
}

/**
 * 현재 세션 인증 상태 조회
 * GET /api/auth/me
 */
export const getMe = () => apiGet<MeResponse>('/auth/me');

/**
 * 로그인
 * POST /api/auth/login
 */
export const login = (body: LoginBody) => apiPost<null>('/auth/login', body);

/**
 * 로그아웃
 * POST /api/auth/logout
 */
export const logout = () => apiPost<null>('/auth/logout');
