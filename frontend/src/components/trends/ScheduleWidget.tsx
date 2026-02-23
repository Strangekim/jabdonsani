/**
 * ScheduleWidget 컴포넌트 — 수집 스케줄 위젯
 *
 * 동향 탭 사이드바에 표시되는 수집 스케줄.
 * 1차(오전 7시) / 2차(오후 7시) 배치 시간과
 * 다음 배치까지 남은 시간을 실시간으로 카운트다운합니다.
 */

'use client';

import { useState, useEffect } from 'react';
import { Widget } from '@/components/common/Sidebar';
import styles from './ScheduleWidget.module.css';

export default function ScheduleWidget() {
    const [countdown, setCountdown] = useState('--:--:--');

    /* 1초마다 카운트다운 갱신 */
    useEffect(() => {
        /** 다음 배치 시간까지 남은 시간을 계산하는 함수 */
        const calcCountdown = () => {
            const now = new Date();
            const hour = now.getHours();

            /* 다음 배치 시간 결정 (7시 / 19시) */
            const next = new Date(now);
            if (hour < 7) {
                next.setHours(7, 0, 0, 0);
            } else if (hour < 19) {
                next.setHours(19, 0, 0, 0);
            } else {
                next.setDate(next.getDate() + 1);
                next.setHours(7, 0, 0, 0);
            }

            const diff = next.getTime() - now.getTime();
            const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
            const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
            const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
            setCountdown(`${h}:${m}:${s}`);
        };

        calcCountdown();
        const timer = setInterval(calcCountdown, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <Widget title="수집 스케줄" icon="schedule">
            <div className={styles.scheduleList}>
                <div className={styles.scheduleItem}>
                    <span className={styles.scheduleLabel}>1차 배치</span>
                    <span className={styles.scheduleTime}>매일 오전 7:00</span>
                </div>
                <div className={styles.scheduleItem}>
                    <span className={styles.scheduleLabel}>2차 배치</span>
                    <span className={styles.scheduleTime}>매일 오후 7:00</span>
                </div>
            </div>
            <div className={styles.scheduleNext}>
                <p className={styles.countdownLabel}>다음 배치까지</p>
                <p className={styles.countdown}>{countdown}</p>
            </div>
        </Widget>
    );
}
