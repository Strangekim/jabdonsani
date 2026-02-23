/**
 * PostCard 컴포넌트 — Velog 스타일 블로그 카드
 *
 * 프로토타입 blog.html의 글 카드 디자인을 React 컴포넌트로 구현.
 * 제목, 설명, 태그, 작성일, 조회수를 표시합니다.
 * 카드 클릭 시 글 상세 페이지로 이동합니다.
 */

import Link from 'next/link';
import type { PostListItem } from '@/types/post';
import { formatDate, formatNumber } from '@/lib/utils';
import styles from './PostCard.module.css';

interface PostCardProps {
    /** 블로그 글 목록 아이템 데이터 */
    post: PostListItem;
}

export default function PostCard({ post }: PostCardProps) {
    return (
        <Link href={`/blog/${post.id}`} className={styles.card}>
            {/* 제목 */}
            <h3 className={styles.cardTitle}>{post.title}</h3>

            {/* 설명 (최대 2줄) */}
            <p className={styles.cardDesc}>{post.description}</p>

            {/* 태그 목록 */}
            {post.tags.length > 0 && (
                <div className={styles.cardTags}>
                    {post.tags.map((tag) => (
                        <span key={tag} className={styles.tag}>
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* 하단 메타 */}
            <div className={styles.cardMeta}>
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
        </Link>
    );
}
