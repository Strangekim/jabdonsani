'use client';

/* ================================================================
   useAuthMutations 훅 — 로그인·로그아웃 뮤테이션
   성공 시 인증 상태 쿼리를 무효화하여 자동으로 최신 상태를 반영합니다.
   ================================================================ */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { login, logout } from '@/services/auth.service';

/** 로그인 요청 파라미터 */
interface LoginParams {
    id: string;
    password: string;
}

/**
 * 로그인 뮤테이션
 * 성공 시 인증 상태 캐시를 무효화합니다.
 */
export function useLogin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: LoginParams) => login(params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
        },
    });
}

/**
 * 로그아웃 뮤테이션
 * 성공 시 인증 상태 캐시를 무효화합니다.
 */
export function useLogout() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: logout,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
        },
    });
}
