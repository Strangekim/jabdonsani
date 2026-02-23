/**
 * ScrollToTop 컴포넌트 — 스크롤 투 탑 버튼
 *
 * 페이지를 일정 이상 스크롤하면 우측 하단에 나타나는 최상단 이동 버튼.
 * 클릭 시 부드러운 스크롤로 페이지 최상단으로 이동합니다.
 */

'use client';

import { useState, useEffect } from 'react';
import styles from './ScrollToTop.module.css';

/** 버튼이 나타나는 스크롤 임계값 (px) */
const SCROLL_THRESHOLD = 300;

export default function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);

    /* 스크롤 이벤트 감지 */
    useEffect(() => {
        const handleScroll = () => {
            setIsVisible(window.scrollY > SCROLL_THRESHOLD);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    /** 최상단 스크롤 핸들러 */
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <button
            className={`${styles.scrollTopBtn} ${isVisible ? styles.visible : ''}`}
            onClick={scrollToTop}
            aria-label="페이지 최상단으로 이동"
        >
            <span className={`material-symbols-outlined ${styles.icon}`}>
                arrow_upward
            </span>
        </button>
    );
}
