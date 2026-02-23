/**
 * 블로그 글 목록 페이지 ("/blog")
 *
 * 프로토타입 blog.html의 레이아웃:
 * 2단 구조 — 좌측 PostList + 우측 사이드바(프로필, 태그, 인기글)
 *
 * NOTE: 현재는 더미 데이터로 스캐폴딩.
 */

import type { Metadata } from 'next';
import PostList from '@/components/blog/PostList';
import Sidebar from '@/components/common/Sidebar';
import ProfileWidget from '@/components/blog/ProfileWidget';
import TagCloud from '@/components/blog/TagCloud';
import BlogPopularWidget from '@/components/blog/BlogPopularWidget';
import type { PostListItem, TagItem, PostPopularItem } from '@/types/post';

export const metadata: Metadata = {
    title: '블로그',
    description: '기술 블로그 — 개발과 기술에 대한 글을 공유합니다.',
};

/** 더미 블로그 글 데이터 */
const DUMMY_POSTS: PostListItem[] = [
    {
        id: 1,
        title: 'Next.js 16 App Router 완벽 가이드',
        description:
            'Next.js 16의 App Router를 활용한 프로젝트 구성 방법을 단계별로 알아봅니다. 레이아웃, 라우팅, 데이터 패칭까지.',
        tags: ['Next.js', 'React', 'TypeScript'],
        views: 1240,
        createdAt: '2026-02-18T09:00:00Z',
    },
    {
        id: 2,
        title: 'TypeScript 고급 패턴 모음',
        description:
            '실무에서 자주 사용하는 TypeScript 고급 타입 패턴과 제네릭 활용법을 정리합니다.',
        tags: ['TypeScript', '개발'],
        views: 892,
        createdAt: '2026-02-10T15:30:00Z',
    },
    {
        id: 3,
        title: 'Oracle Cloud Free Tier로 블로그 운영하기',
        description:
            'Oracle Cloud의 무료 ARM 인스턴스를 활용하여 개인 블로그를 호스팅하는 방법을 공유합니다.',
        tags: ['클라우드', '인프라', 'DevOps'],
        views: 654,
        createdAt: '2026-01-28T11:00:00Z',
    },
];

/** 더미 태그 데이터 */
const DUMMY_TAGS: TagItem[] = [
    { name: 'TypeScript', count: 8 },
    { name: 'Next.js', count: 5 },
    { name: 'React', count: 4 },
    { name: 'AI', count: 3 },
    { name: '클라우드', count: 2 },
    { name: 'DevOps', count: 2 },
    { name: '개발', count: 6 },
];

/** 더미 인기글 데이터 */
const DUMMY_POPULAR: PostPopularItem[] = [
    {
        id: 1,
        title: 'Next.js 16 App Router 완벽 가이드',
        views: 1240,
        createdAt: '2026-02-18T09:00:00Z',
    },
    {
        id: 2,
        title: 'TypeScript 고급 패턴 모음',
        views: 892,
        createdAt: '2026-02-10T15:30:00Z',
    },
];

export default function BlogPage() {
    return (
        <main className="page-layout page-layout-sub">
            {/* 좌측: 글 목록 */}
            <PostList posts={DUMMY_POSTS} />

            {/* 우측: 사이드바 */}
            <Sidebar>
                <ProfileWidget />
                <TagCloud tags={DUMMY_TAGS} />
                <BlogPopularWidget items={DUMMY_POPULAR} />
            </Sidebar>
        </main>
    );
}
