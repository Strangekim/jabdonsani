/**
 * 잡동사니 도구 목록 페이지 ("/stuff")
 *
 * 프로토타입 stuff.html의 레이아웃:
 * 2단 구조 — 좌측 ToolGrid + 우측 사이드바(사용량 현황)
 *
 * 도구 목록은 constants/tools.ts에서 하드코딩으로 관리합니다.
 */

import type { Metadata } from 'next';
import ToolGrid from '@/components/stuff/ToolGrid';
import Sidebar from '@/components/common/Sidebar';
import UsageWidget from '@/components/stuff/UsageWidget';
import { TOOL_LIST } from '@/constants/tools';
import type { ToolUsageItem } from '@/types/tool';

export const metadata: Metadata = {
    title: '잡동사니',
    description: 'PDF 병합, 이미지 압축, 웹게임 등 다양한 미니 도구 모음.',
};

/** 더미 사용량 데이터 */
const DUMMY_USAGE: ToolUsageItem[] = [
    { id: 'pdf-merge', name: 'PDF 병합', count: 2847 },
    { id: 'image-compress', name: '이미지 압축', count: 1523 },
    { id: 'qr-generator', name: 'QR 코드 생성', count: 521 },
];

export default function StuffPage() {
    return (
        <main className="page-layout page-layout-sub">
            {/* 좌측: 도구 그리드 */}
            <ToolGrid tools={TOOL_LIST} />

            {/* 우측: 사이드바 */}
            <Sidebar>
                <UsageWidget items={DUMMY_USAGE} />
            </Sidebar>
        </main>
    );
}
