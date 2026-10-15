import type { Metadata } from 'next';
import BasketballClient from './BasketballClient';

export const metadata: Metadata = {
    title: '농구 · 이벤트 턴',
    description: '한 쌍의 선택으로 완결되는 플레이, 동시에 펼치는 수 싸움. 공격과 수비를 직접 선택하는 결정론적 1:1 하프코트 농구.',
};

/** 기존 사이트의 네비게이션을 유지하는 독립 농구 탭 */
export default function BasketballPage() {
    return <BasketballClient />;
}
