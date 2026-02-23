/**
 * BlogPopularWidget 컴포넌트 — 블로그 인기글 위젯
 *
 * 블로그 사이드바에 표시되는 조회수 기준 인기글 목록.
 */

import Link from 'next/link';
import type { PostPopularItem } from '@/types/post';
import { Widget } from '@/components/common/Sidebar';
import { formatNumber } from '@/lib/utils';
import styles from './BlogPopularWidget.module.css';

interface BlogPopularWidgetProps {
    /** 인기글 데이터 배열 */
    items: PostPopularItem[];
}

export default function BlogPopularWidget({ items }: BlogPopularWidgetProps) {
    return (
        <Widget title="인기 글" icon="trending_up">
            <ul className={styles.popularList}>
                {items.map((item) => (
                    <li key={item.id} className={styles.popularItem}>
                        <Link href={`/blog/${item.id}`} className={styles.popularLink}>
                            {item.title}
                        </Link>
                        <div className={styles.popularMeta}>
                            <span
                                className={`material-symbols-outlined ${styles.popularIcon}`}
                            >
                                visibility
                            </span>
                            {formatNumber(item.views)}
                        </div>
                    </li>
                ))}
            </ul>
        </Widget>
    );
}
