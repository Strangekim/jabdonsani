/**
 * PostList 컴포넌트 — 블로그 글 목록
 *
 * PostCard를 세로로 나열하는 래퍼 컴포넌트.
 */

import type { PostListItem } from '@/types/post';
import PostCard from './PostCard';

interface PostListProps {
    /** 블로그 글 데이터 배열 */
    posts: PostListItem[];
}

export default function PostList({ posts }: PostListProps) {
    return (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {posts.map((post) => (
                <PostCard key={post.id} post={post} />
            ))}

            {/* 데이터가 없을 때 안내 메시지 */}
            {posts.length === 0 && (
                <p
                    style={{
                        textAlign: 'center',
                        padding: '60px 0',
                        color: 'var(--color-text-muted)',
                        fontSize: '14px',
                    }}
                >
                    아직 작성된 글이 없습니다.
                </p>
            )}
        </section>
    );
}
