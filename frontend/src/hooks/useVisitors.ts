'use client';

/* ================================================================
   useVisitors 훅 — 방문자 수(Today/Total) 조회 (React Query 기반)
   헤더의 방문자 배지에서 사용합니다.
   ================================================================ */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import { getVisitors, trackVisitor } from '@/services/visitors.service';

const SESSION_KEY = 'jabdonsani_visited';

/**
 * 방문자 수를 API에서 조회하는 훅
 *
 * @returns data - 방문자 수 (today, total)
 * @returns isLoading - 로딩 중 여부
 * @returns error - 에러 여부
 */
export function useVisitors() {
    const { data, isLoading, isError } = useQuery({
        queryKey: queryKeys.visitors.count(),
        queryFn: getVisitors,
        /* 방문자 수는 5분간 캐시 유지 */
        staleTime: 5 * 60 * 1000,
    });

    const visitors =
        data?.success === true ? data.data : null;

    return {
        data: visitors,
        isLoading,
        error: isError ? '방문자 수를 불러오는데 실패했습니다.' : null,
    };
}

/**
 * 방문 기록 훅 — 세션 당 1회만 POST /api/visitors/track 호출
 * sessionStorage에 방문 여부를 기록해 탭 새로고침 시 중복 카운트를 방지합니다.
 */
export function useTrackVisitor() {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (sessionStorage.getItem(SESSION_KEY)) return;

        trackVisitor()
            .then(() => {
                sessionStorage.setItem(SESSION_KEY, '1');
                /* 카운트 표시를 즉시 갱신 */
                queryClient.invalidateQueries({ queryKey: queryKeys.visitors.count() });
            })
            .catch(() => {
                /* 추적 실패는 무시 — 사용자 경험에 영향 없음 */
            });
    }, [queryClient]);
}
