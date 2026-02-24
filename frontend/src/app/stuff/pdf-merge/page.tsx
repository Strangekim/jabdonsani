/**
 * PDF 병합 페이지 — 서버 컴포넌트 (메타데이터 전용)
 *
 * 실제 도구 UI는 클라이언트 컴포넌트(PdfMergeClient)에서 처리합니다.
 */

import type { Metadata } from 'next';
import PdfMergeClient from './PdfMergeClient';

export const metadata: Metadata = {
    title: 'PDF 병합',
    description: '여러 개의 PDF 파일을 하나의 문서로 합칩니다. 모든 처리는 브라우저에서 이루어집니다.',
};

export default function PdfMergePage() {
    return <PdfMergeClient />;
}
