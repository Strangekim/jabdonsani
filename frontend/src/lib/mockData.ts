/* ================================================================
   목업 데이터 — 백엔드 미연결 상태에서 UI 확인용
   백엔드 연결 후에는 이 파일을 참조하는 코드를 제거하세요.
   ================================================================ */

import type { TrendItem, TrendPopularItem } from '@/types/trend';
import type { PostListItem, PostPopularItem, TagItem } from '@/types/post';

const now = Date.now();
const ago = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();

/* ── 동향 카드 더미 데이터 ── */
export const MOCK_TRENDS: TrendItem[] = [
    {
        id: 1,
        source: 'hn',
        fieldTag: 'dev',
        sourceTags: ['#HackerNews'],
        fieldTags: ['#개발'],
        title: 'Deno 2.0 공식 출시 — Node.js 완전 호환 + npm 지원',
        content:
            'Ryan Dahl이 만든 Deno 런타임의 2.0 버전이 공식 출시됐다. 이번 버전에서는 Node.js 완전 호환성과 npm 패키지 직접 설치 지원이 추가됐고, V8 엔진 업그레이드로 성능도 크게 향상됐다. 특히 기존 Node.js 프로젝트를 그대로 실행할 수 있는 호환 레이어가 핵심 변경점이다.',
        thumbnails: [],
        commentSummary:
            '커뮤니티 반응은 엇갈린다. npm 호환이 반갑다는 의견과, Deno의 초기 철학(npm 탈피)을 포기한 것 아니냐는 우려가 공존한다. 실제 사용자들은 마이그레이션 편의성에 높은 점수를 주는 중.',
        topComments: [
            { text: 'npm 호환성이 드디어 완성됐다. 이제 써볼 만하다', votes: 412 },
            { text: '근데 결국 Node랑 뭐가 달라지는 거야?', votes: 238 },
            { text: 'Bun이랑 벤치마크 비교가 궁금하다', votes: 175 },
        ],
        upvotes: 1840,
        views: 0,
        originalUrl: 'https://deno.com/blog/v2',
        createdAt: ago(2),
    },
    {
        id: 2,
        source: 'hfpapers',
        fieldTag: 'ai',
        sourceTags: ['#HFPapers'],
        fieldTags: ['#AI'],
        title: 'Qwen2.5-Coder: 오픈소스 코딩 특화 LLM, GPT-4o 수준 벤치마크 달성',
        content:
            'Alibaba의 Qwen 팀이 공개한 Qwen2.5-Coder는 HumanEval 기준 92.7점을 기록하며 GPT-4o에 근접한 성능을 오픈소스로 구현했다. 0.5B~72B까지 다양한 크기로 출시됐으며, 특히 32B 모델은 코드 생성, 수정, 설명 등 모든 태스크에서 이전 버전 대비 큰 폭의 향상을 보였다.',
        thumbnails: [],
        commentSummary:
            '오픈소스 코딩 LLM 시장이 급격히 성숙하고 있다는 반응이 지배적. 로컬 실행 가능한 코딩 어시스턴트 수요가 높아지면서 기업 채택 사례도 늘고 있다는 댓글이 많다.',
        topComments: [
            { text: '32B 모델 M2 Max에서 돌려봤는데 Copilot 대체 가능한 수준', votes: 523 },
            { text: '중국 AI 랩들의 오픈소스 기여가 생각보다 훨씬 크다', votes: 301 },
        ],
        upvotes: 2150,
        views: 0,
        originalUrl: 'https://huggingface.co/papers/qwen2.5-coder',
        createdAt: ago(5),
    },
    {
        id: 3,
        source: 'devto',
        fieldTag: 'dev',
        sourceTags: ['#DevTo'],
        fieldTags: ['#개발'],
        title: 'CSS Grid Subgrid, 이제 모든 브라우저에서 쓸 수 있다',
        content:
            'CSS Grid Subgrid가 마침내 모든 주요 브라우저(Chrome, Firefox, Safari, Edge)에서 완전 지원된다. 중첩 그리드 레이아웃에서 부모의 트랙을 자식 요소가 공유할 수 있어, 복잡한 레이아웃을 훨씬 깔끔하게 구현할 수 있게 됐다. 특히 카드 컴포넌트 내부 정렬 문제가 단 몇 줄로 해결된다.',
        thumbnails: [],
        commentSummary:
            'CSS 개발자들이 오랜 숙원이 풀렸다고 환호하는 반응. 다만 실제 프로젝트에 적용하기까지는 구형 브라우저 지원 때문에 시간이 걸릴 것이라는 의견도 있다.',
        topComments: [
            { text: '이걸로 카드 레이아웃 정렬 문제 드디어 해결된다', votes: 287 },
            { text: '근데 사용법이 직관적이지 않아서 적응하는 데 시간 걸릴 듯', votes: 142 },
        ],
        upvotes: 890,
        views: 0,
        originalUrl: 'https://dev.to/css-grid-subgrid',
        createdAt: ago(8),
    },
    {
        id: 4,
        source: 'lobsters',
        fieldTag: 'dev',
        sourceTags: ['#Lobsters'],
        fieldTags: ['#개발'],
        title: 'SQLite는 왜 이렇게 빠른가 — 내부 아키텍처 분석',
        content:
            'SQLite가 수십 년간 세계에서 가장 많이 배포된 데이터베이스가 된 이유를 내부 구조 관점에서 분석한 글. B-Tree 구현, WAL 모드, 메모리 관리 전략 등 핵심 설계 결정들이 어떻게 조합되어 놀라운 성능을 만들어내는지 설명한다.',
        thumbnails: [],
        commentSummary:
            '시스템 프로그래밍에 관심 있는 개발자들 사이에서 높은 호응. "PostgreSQL과 다른 철학을 가지고 있다"는 관점에서 접근하는 댓글들이 흥미롭다.',
        topComments: [
            { text: '파일 하나가 완전한 데이터베이스라는 개념이 아직도 놀랍다', votes: 198 },
            { text: 'WAL 모드 켜면 성능이 몇 배 올라가는 거 경험해봤음', votes: 134 },
        ],
        upvotes: 645,
        views: 0,
        originalUrl: 'https://lobste.rs/s/sqlite-internals',
        createdAt: ago(12),
    },
    {
        id: 5,
        source: 'hn',
        fieldTag: 'ai',
        sourceTags: ['#HackerNews'],
        fieldTags: ['#AI'],
        title: 'OpenAI o3 모델 공개 — 수학·코딩 벤치마크 역대 최고점',
        content:
            'OpenAI가 공개한 o3 모델이 ARC-AGI 벤치마크에서 87.5%를 기록하며 기존 최고점을 크게 상회했다. 수학 올림피아드(AIME) 96.7%, 코딩(Codeforces) 2727 레이팅 달성. 추론 과정에 컴퓨팅을 동적으로 할당하는 새로운 접근법이 핵심이다.',
        thumbnails: [],
        commentSummary:
            'AGI 논쟁이 다시 불붙었다. 벤치마크 해킹이라는 비판도 있지만, 실제 어려운 문제를 푸는 능력이 이전과 질적으로 다르다는 의견도 팽팽히 맞선다.',
        topComments: [
            { text: 'ARC-AGI 만든 François Chollet가 뭐라고 할지 궁금하다', votes: 756 },
            { text: '추론 시간 스케일링이 진짜 다음 단계인가', votes: 489 },
            { text: '근데 추론 비용이 너무 비싸지 않나', votes: 312 },
        ],
        upvotes: 3200,
        views: 0,
        originalUrl: 'https://openai.com/o3',
        createdAt: ago(18),
    },
];

