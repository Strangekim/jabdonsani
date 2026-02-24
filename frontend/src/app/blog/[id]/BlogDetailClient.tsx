'use client';

/* ================================================================
   BlogDetailClient — 블로그 글 상세 클라이언트 컴포넌트
   - usePost 훅으로 글 데이터를 조회합니다.
   - 로그인 상태일 때 수정/삭제 버튼을 표시합니다.
   ================================================================ */

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PostContent from '@/components/blog/PostContent';
import PostNav from '@/components/blog/PostNav';
import { usePost } from '@/hooks/usePost';
import { useAuth } from '@/hooks/useAuth';
import { useDeletePost } from '@/hooks/usePostMutations';

interface BlogDetailClientProps {
    postId: number;
}

export default function BlogDetailClient({ postId }: BlogDetailClientProps) {
    const router = useRouter();
    const { post, isLoading, isError } = usePost(postId);
    const { isAuthenticated } = useAuth();
    const { mutate: deletePost, isPending: isDeleting } = useDeletePost();

    /* 삭제 확인 후 실행 */
    const handleDelete = () => {
        if (!confirm('글을 삭제하시겠습니까?')) return;
        deletePost(postId, {
            onSuccess: (data) => {
                if (data.success) {
                    router.push('/blog');
                }
            },
        });
    };

    if (isLoading) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                불러오는 중...
            </div>
        );
    }

    if (isError || !post) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                글을 불러오는데 실패했습니다.
            </div>
        );
    }

    return (
        <main>
            {/* 관리자 액션 버튼 (로그인 시만 표시) */}
            {isAuthenticated && (
                <div style={{
                    display: 'flex', justifyContent: 'flex-end', gap: '8px',
                    maxWidth: '720px', margin: '0 auto', padding: '16px 24px 0',
                }}>
                    <Link
                        href={`/blog/${postId}/edit`}
                        style={{
                            padding: '6px 14px', background: 'var(--color-card-bg)',
                            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                            fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)',
                            textDecoration: 'none',
                        }}
                    >
                        수정
                    </Link>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        style={{
                            padding: '6px 14px', background: '#e11d48', border: 'none',
                            borderRadius: 'var(--radius-md)', fontSize: '13px',
                            fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: isDeleting ? 0.6 : 1,
                        }}
                    >
                        {isDeleting ? '삭제 중...' : '삭제'}
                    </button>
                </div>
            )}

            {/* 글 본문 */}
            <PostContent post={post} />

            {/* 이전/다음 글 네비게이션 */}
            <PostNav prevPost={post.prevPost} nextPost={post.nextPost} />
        </main>
    );
}
