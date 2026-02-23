/**
 * UI Kit 페이지 ("/ui-kit")
 *
 * 프로젝트의 모든 개별 컴포넌트를 한눈에 확인할 수 있는 쇼케이스 페이지.
 * 디자인 토큰(컬러, 타이포그래피), 공통 컴포넌트, 동향/블로그/잡동사니 탭별
 * 컴포넌트를 모두 포함합니다.
 */

import type { Metadata } from 'next';

/* ── 공통 컴포넌트 ── */
import Logo from '@/components/common/Logo';
import Sidebar, { Widget } from '@/components/common/Sidebar';

/* ── 동향 탭 컴포넌트 ── */
import FilterBar from '@/components/trends/FilterBar';
import SearchPanel from '@/components/trends/SearchPanel';
import TrendCard from '@/components/trends/TrendCard';
import PopularWidget from '@/components/trends/PopularWidget';
import ScheduleWidget from '@/components/trends/ScheduleWidget';

/* ── 블로그 탭 컴포넌트 ── */
import PostCard from '@/components/blog/PostCard';
import PostNav from '@/components/blog/PostNav';
import ProfileWidget from '@/components/blog/ProfileWidget';
import TagCloud from '@/components/blog/TagCloud';
import BlogPopularWidget from '@/components/blog/BlogPopularWidget';

/* ── 잡동사니 탭 컴포넌트 ── */
import ToolCard from '@/components/stuff/ToolCard';
import UsageWidget from '@/components/stuff/UsageWidget';

/* ── 상수 ── */
import { TOOL_LIST } from '@/constants/tools';

/* ── 스타일 ── */
import styles from './page.module.css';

export const metadata: Metadata = {
    title: 'UI Kit',
    description: '잡동사니 프로젝트의 모든 UI 컴포넌트를 한눈에 확인합니다.',
};

