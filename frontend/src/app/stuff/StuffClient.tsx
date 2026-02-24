'use client';

/* ================================================================
   StuffClient — 잡동사니 도구 목록 클라이언트 컴포넌트
   - ToolGrid는 하드코딩된 TOOL_LIST 사용
   - UsageWidget은 useToolUsage 훅으로 실제 API 데이터 사용
   ================================================================ */

import ToolGrid from '@/components/stuff/ToolGrid';
import Sidebar from '@/components/common/Sidebar';
import UsageWidget from '@/components/stuff/UsageWidget';
import { TOOL_LIST } from '@/constants/tools';
import { useToolUsage } from '@/hooks/useTools';

export default function StuffClient() {
    /* 실제 사용량 통계 API 연동 */
    const { items: usageItems, isLoading } = useToolUsage();

    return (
        <main className="page-layout page-layout-sub">
            {/* 좌측: 도구 그리드 */}
            <ToolGrid tools={TOOL_LIST} />

            {/* 우측: 사이드바 */}
            <Sidebar>
                {isLoading ? (
                    <div style={{ padding: '16px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                        사용량 로딩 중...
                    </div>
                ) : (
                    <UsageWidget items={usageItems} />
                )}
            </Sidebar>
        </main>
    );
}
