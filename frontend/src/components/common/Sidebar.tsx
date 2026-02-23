/**
 * Sidebar 컴포넌트 — 공통 사이드바 래퍼
 *
 * 각 탭 페이지에서 사이드바 위젯들을 감싸는 공통 컨테이너.
 * sticky 포지션으로 스크롤 시 고정되며, 모바일에서는 숨겨집니다.
 * children으로 각 탭 전용 위젯을 전달받습니다.
 */

import styles from './Sidebar.module.css';

interface SidebarProps {
    children: React.ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
    return <aside className={styles.sidebar}>{children}</aside>;
}

/* ── Widget 서브컴포넌트 ── */

interface WidgetProps {
    /** 위젯 제목 */
    title: string;
    /** Material Symbols 아이콘 이름 */
    icon: string;
    /** 위젯 내부 콘텐츠 */
    children: React.ReactNode;
}

/** 사이드바 위젯 카드 — 제목 + 아이콘 + 콘텐츠 */
export function Widget({ title, icon, children }: WidgetProps) {
    return (
        <div className={styles.widget}>
            <div className={styles.widgetTitle}>
                <span className={`material-symbols-outlined ${styles.widgetTitleIcon}`}>
                    {icon}
                </span>
                {title}
            </div>
            {children}
        </div>
    );
}