export default function UIKitPage() {
    return (
        <div className={styles.uiKit}>
            <h1 className={styles.uiKitTitle}>🎨 UI Kit</h1>
            <p className={styles.uiKitDesc}>
                잡동사니 프로젝트의 모든 UI 컴포넌트를 한눈에 확인할 수 있는 쇼케이스입니다.
            </p>

            {/* ============================================================
          1. 디자인 토큰 — 컬러 팔레트
          ============================================================ */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>1. 컬러 팔레트</h2>
                <p className={styles.sectionDesc}>
                    프로젝트 전역에서 사용되는 CSS 커스텀 속성 (tokens.css)
                </p>
                <div className={styles.colorGrid}>
                    <div
                        className={styles.colorSwatch}
                        style={{ background: '#0f172a', color: '#fff' }}
                    >
                        Header BG
                        <span className={styles.colorSwatchLabel}>#0f172a</span>
                    </div>
                    <div
                        className={styles.colorSwatch}
                        style={{ background: '#14b8a6', color: '#fff' }}
                    >
                        Accent (Teal)
                        <span className={styles.colorSwatchLabel}>#14b8a6</span>
                    </div>
                    <div
                        className={styles.colorSwatch}
                        style={{ background: '#0d9488', color: '#fff' }}
                    >
                        Accent Hover
                        <span className={styles.colorSwatchLabel}>#0d9488</span>
                    </div>
                    <div
                        className={styles.colorSwatch}
                        style={{ background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0' }}
                    >
                        Page BG
                        <span className={styles.colorSwatchLabel}>#f8fafc</span>
                    </div>
                    <div
                        className={styles.colorSwatch}
                        style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' }}
                    >
                        Card BG
                        <span className={styles.colorSwatchLabel}>#ffffff</span>
                    </div>
                    <div
                        className={styles.colorSwatch}
                        style={{ background: '#f0fdfa', color: '#14b8a6', border: '1px solid #e2e8f0' }}
                    >
                        Accent Light
                        <span className={styles.colorSwatchLabel}>#f0fdfa</span>
                    </div>
                    <div
                        className={styles.colorSwatch}
                        style={{ background: '#ff6600', color: '#fff' }}
                    >
                        Source: HN
                        <span className={styles.colorSwatchLabel}>#ff6600</span>
                    </div>
                    <div
                        className={styles.colorSwatch}
                        style={{ background: '#10b981', color: '#fff' }}
                    >
                        Source: LocalLLaMA
                        <span className={styles.colorSwatchLabel}>#10b981</span>
                    </div>
                    <div
                        className={styles.colorSwatch}
                        style={{ background: '#e11d48', color: '#fff' }}
                    >
                        Source: ML
                        <span className={styles.colorSwatchLabel}>#e11d48</span>
                    </div>
                    <div
                        className={styles.colorSwatch}
                        style={{ background: '#3b82f6', color: '#fff' }}
                    >
                        Source: Programming
                        <span className={styles.colorSwatchLabel}>#3b82f6</span>
                    </div>
                </div>
            </section>

            {/* ============================================================
          2. 타이포그래피
          ============================================================ */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>2. 타이포그래피</h2>
                <p className={styles.sectionDesc}>
                    Geist (영문), Pretendard (한글), JetBrains Mono (코드)
                </p>
                <div>
                    <div className={styles.typeRow}>
                        <div className={styles.typeLabel}>H1 — 28px / 800</div>
                        <div style={{ fontSize: '28px', fontWeight: 800 }}>
                            잡동사니 — Jabdonsani
                        </div>
                    </div>
                    <div className={styles.typeRow}>
                        <div className={styles.typeLabel}>H2 — 22px / 700</div>
                        <div style={{ fontSize: '22px', fontWeight: 700 }}>
                            섹션 제목 Section Title
                        </div>
                    </div>
                    <div className={styles.typeRow}>
                        <div className={styles.typeLabel}>H3 — 18px / 700</div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>
                            서브 제목 Sub Title
                        </div>
                    </div>
                    <div className={styles.typeRow}>
                        <div className={styles.typeLabel}>Body — 16.5px / 400</div>
                        <div style={{ fontSize: '16.5px' }}>
                            본문 텍스트입니다. 기술 블로그의 가독성을 위해 적절한 행간과 글자
                            크기를 사용합니다.
                        </div>
                    </div>
                    <div className={styles.typeRow}>
                        <div className={styles.typeLabel}>
                            Code — 14px / JetBrains Mono
                        </div>
                        <div
                            style={{
                                fontSize: '14px',
                                fontFamily: 'var(--font-mono)',
                                background: '#1e293b',
                                color: '#e2e8f0',
                                padding: '12px 16px',
                                borderRadius: '8px',
                            }}
                        >
                            {'const greeting = "Hello, World!";'}
                        </div>
                    </div>
                </div>
            </section>

            {/* ============================================================
          3. 공통 컴포넌트
          ============================================================ */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>3. 공통 컴포넌트</h2>
                <p className={styles.sectionDesc}>
                    Header, Logo, CookieBanner, ScrollToTop, Sidebar
                </p>

                {/* Logo */}
                <div className={styles.componentCard}>
                    <div className={styles.componentLabel}>Logo</div>
                    <div style={{ background: '#0f172a', padding: '16px 20px', borderRadius: '10px', display: 'inline-block' }}>
                        <Logo />
                    </div>
                </div>

                {/* Widget */}
                <div className={styles.componentCard}>
                    <div className={styles.componentLabel}>Widget (사이드바 카드)</div>
                    <div style={{ maxWidth: '320px' }}>
                        <Widget title="위젯 예시" icon="widgets">
                            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                사이드바에 배치되는 위젯 카드의 기본 형태입니다.
                            </p>
                        </Widget>
                    </div>
                </div>
            </section>

            {/* ============================================================
          4. 동향 탭 컴포넌트
          ============================================================ */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>4. 동향 탭 컴포넌트</h2>
                <p className={styles.sectionDesc}>
                    FilterBar, SearchPanel, TrendCard, PopularWidget, ScheduleWidget
                </p>

                {/* FilterBar */}
                <div className={styles.componentCard}>
                    <div className={styles.componentLabel}>FilterBar</div>
                    <FilterBar totalCount={42} />
                </div>

                {/* SearchPanel */}
                <div className={styles.componentCard}>
                    <div className={styles.componentLabel}>SearchPanel (열림 상태)</div>
                    <SearchPanel isOpen={true} />
                </div>

                {/* TrendCard */}
                <div className={styles.componentCard}>
                    <div className={styles.componentLabel}>TrendCard</div>
                    <div style={{ maxWidth: '680px' }}>
                        <TrendCard
                            item={{
                                id: 99,
                                source: 'hn',
                                fieldTag: 'ai',
                                sourceTags: ['#HackerNews'],
                                fieldTags: ['#AI'],
                                title: 'UI Kit 데모 — 이것은 동향 카드 예시입니다',
                                content:
                                    '프로토타입 trends.html의 카드 디자인을 React 컴포넌트로 변환한 예시입니다. 소스 배지, 댓글 요약, 액션바 등을 확인할 수 있습니다.',
                                thumbnails: [],
                                commentSummary: '이 카드는 UI Kit 데모용 댓글 요약입니다.',
                                topComments: [
                                    { text: '디자인이 깔끔하네요!', votes: 42 },
                                    { text: 'React 컴포넌트 분리가 잘 되었습니다.', votes: 18 },
                                ],
                                upvotes: 256,
                                views: 1024,
                                originalUrl: '#',
                                createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
                            }}
                        />
                    </div>
                </div>

                {/* 사이드바 위젯 */}
                <div className={styles.componentCard}>
                    <div className={styles.componentLabel}>
                        PopularWidget + ScheduleWidget
                    </div>
                    <div className={styles.widgetGrid}>
                        <PopularWidget
                            items={[
                                { id: 1, title: '인기글 1위 제목 예시', source: 'hn', upvotes: 500, createdAt: new Date().toISOString() },
                                { id: 2, title: '인기글 2위 제목 예시', source: 'localllama', upvotes: 320, createdAt: new Date().toISOString() },
                                { id: 3, title: '인기글 3위 제목 예시', source: 'ml', upvotes: 180, createdAt: new Date().toISOString() },
                            ]}
                        />
                        <ScheduleWidget />
                    </div>
                </div>
            </section>

            {/* ============================================================
          5. 블로그 탭 컴포넌트
          ============================================================ */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>5. 블로그 탭 컴포넌트</h2>
                <p className={styles.sectionDesc}>
                    PostCard, PostNav, ProfileWidget, TagCloud, BlogPopularWidget
                </p>

                {/* PostCard */}
                <div className={styles.componentCard}>
                    <div className={styles.componentLabel}>PostCard</div>
                    <div style={{ maxWidth: '680px' }}>
                        <PostCard
                            post={{
                                id: 99,
                                title: 'UI Kit 데모 — 이것은 블로그 카드 예시입니다',
                                description:
                                    'PostCard 컴포넌트는 Velog 스타일로 디자인되었습니다. 제목, 설명, 태그, 작성일, 조회수를 표시합니다.',
                                tags: ['React', 'TypeScript', 'Next.js'],
                                views: 789,
                                createdAt: '2026-02-20T10:00:00Z',
                            }}
                        />
                    </div>
                </div>

                {/* PostNav */}
                <div className={styles.componentCard}>
                    <div className={styles.componentLabel}>PostNav (이전/다음 글)</div>
                    <PostNav
                        prevPost={{ id: 1, title: '이전 글 제목 예시' }}
                        nextPost={{ id: 3, title: '다음 글 제목 예시' }}
                    />
                </div>

                {/* 사이드바 위젯 */}
                <div className={styles.componentCard}>
                    <div className={styles.componentLabel}>
                        ProfileWidget + TagCloud + BlogPopularWidget
                    </div>
                    <div className={styles.widgetGrid}>
                        <ProfileWidget />
                        <TagCloud
                            tags={[
                                { name: 'TypeScript', count: 8 },
                                { name: 'Next.js', count: 5 },
                                { name: 'React', count: 4 },
                                { name: 'AI', count: 3 },
                                { name: '클라우드', count: 2 },
                            ]}
                        />
                        <BlogPopularWidget
                            items={[
                                { id: 1, title: '인기 블로그 글 1', views: 1240, createdAt: '2026-02-18T09:00:00Z' },
                                { id: 2, title: '인기 블로그 글 2', views: 892, createdAt: '2026-02-10T15:30:00Z' },
                            ]}
                        />
                    </div>
                </div>
            </section>

            {/* ============================================================
          6. 잡동사니 탭 컴포넌트
          ============================================================ */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>6. 잡동사니 탭 컴포넌트</h2>
                <p className={styles.sectionDesc}>
                    ToolCard, UsageWidget
                </p>

                {/* ToolCards */}
                <div className={styles.componentCard}>
                    <div className={styles.componentLabel}>ToolCard (4개 예시)</div>
                    <div className={styles.toolPreview}>
                        {TOOL_LIST.slice(0, 4).map((tool) => (
                            <ToolCard key={tool.id} tool={tool} />
                        ))}
                    </div>
                </div>

                {/* UsageWidget */}
                <div className={styles.componentCard}>
                    <div className={styles.componentLabel}>UsageWidget</div>
                    <div style={{ maxWidth: '320px' }}>
                        <UsageWidget
                            items={[
                                { id: 'pdf-merge', name: 'PDF 병합', count: 2847 },
                                { id: 'image-compress', name: '이미지 압축', count: 1523 },
                                { id: 'qr-generator', name: 'QR 코드 생성', count: 521 },
                            ]}
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}
