/**
 * 미구현 도구 폴백 페이지 ("/stuff/[slug]")
 *
 * 구현된 도구는 각자의 정적 디렉토리(예: stuff/pdf-merge/page.tsx)에서 처리됩니다.
 * Next.js App Router에서 정적 경로가 동적 경로보다 우선하므로,
 * 이 페이지는 아직 구현되지 않은 도구에만 도달합니다.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { TOOL_LIST } from '@/constants/tools';
import ToolPageShell from '@/components/stuff/tools/ToolPageShell';

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const tool = TOOL_LIST.find((t) => t.id === slug);
    return {
        title: tool ? `${tool.name} — 준비 중` : '도구를 찾을 수 없음',
    };
}

export default async function ToolDetailPage({ params }: Props) {
    const { slug } = await params;
    const tool = TOOL_LIST.find((t) => t.id === slug);

    /* 도구 목록에 없는 슬러그 → 404 메시지 */
    if (!tool) {
        return (
            <main
                style={{
                    maxWidth: 'var(--max-width)',
                    margin: '0 auto',
                    padding: '60px var(--content-padding)',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px',
                }}
            >
                <p style={{ fontSize: '15px', color: 'var(--color-text-muted)' }}>
                    존재하지 않는 도구입니다.
                </p>
                <Link
                    href="/stuff"
                    style={{ color: 'var(--color-accent)', fontSize: '14px', fontWeight: 600 }}
                >
                    ← 잡동사니로 돌아가기
                </Link>
            </main>
        );
    }

    /* 알려진 도구이나 아직 미구현 → 준비 중 페이지 */
    return (
        <ToolPageShell
            name={tool.name}
            icon={tool.icon ?? 'build'}
            description={tool.description}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '52px 24px',
                    background: 'var(--color-card-bg)',
                    border: '1px dashed var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center',
                }}
            >
                <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '52px', color: 'var(--color-text-muted)' }}
                    aria-hidden="true"
                >
                    build_circle
                </span>
                <p
                    style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'var(--color-text-secondary)',
                        margin: 0,
                    }}
                >
                    준비 중입니다
                </p>
                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
                    이 도구는 현재 개발 중입니다. 조금만 기다려 주세요!
                </p>
            </div>
        </ToolPageShell>
    );
}
