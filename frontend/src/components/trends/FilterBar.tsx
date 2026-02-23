/**
 * FilterBar 컴포넌트 — 동향 탭 필터 바
 *
 * 분야 필터(전체/AI/개발/로보틱스)와 소스 필터(HN/LocalLLaMA/ML/programming/robotics)를
 * 조합하여 동향 카드를 필터링합니다.
 * 현재 필터 기준 결과 수와 검색 토글 버튼도 포함합니다.
 */

'use client';

import { useState } from 'react';
import styles from './FilterBar.module.css';

/** 분야 필터 옵션 */
const FIELD_FILTERS = [
    { value: '', label: '전체' },
    { value: 'ai', label: 'AI' },
    { value: 'dev', label: '개발' },
    { value: 'robotics', label: '로보틱스' },
] as const;

/** 소스 필터 옵션 */
const SOURCE_FILTERS = [
    { value: '', label: '전체' },
    { value: 'hn', label: 'HN' },
    { value: 'localllama', label: 'r/LocalLLaMA' },
    { value: 'ml', label: 'r/ML' },
    { value: 'programming', label: 'r/programming' },
    { value: 'robotics', label: 'r/robotics' },
] as const;

interface FilterBarProps {
    /** 현재 결과 수 */
    totalCount?: number;
    /** 검색 패널 열림 상태 */
    isSearchOpen?: boolean;
    /** 검색 토글 콜백 */
    onSearchToggle?: () => void;
}

export default function FilterBar({
    totalCount = 0,
    isSearchOpen = false,
    onSearchToggle,
}: FilterBarProps) {
    /* 분야 / 소스 필터 상태 */
    const [activeField, setActiveField] = useState('');
    const [activeSource, setActiveSource] = useState('');

    return (
        <div className={styles.filterBar}>
            <div className={styles.filterBarInner}>
                {/* 분야 필터 행 */}
                <div className={styles.filterRow}>
                    <div className={styles.filterGroup}>
                        <span className={styles.filterLabel}>분야</span>
                        {FIELD_FILTERS.map((filter) => (
                            <button
                                key={filter.value}
                                className={`${styles.filterBtn} ${activeField === filter.value ? styles.filterBtnActive : ''
                                    }`}
                                onClick={() => setActiveField(filter.value)}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 구분선 */}
                <div className={styles.filterDivider} />

                {/* 소스 필터 행 */}
                <div className={styles.filterRow}>
                    <div className={styles.filterGroup}>
                        <span className={styles.filterLabel}>소스</span>
                        {SOURCE_FILTERS.map((filter) => (
                            <button
                                key={filter.value}
                                className={`${styles.filterBtn} ${activeSource === filter.value ? styles.filterBtnActive : ''
                                    }`}
                                onClick={() => setActiveSource(filter.value)}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>

                    {/* 우측: 결과 수 + 검색 토글 */}
                    <div className={styles.filterRight}>
                        <span className={styles.filterCount}>
                            <span className={styles.filterCountStrong}>{totalCount}</span>개의
                            결과
                        </span>
                        <button
                            className={`${styles.searchToggleBtn} ${isSearchOpen ? styles.searchToggleBtnActive : ''
                                }`}
                            onClick={onSearchToggle}
                        >
                            <span
                                className={`material-symbols-outlined ${styles.searchToggleIcon}`}
                            >
                                search
                            </span>
                            검색
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
