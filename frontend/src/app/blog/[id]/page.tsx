/**
 * 블로그 글 상세 페이지 ("/blog/[id]")
 *
 * 프로토타입 blog-detail.html의 레이아웃:
 * 중앙 정렬 본문 + 하단 이전/다음 네비게이션
 *
 * NOTE: 현재는 더미 데이터로 스캐폴딩.
 */

import type { Metadata } from 'next';
import PostContent from '@/components/blog/PostContent';
import PostNav from '@/components/blog/PostNav';
import type { PostDetail } from '@/types/post';

export const metadata: Metadata = {
    title: '글 상세',
};

/** 더미 글 상세 데이터 */
const DUMMY_POST: PostDetail = {
    id: 1,
    title: 'Next.js 16 App Router 완벽 가이드',
    content: `
    <h2>1. 프로젝트 구조</h2>
    <p>Next.js 16의 App Router는 파일 시스템 기반 라우팅을 제공합니다. 
    <code>app</code> 디렉토리 내의 폴더 구조가 곧 URL 경로가 됩니다.</p>
    
    <h3>기본 구조</h3>
    <pre><code>app/
├── layout.tsx    # 루트 레이아웃
├── page.tsx      # 메인 페이지
├── blog/
│   ├── page.tsx  # /blog
│   └── [id]/
│       └── page.tsx  # /blog/:id</code></pre>
    
    <h2>2. 레이아웃 시스템</h2>
    <p>레이아웃은 여러 페이지 간에 공유되는 UI를 정의합니다. 
    페이지 이동 시 레이아웃은 리렌더링되지 않아 <strong>성능이 뛰어납니다</strong>.</p>
    
    <blockquote>
      레이아웃은 중첩 가능하며, 각 세그먼트의 layout.tsx가 자동으로 적용됩니다.
    </blockquote>
    
    <h2>3. 데이터 패칭</h2>
    <p>서버 컴포넌트에서 <code>async/await</code>를 직접 사용하여 데이터를 
    가져올 수 있습니다.</p>
  `,
    tags: ['Next.js', 'React', 'TypeScript'],
    views: 1240,
    createdAt: '2026-02-18T09:00:00Z',
    updatedAt: '2026-02-19T14:30:00Z',
    prevPost: null,
    nextPost: { id: 2, title: 'TypeScript 고급 패턴 모음' },
};

export default function BlogDetailPage() {
    return (
        <main>
            {/* 글 본문 */}
            <PostContent post={DUMMY_POST} />

            {/* 이전/다음 글 네비게이션 */}
            <PostNav prevPost={DUMMY_POST.prevPost} nextPost={DUMMY_POST.nextPost} />
        </main>
    );
}
