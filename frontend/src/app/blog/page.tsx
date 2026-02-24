/**
 * 블로그 글 목록 페이지 ("/blog")
 *
 * 2단 구조 — 좌측 PostList + 우측 사이드바(프로필, 태그, 인기글)
 * 실제 API 연동: usePosts, useTags, usePopularPosts
 */

import type { Metadata } from 'next';
import BlogClient from './BlogClient';

export const metadata: Metadata = {
    title: '블로그',
    description: '기술 블로그 — 개발과 기술에 대한 글을 공유합니다.',
};

export default function BlogPage() {
    return <BlogClient />;
}
