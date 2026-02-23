/**
 * SearchPanel 컴포넌트 — 동향 검색 패널
 *
 * 필터 바의 검색 토글 버튼 클릭 시 슬라이드 다운으로 나타나는 검색 패널.
 * 키워드 입력 후 엔터 또는 검색 버튼 클릭으로 검색을 실행합니다.
 */

'use client';

import { useState } from 'react';
import styles from './SearchPanel.module.css';

interface SearchPanelProps {
    /** 패널 열림 상태 */
    isOpen: boolean;
    /** 검색 실행 콜백 */
    onSearch?: (query: string) => void;
}

export default function SearchPanel({ isOpen, onSearch }: SearchPanelProps) {
    const [query, setQuery] = useState('');

    /** 검색 실행 핸들러 */
    const handleSubmit = () => {
        if (query.trim().length >= 2 && onSearch) {
            onSearch(query.trim());
        }
    };

    /** 엔터 키 검색 */
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    return (
        <div className={`${styles.searchPanel} ${isOpen ? styles.open : ''}`}>
            <div className={styles.searchPanelInner}>
                <div className={styles.inputContainer}>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="동향 검색 (2자 이상)..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button className={styles.searchSubmitBtn} onClick={handleSubmit}>
                        <span
                            className={`material-symbols-outlined ${styles.searchSubmitIcon}`}
                        >
                            search
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
