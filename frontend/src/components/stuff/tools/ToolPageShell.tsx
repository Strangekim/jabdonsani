/**
 * ToolPageShell — 잡동사니 도구 페이지 공통 껍데기
 *
 * 모든 도구 페이지에서 재사용하는 레이아웃:
 * 브레드크럼 > 헤더(아이콘·이름·설명) > 본문 슬롯
 */

import Link from 'next/link';
import styles from './ToolPageShell.module.css';

interface ToolPageShellProps {
    /** 도구 이름 (예: "PDF 병합") */
    name: string;
    /** Material Symbol 아이콘 이름 */
    icon: string;
    /** 도구 간단 설명 */
    description: string;
    /** 도구 본문 (도구별 구현 내용) */
    children: React.ReactNode;
}

export default function ToolPageShell({ name, icon, description, children }: ToolPageShellProps) {
    return (
        <div className={styles.shell}>
            {/* 브레드크럼 — 잡동사니 목록으로 돌아가는 링크 */}
            <nav className={styles.breadcrumb} aria-label="breadcrumb">
                <Link href="/stuff" className={styles.breadcrumbLink}>잡동사니</Link>
                <span className={styles.breadcrumbSep} aria-hidden="true">›</span>
                <span className={styles.breadcrumbCurrent}>{name}</span>
            </nav>

            {/* 도구 헤더 */}
            <header className={styles.header}>
                <span
                    className={`material-symbols-outlined ${styles.headerIcon}`}
                    aria-hidden="true"
                >
                    {icon}
                </span>
                <div>
                    <h1 className={styles.title}>{name}</h1>
                    <p className={styles.description}>{description}</p>
                </div>
            </header>

            {/* 도구 본문 */}
            <div className={styles.content}>
                {children}
            </div>
        </div>
    );
}
