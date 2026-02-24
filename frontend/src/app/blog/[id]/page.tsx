/**
 * 블로그 글 상세 페이지 ("/blog/[id]")
 *
 * Next.js 16 App Router: params는 Promise<{id: string}> 타입입니다.
 * 서버 컴포넌트에서 SEO 메타데이터를 위해 글 제목을 조회하고,
 * 실제 렌더링은 BlogDetailClient(클라이언트 컴포넌트)에 위임합니다.
 */

import type { Metadata } from 'next';
import BlogDetailClient from './BlogDetailClient';

interface PageProps {
    params: Promise<{ id: string }>;
}

/** 글 제목을 동적 메타데이터로 설정 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    return {
        title: `글 #${id}`,
    };
}

export default async function BlogDetailPage({ params }: PageProps) {
    const { id } = await params;
    const postId = Number(id);

    return <BlogDetailClient postId={postId} />;
}
