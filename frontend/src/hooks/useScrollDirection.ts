'use client';

/* ================================================================
   useScrollDirection 훅 — 스크롤 방향 감지
   - 'top' : 페이지 최상단 (scrollY < threshold)
   - 'down': 아래로 스크롤 중
   - 'up'  : 위로 스크롤 중
   ================================================================ */

import { useEffect, useRef, useState } from 'react';

type ScrollDirection = 'top' | 'up' | 'down';

export function useScrollDirection(threshold = 8): ScrollDirection {
    const [direction, setDirection] = useState<ScrollDirection>('top');
    const lastY = useRef(0);

    useEffect(() => {
        const onScroll = () => {
            const y = window.scrollY;
            if (y < threshold) {
                setDirection('top');
            } else if (y > lastY.current + threshold) {
                setDirection('down');
            } else if (y < lastY.current - threshold) {
                setDirection('up');
            }
            lastY.current = y;
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [threshold]);

    return direction;
}
