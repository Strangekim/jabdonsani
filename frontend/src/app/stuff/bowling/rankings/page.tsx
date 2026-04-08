import type { Metadata } from 'next';
import RankingsClient from './RankingsClient';

export const metadata: Metadata = {
    title: '바퀴벌레 볼링 랭킹 | 잡동사니',
    description: '바퀴벌레 볼링 전체 랭킹 대시보드',
};

export default function RankingsPage() {
    return <RankingsClient />;
}
