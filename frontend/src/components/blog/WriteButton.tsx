'use client';

/**
 * WriteButton — 로그인 상태일 때만 표시되는 글 만들기 버튼
 */

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import styles from './WriteButton.module.css';

export default function WriteButton() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading || !isAuthenticated) return null;

    return (
        <div className={styles.wrapper}>
            <Link href="/blog/write" className={styles.button}>
                <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                만들기
            </Link>
        </div>
    );
}
