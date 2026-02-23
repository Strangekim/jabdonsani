/* ================================================================
   useInfiniteScroll 훅 — 무한 스크롤 감지
   동향/블로그 목록에서 하단 도달 시 다음 데이터를 로드합니다.
   ================================================================ */

'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
    /** 다음 페이지 로드 함수 */
    onLoadMore: () => void;
    /** 더 불러올 데이터가 있는지 여부 */
    hasMore: boolean;
    /** 현재 로딩 중인지 여부 */
    isLoading: boolean;
    /** 감지 트리거 여백 (기본: 200px) */
    threshold?: number;
}

/**
 * Intersection Observer 기반 무한 스크롤 훅
 *
 * @param options - 무한 스크롤 설정 옵션
 * @returns sentinelRef — 하단 감지용 요소에 연결할 ref
 */
export function useInfiniteScroll({
    onLoadMore,
    hasMore,
    isLoading,
    threshold = 200,
}: UseInfiniteScrollOptions) {
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    /* 콜백을 ref로 감싸서 최신 함수를 참조하도록 함 */
    const onLoadMoreRef = useRef(onLoadMore);
    onLoadMoreRef.current = onLoadMore;

    const handleIntersect = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            const [entry] = entries;
            if (entry.isIntersecting && hasMore && !isLoading) {
                onLoadMoreRef.current();
            }
        },
        [hasMore, isLoading]
    );

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(handleIntersect, {
            rootMargin: `${threshold}px`,
        });

        observer.observe(sentinel);

        return () => {
            observer.disconnect();
        };
    }, [handleIntersect, threshold]);

    return { sentinelRef };
}
