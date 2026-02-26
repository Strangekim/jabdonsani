'use client';

/* ================================================================
   TrendsClient — 동향 탭 메인 클라이언트 컴포넌트
   - 필터(분야·소스), 검색 상태를 관리합니다.
   - useTrends / useSearchTrends / usePopularTrends 훅과 연동합니다.
   - useInfiniteScroll로 스크롤 기반 무한 로딩을 구현합니다.
   ================================================================ */

import { useState, useEffect, useRef } from 'react';
import FilterBar from '@/components/trends/FilterBar';
import SearchPanel from '@/components/trends/SearchPanel';
import TrendFeed from '@/components/trends/TrendFeed';
import Sidebar from '@/components/common/Sidebar';
import PopularWidget from '@/components/trends/PopularWidget';
import ScheduleWidget from '@/components/trends/ScheduleWidget';
import { useTrends, useSearchTrends, usePopularTrends } from '@/hooks/useTrends';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { MOCK_TRENDS, MOCK_POPULAR_TRENDS } from '@/lib/mockData';
import { useScrollDirection } from '@/hooks/useScrollDirection';

/* tokens.css --header-height 와 동기화 */
const HEADER_HEIGHT = 56;

export default function TrendsClient() {
    /* 필터 상태 — FilterBar에 제어 방식으로 전달 */
    const [field, setField] = useState('');
    const [source, setSource] = useState('');

    /* 검색 상태 */
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    /* 검색 모드: 검색어가 2자 이상이면 검색 결과를 표시 */
    const isSearchMode = searchQuery.trim().length >= 2;

    /* 동향 무한 스크롤 데이터 (일반 모드) */
    const {
        items: trendItemsRaw,
        totalCount: totalCountRaw,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isTrendsLoading,
        isError: isTrendsError,
    } = useTrends({ field, source });

    /* 검색 결과 데이터 (검색 모드) */
    const {
        items: searchItems,
        isLoading: isSearchLoading,
    } = useSearchTrends(searchQuery);

    /* 인기글 사이드바 데이터 */
    const { items: popularItemsRaw } = usePopularTrends();

    /* 백엔드 미연결 시 더미 데이터 fallback */
    const trendItems = (!isTrendsLoading && (isTrendsError || trendItemsRaw.length === 0))
        ? MOCK_TRENDS
        : trendItemsRaw;
    const totalCount = isTrendsError ? MOCK_TRENDS.length : totalCountRaw;
    const popularItems = popularItemsRaw.length === 0 ? MOCK_POPULAR_TRENDS : popularItemsRaw;

    /* 스크롤 방향 + 필터바 고정 */
    const scrollDir = useScrollDirection();
    const filterWrapRef = useRef<HTMLDivElement>(null);
    const [filterHeight, setFilterHeight] = useState(88); /* 초기 추정값 */

    useEffect(() => {
        const el = filterWrapRef.current;
        if (!el) return;
        /* SearchPanel 열림/닫힘 등 높이 변화를 자동 추적 */
        const observer = new ResizeObserver(([entry]) => {
            setFilterHeight(entry.contentRect.height);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const isNavHidden = scrollDir === 'down';

    /* 무한 스크롤 sentinel ref */
    const { sentinelRef } = useInfiniteScroll({
        onLoadMore: fetchNextPage,
        hasMore: hasNextPage,
        isLoading: isFetchingNextPage,
    });

    /* 검색 패널 열기/닫기 */
    const toggleSearch = () => {
        setIsSearchOpen((prev) => !prev);
        /* 검색 패널 닫을 때 검색어 초기화 */
        if (isSearchOpen) setSearchQuery('');
    };

    /* 검색 실행 */
    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    /* 현재 표시할 아이템과 로딩 상태 결정 */
    const displayItems = isSearchMode ? searchItems : trendItems;
    const isLoading = isSearchMode ? isSearchLoading : isTrendsLoading;
    const displayCount = isSearchMode ? searchItems.length : totalCount;

    return (
        <>
            {/* ── 고정 필터 래퍼 ──
                스크롤 다운 시 헤더와 함께 위로 슬라이드 아웃,
                스크롤 업 시 헤더 바로 아래로 슬라이드 인 */}
            <div
                ref={filterWrapRef}
                style={{
                    position: 'fixed',
                    top: HEADER_HEIGHT,
                    left: 0,
                    right: 0,
                    zIndex: 150,
                    transform: isNavHidden
                        ? `translateY(${-(HEADER_HEIGHT + filterHeight)}px)`
                        : 'translateY(0)',
                    transition: 'transform 0.25s ease',
                }}
            >
                <FilterBar
                    totalCount={displayCount}
                    isSearchOpen={isSearchOpen}
                    onSearchToggle={toggleSearch}
                    field={field}
                    onFieldChange={(val) => {
                        setField(val);
                        setSearchQuery('');
                    }}
                    source={source}
                    onSourceChange={(val) => {
                        setSource(val);
                        setSearchQuery('');
                    }}
                />
                <SearchPanel isOpen={isSearchOpen} onSearch={handleSearch} />
            </div>

            {/* 고정 필터바 높이만큼 spacer — fixed 요소는 flow에서 제외되므로 */}
            <div style={{ height: filterHeight }} />

            {/* 메인 2단 레이아웃 */}
            <main className="page-layout page-layout-trends">
                {/* 좌측: 피드 */}
                <section>
                    {isLoading && displayItems.length === 0 ? (
                        /* 첫 로딩 스피너 */
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            불러오는 중...
                        </div>
                    ) : displayItems.length === 0 ? (
                        /* 결과 없음 */
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            {isSearchMode ? `"${searchQuery}"에 해당하는 결과가 없습니다.` : '수집된 동향이 없습니다.'}
                        </div>
                    ) : (
                        <TrendFeed items={displayItems} />
                    )}

                    {/* 무한 스크롤 sentinel — 일반 모드에서만 사용 */}
                    {!isSearchMode && (
                        <div ref={sentinelRef}>
                            {isFetchingNextPage && (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    더 불러오는 중...
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* 우측: 사이드바 */}
                <Sidebar>
                    <PopularWidget items={popularItems} />
                    <ScheduleWidget />
                </Sidebar>
            </main>
        </>
    );
}
