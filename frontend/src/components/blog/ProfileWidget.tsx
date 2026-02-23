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
                    <span className={styles.profileName}>관리자</span>
                    <span className={styles.profileBio}>
                        개발을 좋아하는 엔지니어입니다.
                    </span>
                </div>
            </div>

            {/* 링크 */}
            <div className={styles.profileLinks}>
                <a href="#" className={styles.profileLink}>
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
        </Widget>
    );
}
