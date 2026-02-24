'use client';

/* ================================================================
   useAuth 훅 — 인증 상태 조회 (React Query 기반)
   GET /api/auth/me 를 호출하여 서버 세션 기반으로 판별합니다.
   ================================================================ */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getMe } from '@/services/auth.service';

/**
 * 현재 로그인 상태를 반환하는 훅
 *
 * @returns isAuthenticated - 로그인 여부
 * @returns isLoading - 인증 상태 확인 중 여부
 */
export function useAuth() {
    const { data, isLoading } = useQuery({
        queryKey: queryKeys.auth.me(),
        queryFn: getMe,
        /* 인증 상태는 1분간 캐시 유지 */
        staleTime: 60 * 1000,
    });

    const isAuthenticated =
        data?.success === true ? data.data.authenticated : false;

    return { isAuthenticated, isLoading };
}
