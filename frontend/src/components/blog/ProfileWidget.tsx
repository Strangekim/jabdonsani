/**
 * ProfileWidget 컴포넌트 — 블로그 프로필 위젯
 *
 * 블로그 탭 사이드바에 표시되는 블로거 프로필 카드.
 * 아바타, 이름, 소개, GitHub/이메일 링크를 포함합니다.
 */

import { Widget } from '@/components/common/Sidebar';
import styles from './ProfileWidget.module.css';

export default function ProfileWidget() {
    return (
        <Widget title="프로필" icon="person">
            <div className={styles.profileCard}>
                {/* 아바타 (Teal 그라데이션) */}
                <div className={styles.avatar}>👨‍💻</div>

                {/* 프로필 정보 */}
                <div className={styles.profileInfo}>
                    <span className={styles.profileName}>김연호</span>
                    <span className={styles.profileBio}>
                        개발을 좋아하는 엔지니어입니다.
                    </span>
                </div>
            </div>

            {/* 링크 */}
            <div className={styles.profileLinks}>
                <a href="https://github.com/Strangekim" target="_blank" rel="noopener noreferrer" className={styles.profileLink}>
                    <span
                        className={`material-symbols-outlined ${styles.profileLinkIcon}`}
                    >
                        code
                    </span>
                    GitHub
                </a>
                <a href="#" className={styles.profileLink}>
                    <span
                        className={`material-symbols-outlined ${styles.profileLinkIcon}`}
                    >
                        mail
                    </span>
                    이메일
                </a>
            </div>

            {/* 포트폴리오 PDF */}
            <div className={styles.portfolioSection}>
                <span className={styles.portfolioLabel}>포트폴리오</span>
                <div className={styles.portfolioList}>
                    <a
                        href="/portfolio/stylelicense.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.portfolioItem}
                    >
                        <span
                            className={`material-symbols-outlined ${styles.portfolioIcon}`}
                        >
                            picture_as_pdf
                        </span>
                        StyleLicense
                    </a>
                    <a
                        href="/portfolio/savings.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.portfolioItem}
                    >
                        <span
                            className={`material-symbols-outlined ${styles.portfolioIcon}`}
                        >
                            picture_as_pdf
                        </span>
                        적금통 키우기
                    </a>
                    <a
                        href="/portfolio/football.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.portfolioItem}
                    >
                        <span
                            className={`material-symbols-outlined ${styles.portfolioIcon}`}
                        >
                            picture_as_pdf
                        </span>
                        풋볼광장
                    </a>
                </div>
            </div>
        </Widget>
    );
}
