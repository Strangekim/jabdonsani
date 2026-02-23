/**
 * PostNav 컴포넌트 — 이전/다음 글 네비게이션
 *
 * 블로그 글 상세 페이지 하단에 표시되는 이전/다음 글 이동 카드.
 * 이전/다음 글이 없으면 해당 칸을 빈 공간으로 유지합니다.
 */

import Link from 'next/link';
import type { PostNavItem } from '@/types/post';
import styles from './PostNav.module.css';

interface PostNavProps {
    /** 이전 글 정보 (없으면 null) */
    prevPost: PostNavItem | null;
    /** 다음 글 정보 (없으면 null) */
    nextPost: PostNavItem | null;
}

export default function PostNav({ prevPost, nextPost }: PostNavProps) {
    /* 이전/다음 모두 없으면 렌더링하지 않음 */
    if (!prevPost && !nextPost) return null;

    return (
        <nav className={styles.postNav}>
            {/* 이전 글 */}
            {prevPost ? (
                <Link href={`/blog/${prevPost.id}`} className={styles.navCard}>
                    <span className={styles.navLabel}>← 이전 글</span>
                    <span className={styles.navTitle}>{prevPost.title}</span>
                </Link>
            ) : (
                <div style={{ flex: 1 }} />
            )}

            {/* 다음 글 */}
            {nextPost ? (
                <Link
                    href={`/blog/${nextPost.id}`}
                    className={`${styles.navCard} ${styles.navNext}`}
                >
                    <span className={styles.navLabel}>다음 글 →</span>
                    <span className={styles.navTitle}>{nextPost.title}</span>
                </Link>
            ) : (
                <div style={{ flex: 1 }} />
            )}
        </nav>
    );
}
