/**
 * 동향 탭 페이지 (메인 "/" 라우트)
 *
 * 2단 구조 — 좌측 TrendFeed + 우측 사이드바(인기글, 수집 스케줄)
 * 실제 API 연동: useTrends, useSearchTrends, usePopularTrends
 */

import type { Metadata } from 'next';
import TrendsClient from './TrendsClient';

export const metadata: Metadata = {
  title: '잡동사니',
  description: '해외 기술 커뮤니티의 인기 게시물을 번역·요약하여 제공합니다.',
};

export default function TrendsPage() {
  return <TrendsClient />;
}
