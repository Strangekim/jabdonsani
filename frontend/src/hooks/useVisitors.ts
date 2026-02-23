/* ================================================================
   useVisitors 훅 — 방문자 수(Today/Total) 조회
   헤더의 방문자 배지에서 사용합니다.
   ================================================================ */

'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';

/** 방문자 수 데이터 타입 */
interface VisitorData {
    today: number;
    total: number;
}

/**
 * 방문자 수를 API에서 조회하는 커스텀 훅
 *
 * @returns 방문자 수 데이터, 로딩 상태, 에러 상태
 */
export function useVisitors() {
    const [data, setData] = useState<VisitorData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchVisitors() {
            try {
                const response = await apiGet<VisitorData>('/visitors');
                if (response.success) {
                    setData(response.data);
                } else {
                    setError(response.error.message);
                }
            } catch {
                setError('방문자 수를 불러오는데 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        }

        fetchVisitors();
    }, []);

    return { data, isLoading, error };
}
