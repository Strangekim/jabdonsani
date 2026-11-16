import Link from 'next/link';
import styles from './MbtiClient.module.css';

export default function MbtiClient() {
    return (
        <main className={styles.shell}>
            <div className={styles.toolbar}>
                <Link href="/stuff" className={styles.backLink}>
                    ← 잡동사니
                </Link>
                <h1 className={styles.title}>MBTI 검사</h1>
                <a
                    href="/tools/mbti/index.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.openLink}
                    aria-label="MBTI 검사만 새 탭에서 열기"
                >
                    검사만 보기 ↗
                </a>
            </div>
            <iframe
                src="/tools/mbti/index.html"
                title="MBTI 검사"
                allow="clipboard-write"
                className={styles.frame}
            />
        </main>
    );
}
