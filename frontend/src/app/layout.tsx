import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/common/Header';
import CookieBanner from '@/components/common/CookieBanner';
import ScrollToTop from '@/components/common/ScrollToTop';
import QueryProvider from '@/components/common/QueryProvider';

/**
 * 루트 메타데이터 — 사이트 전역 SEO 설정
 * 개별 페이지에서 generateMetadata로 덮어쓸 수 있습니다.
 */
export const metadata: Metadata = {
  title: {
    default: '잡동사니',
    template: '%s — 잡동사니',
  },
  description:
    '해외 기술 동향, 기술 블로그, 다양한 미니 도구를 한곳에 모은 개인 블로그',
  keywords: ['기술 블로그', '개발', 'AI', '동향', '잡동사니'],
};

/**
 * 루트 레이아웃 — 모든 페이지에 공통 적용
 * - 폰트: CDN으로 Pretendard, JetBrains Mono 로드
 * - 공통 UI: Header, CookieBanner, ScrollToTop
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* ===== 외부 폰트 CDN ===== */}
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        {/* Pretendard (한글/영문 UI·본문) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
        />
        {/* JetBrains Mono (코드 블록) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/JetBrains/JetBrainsMono/css/jetbrains-mono.css"
        />
        {/* Material Symbols (아이콘) */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body>
        {/* React Query 전역 Provider */}
        <QueryProvider>
          {/* 공통 헤더 */}
          <Header />

          {/* 페이지 콘텐츠 */}
          {children}

          {/* 공통 하단 UI */}
          <CookieBanner />
          <ScrollToTop />
        </QueryProvider>
      </body>
    </html>
  );
}
