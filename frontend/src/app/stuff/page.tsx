/**
 * 잡동사니 도구 목록 페이지 ("/stuff")
 *
 * 2단 구조 — 좌측 ToolGrid + 우측 사이드바(사용량 현황)
 * 도구 목록은 constants/tools.ts 하드코딩 관리 (API 없음)
 * 사용량 통계는 GET /api/tools/usage API 연동
 */

import type { Metadata } from 'next';
import StuffClient from './StuffClient';

export const metadata: Metadata = {
    title: '잡동사니',
    description: 'PDF 병합, 이미지 압축, 웹게임 등 다양한 미니 도구 모음.',
};

export default function StuffPage() {
    return <StuffClient />;
}
