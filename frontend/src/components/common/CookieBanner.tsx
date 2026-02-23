/**
 * CookieBanner 컴포넌트 — 쿠키 동의 배너
 *
 * 하단 fixed 쿠키 동의 배너 (AdSense 요구사항).
 * 수락/거절 시 localStorage에 동의 상태를 저장하고 배너를 숨깁니다.
 * 이미 동의한 사용자에게는 배너를 표시하지 않습니다.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './CookieBanner.module.css';

/** localStorage 키 */
const COOKIE_CONSENT_KEY = 'cookie_consent';

export default function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);

    /* 마운트 시 localStorage에서 동의 상태 확인 */
    useEffect(() => {
        const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    /** 수락 핸들러 */
    const handleAccept = () => {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
        setIsVisible(false);
    };

    /** 거절 핸들러 */
    const handleDecline = () => {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className={styles.cookieBanner}>
            <p className={styles.cookieText}>
                이 사이트는 더 나은 경험을 제공하기 위해 쿠키를 사용합니다.{' '}
                <Link href="/privacy" className={styles.cookieLink}>
                    개인정보처리방침
                </Link>
                을 확인해주세요.
            </p>
            <div className={styles.cookieButtons}>
                <button
                    className={`${styles.cookieBtn} ${styles.accept}`}
                    onClick={handleAccept}
                >
                    동의
                </button>
                <button
                    className={`${styles.cookieBtn} ${styles.decline}`}
                    onClick={handleDecline}
                >
                    거절
                </button>
            </div>
        </div>
    );
}
