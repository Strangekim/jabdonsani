'use client';

/* ================================================================
   useTags 훅 — 태그 클라우드 조회 (React Query 기반)
   ================================================================ */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getTags } from '@/services/tags.service';

/**
 * 블로그 태그 목록 조회 훅
 */
export function useTags() {
    const { data, isLoading } = useQuery({
        queryKey: queryKeys.tags.list(),
        queryFn: getTags,
        staleTime: 5 * 60 * 1000,
    });

    const tags = data?.success ? data.data : [];
    return { tags, isLoading };
}
