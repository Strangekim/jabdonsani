/**
 * UsageWidget 컴포넌트 — 사용량 현황 위젯
 *
 * 잡동사니 탭 사이드바에 표시되는 도구별 누적 사용횟수 위젯.
 */

import type { ToolUsageItem } from '@/types/tool';
import { Widget } from '@/components/common/Sidebar';
import { formatNumber } from '@/lib/utils';
import styles from './UsageWidget.module.css';

interface UsageWidgetProps {
    /** 도구별 사용량 데이터 */
    items: ToolUsageItem[];
}

export default function UsageWidget({ items }: UsageWidgetProps) {
    return (
        <Widget title="사용량 현황" icon="bar_chart">
            <div className={styles.usageList}>
                {items.map((item) => (
                    <div key={item.id} className={styles.usageItem}>
                        <span className={styles.usageName}>{item.name}</span>
                        <span className={styles.usageCount}>
                            {formatNumber(item.count)}회
                        </span>
                    </div>
                ))}
            </div>
        </Widget>
    );
}
