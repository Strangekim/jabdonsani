/**
 * 개별 도구 페이지 ("/stuff/[slug]")
 *
 * 각 도구의 실제 기능을 구현하는 페이지.
 * 현재는 스캐폴딩만 작성 — 추후 도구별 구현체를 추가합니다.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: '도구',
};

export default function ToolDetailPage() {
    return (
        <main
            style={{
                maxWidth: 'var(--max-width)',
                margin: '0 auto',
                padding: '40px var(--content-padding)',
                textAlign: 'center',
            }}
        >
            <h1
                style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    marginBottom: '16px',
                    color: 'var(--color-text-primary)',
                }}
            >
                🛠️ 도구 페이지
            </h1>
            <p
                style={{
                    fontSize: '15px',
                    color: 'var(--color-text-secondary)',
                }}
            >
                이 도구의 기능은 추후 구현될 예정입니다.
            </p>
        </main>
    );
}
