/**
 * QR 코드 생성 페이지 — 서버 컴포넌트 (메타데이터 전용)
 */

import type { Metadata } from 'next';
import QrGeneratorClient from './QrGeneratorClient';

export const metadata: Metadata = {
    title: 'QR 코드 생성',
    description: 'URL이나 텍스트를 QR 코드로 변환합니다. 모든 처리는 브라우저에서 이루어집니다.',
};

export default function QrGeneratorPage() {
    return <QrGeneratorClient />;
}
