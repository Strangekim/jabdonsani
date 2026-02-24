'use client';

/* ================================================================
   usePostMutations 훅 — 블로그 글 작성·수정·삭제 뮤테이션
   성공 시 관련 쿼리를 자동 무효화하여 화면을 최신 상태로 유지합니다.
   ================================================================ */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { createPost, updatePost, deletePost } from '@/services/posts.service';
import type { PostBody } from '@/services/posts.service';

/**
 * 블로그 글 작성 뮤테이션
 * 성공 시 목록 쿼리를 무효화합니다.
 */
export function useCreatePost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (body: PostBody) => createPost(body),
        onSuccess: () => {
            /* 목록 전체 무효화 (태그 필터와 무관하게 모두) */
            queryClient.invalidateQueries({ queryKey: ['posts', 'list'] });
        },
    });
}

/**
 * 블로그 글 수정 뮤테이션
 * 성공 시 해당 글 상세와 목록을 무효화합니다.
 */
export function useUpdatePost(id: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (body: PostBody) => updatePost(id, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(id) });
            queryClient.invalidateQueries({ queryKey: ['posts', 'list'] });
        },
    });
}

/**
 * 블로그 글 삭제 뮤테이션
 * 성공 시 목록과 해당 상세 쿼리를 무효화합니다.
 */
export function useDeletePost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deletePost(id),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: ['posts', 'list'] });
            queryClient.removeQueries({ queryKey: queryKeys.posts.detail(id) });
        },
    });
}
