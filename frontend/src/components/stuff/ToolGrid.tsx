/**
 * ToolGrid 컴포넌트 — 도구 카드 그리드
 *
 * 도구 카드를 2열 그리드로 배치합니다.
 * 모바일(560px)에서는 1열로 변경됩니다.
 */

import type { ToolCardInfo } from '@/types/tool';
import ToolCard from './ToolCard';
import styles from './ToolGrid.module.css';

interface ToolGridProps {
    /** 도구 카드 데이터 배열 */
    tools: ToolCardInfo[];
}

export default function ToolGrid({ tools }: ToolGridProps) {
    return (
        <section className={styles.toolGrid}>
            {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
            ))}
        </section>
    );
}
