/**
 * Header 컴포넌트 — 사이트 공통 헤더
 *
 * 프로토타입의 .site-header를 React 클라이언트 컴포넌트로 구현.
 * - 좌측: 로고 + 탭 네비게이션 (동향 / 잡동사니 / 블로그)
 * - 우측: 방문자 수 배지 (Today / Total)
 * - sticky 없음 (기획서 요구: 스크롤 시 사라짐)
 */

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Logo from './Logo';
import { NAV_ITEMS } from '@/constants/navigation';
import { formatNumber } from '@/lib/utils';
import { useVisitors, useTrackVisitor } from '@/hooks/useVisitors';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import styles from './Header.module.css';

export default function Header() {
    const pathname = usePathname();
    const { data: visitors } = useVisitors();
    useTrackVisitor();
    const scrollDir = useScrollDirection();

    /**
     * 현재 경로와 네비게이션 항목을 비교하여 활성 탭을 판별
     * - '/' (동향): 정확히 '/'인 경우만 활성
     * - 다른 경로: 경로가 해당 href로 시작하면 활성
     */
    const isActive = (href: string): boolean => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    return (
        <header className={`${styles.siteHeader} ${scrollDir === 'down' ? styles.siteHeaderHidden : ''}`}>
            <div className={styles.headerInner}>
                {/* 좌측: 로고 + 탭 네비게이션 */}
                <div className={styles.headerLeft}>
                    <Logo />
                    <nav>
                        <ul className={styles.navTabs}>
                            {NAV_ITEMS.map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={`${styles.navLink} ${isActive(item.href) ? styles.navLinkActive : ''
                                            }`}
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                {/* 우측: 방문자 수 배지 */}
                <div className={styles.visitorBadge}>
                    <span>
                        Today{' '}
                        <span className={styles.visitorNum}>
                            {visitors ? formatNumber(visitors.today) : '-'}
                        </span>
                    </span>
                    <span>
                        Total{' '}
                        <span className={styles.visitorNum}>
                            {visitors ? formatNumber(visitors.total) : '-'}
                        </span>
                    </span>
                </div>
            </div>
        </header>
    );
}
