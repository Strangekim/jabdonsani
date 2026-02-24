'use client';

/* ================================================================
   useTrends 훅 — 동향 목록 무한 스크롤 (React Query 기반)
   분야·소스 필터 변경 시 쿼리 키가 바뀌어 자동 초기화됩니다.
   ================================================================ */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getTrends, searchTrends, getPopularTrends } from '@/services/trends.service';
import type { TrendItem } from '@/types/trend';

/** 동향 무한 스크롤 훅 파라미터 */
interface UseTrendsParams {
    field?: string;
    source?: string;
}

/**
 * 동향 목록 무한 스크롤 훅
 * - field, source가 바뀌면 쿼리 키가 바뀌어 자동으로 처음부터 다시 로드합니다.
 */
export function useTrends({ field, source }: UseTrendsParams = {}) {
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
    } = useInfiniteQuery({
        queryKey: queryKeys.trends.list({ field, source }),
        queryFn: ({ pageParam }) =>
            getTrends({
                field: field || undefined,
                source: source || undefined,
                cursor: pageParam as string | undefined,
                limit: 20,
            }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => {
            /* API 응답에서 nextCursor 추출 */
            if (lastPage.success && lastPage.data.hasMore) {
                return lastPage.data.nextCursor ?? undefined;
            }
            return undefined;
        },
    });

    /* 모든 페이지의 items를 하나의 배열로 합칩니다 */
    const items: TrendItem[] = data?.pages.flatMap((page) =>
        page.success ? page.data.items : []
    ) ?? [];

    /* 첫 번째 페이지의 totalCount 사용 */
    const totalCount =
        data?.pages[0]?.success ? data.pages[0].data.totalCount : 0;

    return {
        items,
        totalCount,
        fetchNextPage,
        hasNextPage: hasNextPage ?? false,
        isFetchingNextPage,
        isLoading,
        isError,
    };
}

/**
 * 동향 검색 훅
 * - query가 2자 이상일 때만 실제 API를 호출합니다.
 */
export function useSearchTrends(query: string) {
    const enabled = query.trim().length >= 2;

    const { data, isLoading, isError } = useQuery({
        queryKey: queryKeys.trends.search(query),
        queryFn: () => searchTrends(query),
        enabled,
        staleTime: 30 * 1000,
    });

    const items = data?.success ? data.data : [];

    return { items, isLoading: enabled && isLoading, isError };
}

/**
 * 동향 인기글 훅
 */
export function usePopularTrends() {
    const { data, isLoading } = useQuery({
        queryKey: queryKeys.trends.popular(),
        queryFn: getPopularTrends,
        staleTime: 5 * 60 * 1000,
    });

    const items = data?.success ? data.data : [];
    return { items, isLoading };
}
