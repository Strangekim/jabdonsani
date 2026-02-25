/**
 * PostContent 컴포넌트 — 블로그 글 상세 본문
 *
 * 제목, 메타데이터, 태그, Markdown 본문을 표시합니다.
 * react-markdown + remark-gfm으로 Markdown을 렌더링합니다.
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { PostDetail } from '@/types/post';
import { formatDate, formatNumber } from '@/lib/utils';
import styles from './PostContent.module.css';

interface PostContentProps {
    /** 블로그 글 상세 데이터 */
    post: PostDetail;
}

export default function PostContent({ post }: PostContentProps) {
    return (
        <article className={styles.postDetail}>
            {/* 글 헤더 */}
            <header className={styles.postHeader}>
                <h1 className={styles.postTitle}>{post.title}</h1>

                {/* 메타 정보 (작성일, 조회수) */}
                <div className={styles.postMeta}>
                    <span className={styles.metaItem}>
                        <span className={`material-symbols-outlined ${styles.metaIcon}`}>
                            calendar_today
                        </span>
                        {formatDate(post.createdAt)}
                    </span>
                    <span className={styles.metaItem}>
                        <span className={`material-symbols-outlined ${styles.metaIcon}`}>
                            visibility
                        </span>
                        {formatNumber(post.views)}
                    </span>
                </div>

                {/* 태그 목록 */}
                {post.tags.length > 0 && (
                    <div className={styles.postTags}>
                        {post.tags.map((tag) => (
                            <span key={tag} className={styles.tag}>
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </header>

            {/* 본문 — Markdown 렌더링 (react-markdown + remark-gfm) */}
            <div className={styles.postBody}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {post.content}
                </ReactMarkdown>
            </div>
        </article>
    );
}
