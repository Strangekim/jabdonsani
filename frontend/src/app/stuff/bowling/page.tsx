/**
 * 바퀴벌레 볼링 페이지
 * public/games/bowling/index.html 을 전체 화면 iframe으로 임베드합니다.
 * (Supabase 랭킹 로직 제거된 standalone 버전)
 */

import type { Metadata } from 'next';
import GameShell from '@/components/stuff/GameShell';

export const metadata: Metadata = {
    title: '바퀴벌레 볼링',
};

export default function BowlingPage() {
    return (
        <GameShell
            title="바퀴벌레 볼링"
            src="/games/bowling/index.html"
        />
    );
}
