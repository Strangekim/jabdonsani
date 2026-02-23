/**
 * 동향 탭 페이지 (메인 "/" 라우트)
 *
 * 프로토타입 trends.html의 레이아웃:
 * 2단 구조 — 좌측 TrendFeed + 우측 사이드바(인기글, 수집 스케줄)
 *
 * NOTE: 현재는 더미 데이터로 스캐폴딩. 추후 API 연동 시 교체.
 */

import type { Metadata } from 'next';
import TrendsClient from './TrendsClient';
import type { TrendItem, TrendPopularItem } from '@/types/trend';

export const metadata: Metadata = {
  title: '동향',
  description: '해외 기술 커뮤니티의 인기 게시물을 번역·요약하여 제공합니다.',
};

/** 더미 동향 데이터 — API 연동 전 스캐폴딩용 */
const DUMMY_TRENDS: TrendItem[] = [
  {
    id: 1,
    source: 'hn',
    fieldTag: 'ai',
    sourceTags: ['#HackerNews'],
    fieldTags: ['#AI'],
    title: 'GPT-5 출시 소식 — 멀티모달 성능이 한 단계 더 발전',
    content:
      'OpenAI가 GPT-5를 공개했습니다. 이번 모델은 이미지, 오디오, 비디오 처리 능력이 크게 향상되었으며, 새로운 reasoning 아키텍처를 도입했습니다...',
    thumbnails: [],
    commentSummary:
      '대체로 긍정적인 반응이며, 특히 코드 생성 능력 향상에 대한 기대가 높습니다.',
    topComments: [
      { text: '새로운 reasoning 아키텍처가 정말 인상적이네요.', votes: 342 },
      { text: '가격 정책이 어떻게 될지가 관건입니다.', votes: 156 },
    ],
    upvotes: 1247,
    views: 5623,
    originalUrl: 'https://news.ycombinator.com',
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 2,
    source: 'localllama',
    fieldTag: 'ai',
    sourceTags: ['#r/LocalLLaMA'],
    fieldTags: ['#AI'],
    title: 'Llama 4 벤치마크 결과 공유 — M4 Mac에서의 실행 성능',
    content:
      'Apple M4 Pro에서 Llama 4 7B 모델을 실행한 벤치마크 결과를 공유합니다. MLX를 활용하여 최적화한 결과, 초당 토큰 생성 속도가...',
    thumbnails: [],
    commentSummary: 'M4 칩의 메모리 대역폭 활용도에 대한 깊은 분석이 돋보입니다.',
    topComments: [
      { text: '이 정도면 로컬 LLM 실사용이 가능하겠네요!', votes: 89 },
    ],
    upvotes: 523,
    views: 2810,
    originalUrl: 'https://reddit.com',
    createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
];

/** 더미 인기글 데이터 */
const DUMMY_POPULAR: TrendPopularItem[] = [
  {
    id: 1,
    title: 'GPT-5 출시 소식',
    source: 'hn',
    upvotes: 1247,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'Llama 4 벤치마크',
    source: 'localllama',
    upvotes: 523,
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    title: 'Rust 2025 에디션 발표',
    source: 'programming',
    upvotes: 412,
    createdAt: new Date().toISOString(),
  },
];

export default function TrendsPage() {
  return (
    <TrendsClient initialTrends={DUMMY_TRENDS} initialPopular={DUMMY_POPULAR} />
  );
}
