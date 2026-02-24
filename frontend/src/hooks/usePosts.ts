'use client';

/* ================================================================
   usePosts 훅 — 블로그 목록 무한 스크롤 (React Query 기반)
   태그 필터 변경 시 쿼리 키가 바뀌어 자동 초기화됩니다.
   ================================================================ */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getPosts, getPopularPosts } from '@/services/posts.service';
import type { PostListItem } from '@/types/post';

/**
 * 블로그 목록 무한 스크롤 훅
 * - tag 필터가 바뀌면 쿼리 키가 바뀌어 자동으로 처음부터 다시 로드합니다.
 */
export function usePosts(tag?: string) {
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
    } = useInfiniteQuery({
        queryKey: queryKeys.posts.list({ tag }),
        queryFn: ({ pageParam }) =>
            getPosts({
                tag: tag || undefined,
                cursor: pageParam as string | undefined,
                limit: 10,
            }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => {
            if (lastPage.success && lastPage.data.hasMore) {
                return lastPage.data.nextCursor ?? undefined;
            }
            return undefined;
        },
    });

    /* 모든 페이지의 items를 하나의 배열로 합칩니다 */
    const items: PostListItem[] = data?.pages.flatMap((page) =>
        page.success ? page.data.items : []
    ) ?? [];

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
 * 블로그 인기글 훅
 */
export function usePopularPosts() {
    const { data, isLoading } = useQuery({
        queryKey: queryKeys.posts.popular(),
        queryFn: getPopularPosts,
        staleTime: 5 * 60 * 1000,
    });

    const items = data?.success ? data.data : [];
    return { items, isLoading };
}
