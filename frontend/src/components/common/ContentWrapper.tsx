'use client';

/**
 * ContentWrapper — 헤더 높이 패딩 조건부 적용
 *
 * 게임 페이지는 헤더가 없으므로 paddingTop을 0으로 설정합니다.
 */

import { usePathname } from 'next/navigation';

const GAME_ROUTES = ['/stuff/watermelon', '/stuff/bugshooter', '/stuff/bowling'];

export default function ContentWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isGame = GAME_ROUTES.some((r) => pathname.startsWith(r));

    return (
        <div style={{ paddingTop: isGame ? 0 : 'var(--header-height)' }}>
            {children}
        </div>
    );
}
