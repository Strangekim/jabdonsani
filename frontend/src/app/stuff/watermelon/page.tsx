/**
 * 3D 수박게임 페이지
 * public/games/watermelon/index.html 을 전체 화면 iframe으로 임베드합니다.
 */

import type { Metadata } from 'next';
import GameShell from '@/components/stuff/GameShell';

export const metadata: Metadata = {
    title: '3D 수박게임',
};

export default function WatermelonPage() {
    return (
        <GameShell
            title="3D 수박게임"
            src="/games/watermelon/index.html"
        />
    );
}
