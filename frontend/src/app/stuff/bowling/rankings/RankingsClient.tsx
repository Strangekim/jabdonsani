'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import styles from './RankingsClient.module.css';

interface ScoreEntry {
    nickname: string;
    score: number;
    created_at: string;
}

export default function RankingsClient() {
    const [rankings, setRankings] = useState<ScoreEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiGet<ScoreEntry[]>('/games/bowling/rankings', { limit: 50 })
            .then((res) => {
                if (res.success && Array.isArray(res.data)) setRankings(res.data);
            })
            .finally(() => setLoading(false));
    }, []);

    /* 날짜 포맷 */
    const fmtDate = (iso: string) => {
        const d = new Date(iso);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    };

    /* 순위별 메달 */
    const medal = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return String(rank);
    };

    return (
        <main className={styles.main}>
            <div className={styles.header}>
                <Link href="/stuff/bowling" className={styles.backLink}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                    게임으로 돌아가기
                </Link>
                <h1 className={styles.title}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>emoji_events</span>
                    바퀴벌레 볼링 랭킹
                </h1>
            </div>

            {loading ? (
                <div className={styles.loading}>랭킹 불러오는 중...</div>
            ) : rankings.length === 0 ? (
                <div className={styles.empty}>아직 기록이 없습니다. 첫 번째 플레이어가 되어보세요!</div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.thRank}>순위</th>
                                <th className={styles.thNick}>닉네임</th>
                                <th className={styles.thScore}>점수</th>
                                <th className={styles.thDate}>날짜</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rankings.map((entry, i) => (
                                <tr
                                    key={`${entry.nickname}-${entry.created_at}`}
                                    className={i < 3 ? styles.topRow : ''}
                                >
                                    <td className={styles.tdRank}>{medal(i + 1)}</td>
                                    <td className={styles.tdNick}>{entry.nickname}</td>
                                    <td className={styles.tdScore}>{entry.score.toLocaleString()}</td>
                                    <td className={styles.tdDate}>{fmtDate(entry.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}
