/**
 * TrendCard 컴포넌트 — 동향 피드 카드
 *
 * 소스 배지, 제목, 본문, 썸네일 캐러셀, 댓글 요약, 상위 댓글, 액션바를 포함합니다.
 */

import type { TrendItem, TrendSource } from '@/types/trend';
import { formatRelativeTime, formatNumber } from '@/lib/utils';
import styles from './TrendCard.module.css';

interface TrendCardProps {
    /** 동향 카드 데이터 */
    item: TrendItem;
}

/**
 * 소스별 배지 CSS 클래스 매핑
 * source 값에 따라 배경색이 달라집니다.
 */
const SOURCE_CLASS_MAP: Record<TrendSource, string> = {
    hn:       styles.sourceHn,
    hfpapers: styles.sourceHfpapers,
    devto:    styles.sourceDevto,
    lobsters: styles.sourceLobsters,
};

/** 소스별 표시 라벨 */
const SOURCE_LABEL_MAP: Record<TrendSource, string> = {
    hn:       'Hacker News',
    hfpapers: 'HF Papers',
    devto:    'Dev.to',
    lobsters: 'Lobste.rs',
};

export default function TrendCard({ item }: TrendCardProps) {
    return (
        <article className={styles.card}>
            <div className={styles.cardBody}>
                {/* 상단: 소스 배지 + 시각 + 분야 태그 */}
                <div className={styles.cardMeta}>
                    <span
                        className={`${styles.sourceBadge} ${SOURCE_CLASS_MAP[item.source]}`}
                    >
                        {SOURCE_LABEL_MAP[item.source]}
                    </span>
                    <span className={styles.cardTime}>
                        {formatRelativeTime(item.createdAt)}
                    </span>
                    <div className={styles.cardTags}>
                        {item.fieldTags.map((tag) => (
                            <span key={tag} className={styles.tag}>
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                {/* 제목 */}
                <h3 className={styles.cardTitle}>{item.title}</h3>

                {/* 본문 */}
                <p className={styles.cardContent}>{item.content}</p>

                {/* 썸네일 캐러셀 — 이미지가 있을 때만 노출 */}
                {item.thumbnails.length > 0 && (
                    <div className={styles.cardImage}>
                        {item.thumbnails.map((url, idx) => (
                            <img
                                key={idx}
                                src={url}
                                alt={`${item.title} 이미지 ${idx + 1}`}
                                loading="lazy"
                            />
                        ))}
                    </div>
                )}

                {/* 댓글 동향 섹션 */}
                {(item.commentSummary || item.topComments.length > 0) && (
                    <div className={styles.commentSection}>
                        <div className={styles.commentSectionTitle}>
                            <span
                                className={`material-symbols-outlined ${styles.commentTitleIcon}`}
                            >
                                forum
                            </span>
                            댓글 동향
                        </div>

                        {/* AI 댓글 요약 */}
                        {item.commentSummary && (
                            <p className={styles.commentSummary}>{item.commentSummary}</p>
                        )}

                        {/* 상위 댓글 목록 */}
                        {item.topComments.length > 0 && (
                            <div className={styles.topComments}>
                                {item.topComments.map((comment, idx) => (
                                    <div key={idx} className={styles.topComment}>
                                        <span className={styles.commentVotes}>
                                            ▲{comment.votes}
                                        </span>
                                        <span>{comment.text}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 하단 액션바 */}
                <div className={styles.cardActions}>
                    <span className={styles.actionItem}>
                        <span className={`material-symbols-outlined ${styles.actionIcon}`}>
                            arrow_upward
                        </span>
                        {formatNumber(item.upvotes)}
                    </span>
                    <span className={styles.actionItem}>
                        <span className={`material-symbols-outlined ${styles.actionIcon}`}>
                            visibility
                        </span>
                        {formatNumber(item.views)}
                    </span>
                    <a
                        href={item.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.actionLink}
                    >
                        원문 보기
                        <span
                            className={`material-symbols-outlined ${styles.actionLinkIcon}`}
                        >
                            open_in_new
                        </span>
                    </a>
                </div>
            </div>
        </article>
    );
}
