'use client';

/* ================================================================
   useTools 훅 — 도구 사용량 통계 조회 (React Query 기반)
   ================================================================ */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getToolUsage } from '@/services/tools.service';

/**
 * 도구 사용량 통계 조회 훅
 */
export function useToolUsage() {
    const { data, isLoading } = useQuery({
        queryKey: queryKeys.tools.usage(),
        queryFn: getToolUsage,
        staleTime: 5 * 60 * 1000,
    });

    const items = data?.success ? data.data : [];
    return { items, isLoading };
}
