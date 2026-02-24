'use client';

/**
 * 블로그 글 수정 페이지 ("/blog/[id]/edit")
 *
 * - 기존 글 데이터를 로드하여 PostForm에 초기값으로 전달합니다.
 * - 로그인하지 않은 경우 /login으로 리다이렉트합니다.
 */

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PostForm from '@/components/blog/PostForm';
import { usePost } from '@/hooks/usePost';
import { useAuth } from '@/hooks/useAuth';
import { useUpdatePost } from '@/hooks/usePostMutations';
import type { PostBody } from '@/services/posts.service';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function EditPostPage({ params }: PageProps) {
    /* Next.js 16: params는 Promise, use()로 언래핑 */
    const { id } = use(params);
    const postId = Number(id);

    const router = useRouter();
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const { post, isLoading: isPostLoading } = usePost(postId);
    const { mutate: updatePost, isPending, error } = useUpdatePost(postId);

    /* 비로그인 시 리다이렉트 */
    useEffect(() => {
        if (!isAuthLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthLoading, isAuthenticated, router]);

    if (isAuthLoading || isPostLoading) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                불러오는 중...
            </div>
        );
    }

    if (!isAuthenticated || !post) return null;

    /** 글 수정 제출 */
    const handleSubmit = (values: PostBody) => {
        updatePost(values, {
            onSuccess: (data) => {
                if (data.success) {
                    router.push(`/blog/${postId}`);
                }
            },
        });
    };

    const submitError = error instanceof Error ? error.message : undefined;

    return (
        <PostForm
            title="글 수정"
            initialValues={{
                title: post.title,
                description: '',
                content: post.content,
                tags: post.tags,
            }}
            isSubmitting={isPending}
            submitError={submitError}
            onSubmit={handleSubmit}
            cancelHref={`/blog/${postId}`}
        />
    );
}
