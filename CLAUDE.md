# 잡동사니 프로젝트 — Claude 작업 지침

## 프로젝트 개요
개인 블로그 + 해외 기술 동향 수집 + 미니 도구 모음 사이트.
모노레포 구조: `backend/` (Node/Express/TS) + `frontend/` (Next.js 16 App Router)

## 작업 완료 규칙
- **모든 코드 작업 완료 후 git commit까지 자동으로 진행**
- push는 별도 요청이 있을 때만 수행
- 커밋 메시지는 한글로 작성, feat/fix/refactor/chore 컨벤션 준수

## 프로젝트 구조
```
jabdonsani/
├── backend/          # Express + TypeScript (포트 3001)
│   ├── batch/        # HN + Reddit 크롤링, Claude Haiku 번역/요약
│   ├── routers/
│   ├── controllers/
│   └── services/
├── frontend/         # Next.js 16.1.6 App Router (포트 3000)
│   └── src/
│       ├── app/      # 페이지 라우트
│       ├── components/
│       ├── hooks/    # React Query 훅
│       ├── services/ # API 호출 함수
│       ├── lib/      # fetch 래퍼, queryClient
│       ├── constants/
│       └── types/
├── docker-compose.yml
├── nginx.conf
└── .github/workflows/deploy.yml
```

## 코딩 규칙

### 공통
- **한글 주석 필수**
- 불필요한 추상화, 미래를 위한 설계 금지 — 현재 필요한 것만 구현
- 사용하지 않는 코드 삭제 (주석 처리 금지)

### 프론트엔드 (Next.js)
- **CSS Modules 사용, Tailwind 없음**
- `params`는 반드시 `await params` 또는 `use(params)` (Next.js 16 비동기 params)
- 서버 컴포넌트 기본, 클라이언트 상태 필요 시에만 `'use client'`
- API 호출은 `services/` → `hooks/` 레이어 분리 유지
- `fetch` 래퍼(`lib/api.ts`)는 `credentials: 'include'` 기본 적용
- 무한스크롤: `useInfiniteQuery` + `useInfiniteScroll` (Intersection Observer)

### 백엔드 (Express)
- Router → Controller → Service 구조 유지
- 입력 유효성 검사는 Zod 미들웨어 사용
- 세션 인증: `req.session.userId` 확인

### 새 도구 추가 시 체크리스트 (/stuff)
1. `frontend/src/app/stuff/<id>/page.tsx` — 서버 컴포넌트 + metadata
2. `frontend/src/app/stuff/<id>/<Name>Client.tsx` — 클라이언트 컴포넌트
3. `frontend/src/app/stuff/<id>/<Name>Client.module.css` — CSS 모듈
4. `frontend/src/constants/tools.ts` — TOOL_LIST에 항목 추가
5. `frontend/src/components/stuff/ToolCard.module.css` — colorClass 그라데이션 추가

### 게임 페이지
- `GameShell` 컴포넌트 사용 (iframe 풀스크린)
- 게임 라우트(`/stuff/watermelon`, `/stuff/bugshooter`, `/stuff/bowling`)는 헤더 숨김 처리됨
- 정적 파일: `frontend/public/games/<name>/`

## 알려진 이슈 / 결정사항
- **Claude JSON 파싱**: trailing comma 제거 필요 → `.replace(/,\s*([\]}])/g, "$1")`
- **Reddit 썸네일**: `preview.redd.it` 핫링크 차단 → `fetchThumbnail(post.url)`로 og:image 추출
- **Anthropic Batch API 미사용**: 예측 불가 지연 → 기존 `original_id` skip으로 비용 절감
- **Docker**: 서버에서 `docker-compose` (v1 standalone), 명령어에 `sudo` 필요
- **FFmpeg.wasm**: `@ffmpeg/core` wasm은 unpkg CDN에서 런타임 로드 (빌드 포함 안 됨)

## 환경변수
- `.env` (루트): `DB_*`, `ANTHROPIC_API_KEY`, `SESSION_SECRET`, `BACKEND_PORT`
- `NEXT_PUBLIC_API_URL`: 미설정 시 `/api` → Next.js rewrites로 백엔드 프록시

## 개발 서버 실행
```bash
# 전체 (Docker)
docker-compose up -d

# 프론트엔드만
cd frontend && npm run dev

# 백엔드만
cd backend && npm run dev
```

## 배포
- GitHub main 브랜치 push → GitHub Actions → OCI 서버 SSH → docker-compose up --build
- 서버: OCI VM (Ubuntu 22.04, aarch64), nginx 리버스 프록시
- nginx: `/` → localhost:3000 (Next.js), `/api/` → localhost:3001 (Express)
