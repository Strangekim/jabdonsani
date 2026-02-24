/* ================================================================
   React Query 클라이언트 설정
   전역 기본값을 여기서 관리합니다.
   ================================================================ */

import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient 싱글턴 팩토리
 * - staleTime: 30초 → 동일 데이터 30초 내 재요청 없음
 * - retry: 1 → 실패 시 1회만 재시도
 * - refetchOnWindowFocus: false → 탭 전환 시 자동 재요청 비활성화
 */
export function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30 * 1000,
                retry: 1,
                refetchOnWindowFocus: false,
            },
        },
    });
}
