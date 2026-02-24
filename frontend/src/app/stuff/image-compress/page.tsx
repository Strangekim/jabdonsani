/**
 * 이미지 압축 페이지 — 서버 컴포넌트 (메타데이터 전용)
 */

import type { Metadata } from 'next';
import ImageCompressClient from './ImageCompressClient';

export const metadata: Metadata = {
    title: '이미지 압축',
    description: '이미지 품질을 조절하여 파일 크기를 줄입니다. 모든 처리는 브라우저에서 이루어집니다.',
};

export default function ImageCompressPage() {
    return <ImageCompressClient />;
}
