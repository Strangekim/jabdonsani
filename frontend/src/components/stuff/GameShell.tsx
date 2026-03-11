/**
 * GameShell 컴포넌트 — 웹 게임 iframe 래퍼
 *
 * public/games/ 하위의 정적 HTML 게임을 전체 화면 iframe으로 임베드합니다.
 * 헤더 높이(--header-height)만큼 상단 여백을 두고 나머지 공간을 모두 사용합니다.
 */

import Link from 'next/link';
import styles from './GameShell.module.css';

interface GameShellProps {
    /** 게임 제목 (뒤로가기 버튼 옆에 표시) */
    title: string;
    /** iframe src — public/ 기준 경로 */
    src: string;
}

export default function GameShell({ title, src }: GameShellProps) {
    return (
        <div className={styles.shell}>
            {/* 상단 바 */}
            <div className={styles.topBar}>
                <Link href="/stuff" className={styles.backBtn}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        arrow_back
                    </span>
                    잡동사니
                </Link>
                <span className={styles.gameTitle}>{title}</span>
            </div>

            {/* 게임 iframe */}
            <iframe
                src={src}
                className={styles.frame}
                title={title}
                allow="fullscreen"
            />
        </div>
    );
}