/* ── 동향 인기글 더미 ── */
export const MOCK_POPULAR_TRENDS: TrendPopularItem[] = [
    { id: 5, title: 'OpenAI o3 모델 공개 — 수학·코딩 벤치마크 역대 최고점', source: 'hn', upvotes: 3200, createdAt: ago(18) },
    { id: 2, title: 'Qwen2.5-Coder: GPT-4o 수준 오픈소스 코딩 LLM', source: 'hfpapers', upvotes: 2150, createdAt: ago(5) },
    { id: 1, title: 'Deno 2.0 공식 출시 — Node.js 완전 호환 + npm 지원', source: 'hn', upvotes: 1840, createdAt: ago(2) },
    { id: 3, title: 'CSS Grid Subgrid, 모든 브라우저 완전 지원', source: 'devto', upvotes: 890, createdAt: ago(8) },
    { id: 4, title: 'SQLite는 왜 이렇게 빠른가 — 내부 아키텍처 분석', source: 'lobsters', upvotes: 645, createdAt: ago(12) },
];

/* ── 블로그 글 더미 ── */
export const MOCK_POSTS: PostListItem[] = [
    {
        id: 1,
        title: 'React Query로 무한 스크롤 구현하기',
        description: 'useInfiniteQuery와 Intersection Observer를 조합해 선언적으로 무한 스크롤을 구현하는 방법을 정리했습니다. cursor 기반 페이지네이션 API 연동도 포함합니다.',
        tags: ['React', 'React Query', '프론트엔드'],
        views: 1240,
        createdAt: ago(24),
    },
    {
        id: 2,
        title: 'PostgreSQL EXPLAIN ANALYZE 제대로 읽는 법',
        description: '쿼리 최적화의 시작은 실행 계획 이해다. Seq Scan vs Index Scan, cost 계산 방식, rows 추정값이 실제와 다른 이유까지 실제 예시로 설명합니다.',
        tags: ['PostgreSQL', '데이터베이스', '최적화'],
        views: 892,
        createdAt: ago(48),
    },
    {
        id: 3,
        title: 'Docker Compose로 로컬 개발 환경 세팅하기',
        description: 'Node.js 백엔드, PostgreSQL, nginx를 Docker Compose로 한 번에 띄우는 설정을 공유합니다. named volume, health check, 네트워크 격리까지 실전 구성을 담았습니다.',
        tags: ['Docker', 'DevOps', 'Node.js'],
        views: 756,
        createdAt: ago(72),
    },
    {
        id: 4,
        title: 'TypeScript 타입 좁히기 패턴 정리',
        description: 'union 타입을 다룰 때 자주 쓰는 타입 가드, discriminated union, 조건부 타입 패턴들을 실제 코드 예시와 함께 정리했습니다.',
        tags: ['TypeScript', '프론트엔드'],
        views: 534,
        createdAt: ago(96),
    },
];

/* ── 블로그 인기글 더미 ── */
export const MOCK_POPULAR_POSTS: PostPopularItem[] = [
    { id: 1, title: 'React Query로 무한 스크롤 구현하기', views: 1240, createdAt: ago(24) },
    { id: 2, title: 'PostgreSQL EXPLAIN ANALYZE 제대로 읽는 법', views: 892, createdAt: ago(48) },
    { id: 3, title: 'Docker Compose로 로컬 개발 환경 세팅하기', views: 756, createdAt: ago(72) },
    { id: 4, title: 'TypeScript 타입 좁히기 패턴 정리', views: 534, createdAt: ago(96) },
];

/* ── 태그 클라우드 더미 ── */
export const MOCK_TAGS: TagItem[] = [
    { name: 'React', count: 8 },
    { name: 'TypeScript', count: 6 },
    { name: 'Node.js', count: 5 },
    { name: 'PostgreSQL', count: 4 },
    { name: 'Docker', count: 3 },
    { name: '프론트엔드', count: 7 },
    { name: 'DevOps', count: 3 },
    { name: '최적화', count: 2 },
];
