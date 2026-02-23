'use client';

import { useState } from 'react';
import FilterBar from '@/components/trends/FilterBar';
import SearchPanel from '@/components/trends/SearchPanel';
import TrendFeed from '@/components/trends/TrendFeed';
import Sidebar from '@/components/common/Sidebar';
import PopularWidget from '@/components/trends/PopularWidget';
import ScheduleWidget from '@/components/trends/ScheduleWidget';
import type { TrendItem, TrendPopularItem } from '@/types/trend';

interface TrendsClientProps {
    initialTrends: TrendItem[];
    initialPopular: TrendPopularItem[];
}

export default function TrendsClient({ initialTrends, initialPopular }: TrendsClientProps) {
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const toggleSearch = () => {
        setIsSearchOpen((prev) => !prev);
    };

    return (
        <>
            {/* 필터 바 */}
            <FilterBar
                totalCount={initialTrends.length}
                isSearchOpen={isSearchOpen}
                onSearchToggle={toggleSearch}
            />

            {/* 검색 패널 */}
            <SearchPanel isOpen={isSearchOpen} />

            {/* 메인 2단 레이아웃 */}
            <main className="page-layout page-layout-trends">
                {/* 좌측: 피드 */}
                <TrendFeed items={initialTrends} />

                {/* 우측: 사이드바 */}
                <Sidebar>
                    <PopularWidget items={initialPopular} />
                    <ScheduleWidget />
                </Sidebar>
            </main>
        </>
    );
}
