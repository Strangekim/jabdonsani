/**
 * PostContent 컴포넌트 — 블로그 글 상세 본문
 *
 * 프로토타입 blog-detail.html의 글 상세 디자인을 React 컴포넌트로 구현.
 * 제목, 메타데이터, 태그, Markdown 본문(HTML 렌더링 필요)을 표시합니다.
 *
 * NOTE: Markdown→HTML 변환은 추후 서버 사이드에서 수행하거나
 * react-markdown 등의 라이브러리를 추가하여 처리합니다.
 */

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

            {/* 본문 — Markdown HTML을 dangerouslySetInnerHTML로 렌더링 */}
            <div
                className={styles.postBody}
                dangerouslySetInnerHTML={{ __html: post.content }}
            />
        </article>
    );
}
