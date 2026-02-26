/**
 * PopularWidget 컴포넌트 — 오늘의 인기글 TOP 5
 *
 * 동향 탭 사이드바에 표시되는 업보트 기준 인기글 위젯.
 * 1~3위는 Teal 그라데이션, 4위 이후는 회색 배경 순위 배지를 사용합니다.
 */

import type { TrendPopularItem } from '@/types/trend';
import { Widget } from '@/components/common/Sidebar';
import { formatNumber } from '@/lib/utils';
import styles from './PopularWidget.module.css';

interface PopularWidgetProps {
    /** 인기글 데이터 배열 (최대 5개) */
    items: TrendPopularItem[];
}

/** 순위별 CSS 클래스 — 같은 blue 계열로 통일 */
const RANK_CLASS = [styles.rank1, styles.rank2, styles.rank3];

export default function PopularWidget({ items }: PopularWidgetProps) {
    return (
        <Widget title="오늘의 인기글" icon="local_fire_department">
            <ul className={styles.popularList}>
                {items.map((item, idx) => (
                    <li key={item.id} className={styles.popularItem}>
                        <span className={`${styles.popularRank} ${RANK_CLASS[idx] ?? styles.rankOther}`}>
                            {idx + 1}
                        </span>
                        <div className={styles.popularInfo}>
                            <a href="#" className={styles.popularLink}>
                                {item.title}
                            </a>
                            <span className={styles.popularMeta}>
                                ▲ {formatNumber(item.upvotes)}
                            </span>
                        </div>
                    </li>
                ))}
            </ul>
        </Widget>
    );
}
