'use client';

/* ================================================================
   BlogClient — 블로그 목록 페이지 클라이언트 컴포넌트
   - 태그 필터 상태를 관리합니다.
   - usePosts / useTags / usePopularPosts 훅과 연동합니다.
   - useInfiniteScroll로 스크롤 기반 무한 로딩을 구현합니다.
   ================================================================ */

import { useState } from 'react';
import PostList from '@/components/blog/PostList';
import WriteButton from '@/components/blog/WriteButton';
import Sidebar from '@/components/common/Sidebar';
import ProfileWidget from '@/components/blog/ProfileWidget';
import TagCloud from '@/components/blog/TagCloud';
import BlogPopularWidget from '@/components/blog/BlogPopularWidget';
import { usePosts, usePopularPosts } from '@/hooks/usePosts';
import { useTags } from '@/hooks/useTags';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { MOCK_POSTS, MOCK_POPULAR_POSTS, MOCK_TAGS } from '@/lib/mockData';

export default function BlogClient() {
    /* 태그 필터 상태 */
    const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);

    /* 블로그 목록 무한 스크롤 */
    const {
        items: itemsRaw,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
    } = usePosts(selectedTag);

    /* 사이드바 데이터 */
    const { tags: tagsRaw } = useTags();
    const { items: popularItemsRaw } = usePopularPosts();

    /* 백엔드 미연결 시 더미 데이터 fallback */
    const items = (!isLoading && (isError || itemsRaw.length === 0)) ? MOCK_POSTS : itemsRaw;
    const tags = tagsRaw.length === 0 ? MOCK_TAGS : tagsRaw;
    const popularItems = popularItemsRaw.length === 0 ? MOCK_POPULAR_POSTS : popularItemsRaw;

    /* 무한 스크롤 sentinel ref */
    const { sentinelRef } = useInfiniteScroll({
        onLoadMore: fetchNextPage,
        hasMore: hasNextPage,
        isLoading: isFetchingNextPage,
    });

    /* 태그 클릭 시 해당 태그로 필터 (이미 선택된 경우 해제) */
    const handleTagClick = (tagName: string) => {
        setSelectedTag((prev) => (prev === tagName ? undefined : tagName));
    };

    return (
        <main className="page-layout page-layout-sub">
            {/* 좌측: 글 목록 */}
            <section>
                {/* 현재 태그 필터 표시 */}
                {selectedTag && (
                    <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                            태그 필터:
                        </span>
                        <button
                            onClick={() => setSelectedTag(undefined)}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '4px 10px', background: 'var(--color-accent-light)',
                                color: 'var(--color-accent)', borderRadius: '999px',
                                fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer',
                            }}
                        >
                            {selectedTag}
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                        </button>
                    </div>
                )}

                {/* 글 만들기 버튼 (로그인 시 노출) */}
                <WriteButton />

                {isLoading && items.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        불러오는 중...
                    </div>
                ) : items.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        {selectedTag ? `"${selectedTag}" 태그에 해당하는 글이 없습니다.` : '작성된 글이 없습니다.'}
                    </div>
                ) : (
                    <PostList posts={items} />
                )}

                {/* 무한 스크롤 sentinel */}
                <div ref={sentinelRef}>
                    {isFetchingNextPage && (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            더 불러오는 중...
                        </div>
                    )}
                </div>
            </section>

            {/* 우측: 사이드바 */}
            <Sidebar>
                <ProfileWidget />
                {/* 태그 클릭 시 필터 적용 */}
                <TagCloud tags={tags} onTagClick={handleTagClick} activeTag={selectedTag} />
                <BlogPopularWidget items={popularItems} />
            </Sidebar>
        </main>
    );
}
