/**
 * TrendFeed 컴포넌트 — 동향 피드 목록
 *
 * TrendCard를 세로로 나열하는 피드 래퍼.
 * 추후 무한 스크롤 sentinel도 이 컴포넌트 내에 배치합니다.
 */

import type { TrendItem } from '@/types/trend';
import TrendCard from './TrendCard';

interface TrendFeedProps {
    /** 동향 카드 데이터 배열 */
    items: TrendItem[];
}

export default function TrendFeed({ items }: TrendFeedProps) {
    return (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {items.map((item) => (
                <TrendCard key={item.id} item={item} />
            ))}

            {/* 데이터가 없을 때 안내 메시지 */}
            {items.length === 0 && (
                <p
                    style={{
                        textAlign: 'center',
                        padding: '60px 0',
                        color: 'var(--color-text-muted)',
                        fontSize: '14px',
                    }}
                >
                    표시할 동향이 없습니다.
                </p>
            )}
        </section>
    );
}
