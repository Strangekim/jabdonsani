'use client';

/**
 * 블로그 글 작성 페이지 ("/blog/write")
 *
 * 로그인하지 않은 경우 /login으로 리다이렉트합니다.
 */

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import PostForm from '@/components/blog/PostForm';
import { useAuth } from '@/hooks/useAuth';
import { useCreatePost } from '@/hooks/usePostMutations';
import type { PostBody } from '@/services/posts.service';

export default function WritePostPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const { mutate: createPost, isPending, error } = useCreatePost();

    /* 비로그인 시 로그인 페이지로 리다이렉트 */
    useEffect(() => {
        if (!isAuthLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthLoading, isAuthenticated, router]);

    /* 인증 확인 중 */
    if (isAuthLoading) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                인증 확인 중...
            </div>
        );
    }

    if (!isAuthenticated) return null;

    /** 글 작성 제출 */
    const handleSubmit = (values: PostBody) => {
        createPost(values, {
            onSuccess: (data) => {
                if (data.success) {
                    /* 작성 성공 시 해당 글 상세로 이동 */
                    router.push(`/blog/${data.data.id}`);
                }
            },
        });
    };

    const submitError = error instanceof Error ? error.message : undefined;

    return (
        <PostForm
            title="글 작성"
            isSubmitting={isPending}
            submitError={submitError}
            onSubmit={handleSubmit}
            cancelHref="/blog"
        />
    );
}
