'use client';

/* ================================================================
   usePost 훅 — 블로그 글 상세 조회 (React Query 기반)
   ================================================================ */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getPost } from '@/services/posts.service';

/**
 * 블로그 글 상세 조회 훅
 *
 * @param id - 글 ID
 */
export function usePost(id: number) {
    const { data, isLoading, isError } = useQuery({
        queryKey: queryKeys.posts.detail(id),
        queryFn: () => getPost(id),
        staleTime: 60 * 1000,
    });

    const post = data?.success ? data.data : null;

    return { post, isLoading, isError };
}
