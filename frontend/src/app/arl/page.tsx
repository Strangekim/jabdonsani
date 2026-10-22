import type { Metadata } from 'next';
import ArlPreview from './ArlPreview';

export const metadata: Metadata = {
    title: 'ARL · 개발 미리보기',
    description: 'Acoustic Reality Lab의 최신 브라우저 개발 미리보기.',
    robots: { index: false, follow: false },
};

export default function ArlPage() {
    return <ArlPreview />;
}
