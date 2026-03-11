/**
 * Bug Shooter 페이지
 * public/games/bugshooter/index.html 을 전체 화면 iframe으로 임베드합니다.
 */

import type { Metadata } from 'next';
import GameShell from '@/components/stuff/GameShell';

export const metadata: Metadata = {
    title: 'Bug Shooter',
};

export default function BugShooterPage() {
    return (
        <GameShell
            title="Bug Shooter"
            src="/games/bugshooter/index.html"
        />
    );
}
