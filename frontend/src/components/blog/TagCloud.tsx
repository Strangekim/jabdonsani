'use client';

/**
 * TagCloud 컴포넌트 — 태그 클라우드 위젯
 *
 * 블로그 사이드바에 표시되는 태그 목록.
 * 클릭 시 해당 태그로 글 목록을 필터링합니다.
 */

import type { TagItem } from '@/types/post';
import { Widget } from '@/components/common/Sidebar';
import styles from './TagCloud.module.css';

interface TagCloudProps {
    /** 태그 목록 */
    tags: TagItem[];
    /** 현재 선택된 태그 */
    activeTag?: string;
    /** 태그 클릭 콜백 */
    onTagClick?: (tagName: string) => void;
}

export default function TagCloud({
    tags,
    activeTag,
    onTagClick,
}: TagCloudProps) {
    return (
        <Widget title="태그" icon="sell">
            <div className={styles.tagList}>
                {tags.map((tag) => (
                    <button
                        key={tag.name}
                        className={`${styles.tagItem} ${activeTag === tag.name ? styles.tagItemActive : ''
                            }`}
                        onClick={() => onTagClick?.(tag.name)}
                    >
                        {tag.name}
                        <span className={styles.tagCount}>({tag.count})</span>
                    </button>
                ))}
            </div>
        </Widget>
    );
}
