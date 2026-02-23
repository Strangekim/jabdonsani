/**
 * Logo 컴포넌트
 *
 * "잡동사니" 로고를 글자별로 분리하여 렌더링합니다.
 * - "잡", "동": 흰색 (기본)
 * - "사": Teal 포인트 컬러
 * - "니": Teal 포인트 + 기울임
 * - 호버 시 각 글자가 순차적으로 바운스하는 물결 애니메이션
 */

import Link from 'next/link';
import styles from './Logo.module.css';

export default function Logo() {
    return (
        <Link href="/" className={styles.logo}>
            <span className={styles.char}>잡</span>
            <span className={styles.char}>동</span>
            <span className={`${styles.char} ${styles.accent}`}>사</span>
            <span className={`${styles.char} ${styles.accent} ${styles.tilt}`}>
                니
            </span>
        </Link>
    );
}
