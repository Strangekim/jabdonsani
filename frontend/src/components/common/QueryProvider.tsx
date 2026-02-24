'use client';

/* ================================================================
   QueryProvider — React Query 전역 Provider 래퍼
   layout.tsx의 body에 감싸 앱 전체에서 useQuery 등을 사용할 수 있게 합니다.
   ================================================================ */

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/queryClient';

interface QueryProviderProps {
    children: React.ReactNode;
}

/**
 * 클라이언트 사이드 QueryClientProvider.
 * useState로 QueryClient를 한 번만 생성하여 리렌더링 시 재생성을 방지합니다.
 */
export default function QueryProvider({ children }: QueryProviderProps) {
    const [queryClient] = useState(() => createQueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
