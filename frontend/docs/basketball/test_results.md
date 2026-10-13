# 구현 검증 결과

검증 환경: Linux, Node24.19.0, Next16.1.6, React19.2.3, TypeScript5.9.3. 원본 기준 commit은 `1f3b4e1d59454e8990330686d0cc0f36410a5026`이고 작업 브랜치는 `feat/basketball-sim-tab`이다. 사용자 컴퓨터/운영 서버/배포는 사용하지 않았다.

## 자동 검증

| 확인 | 결과와 범위 |
|---|---|
| 엔진 단위·회귀 테스트 | 54/54통과, 실패·건너뜀0 |
| 속성 실험 |30개 실제 계산 경로 섭동, 필수8개 기대관계의 짝지은 시드 비교 |
| 규칙 | 드리블10개 필수 시나리오, 풋워크, 시간초과, 공수 전환, 공격 리바운드·루즈볼 카운트 유지 |
| 동시성 | 단독 제출 불변, 제출 순서 독립, 숨김 관찰, 역할 교환, 동일 인간/AI 검증 |
| 이벤트 스케줄러 | 실제 인터럽트 경계, 계속하기, 짧은 행동 완료/긴 행동 보존, 시작 시에만 비용 소비 |
| 리플레이 | 초기 상태·시드·명령의 재실행 일치, JSON 왕복, 예약·취소 동작 재현, 잘못된 형식 거부 |
| 스트레스 |1,500개의 임의 합법 마이크로턴 상태 불변식, 틱·시드 경계의 실제 종료 경기 |
| React DOM 통합 | 24/24통과. jsdom에 실제 엔진을 연결. 모드, 인계, 예약, 설정, 리플레이, 취소 및 Worker 수명주기 |
| 기본 통계 |10,023 종료 포제션/303 완주 경기/283,559마이크로 결정점 |
| TypeScript | 전체 프론트 noEmit 검사 통과 |
| 신규 코드 ESLint | 농구·테스트·설정·연결된 헤더 범위 통과 |
| Production build | 통과, /basketball 포함21개 정적 페이지 생성 |
| 기존 전체 ESLint | 실패. 이번 작업 전부터44개 오류/16개 경고. 아래 설명 참조 |
| 실제 브라우저 시각/픽셀 QA | 미검증. 아래 환경 제한 참조 |

## 재실행 명령

```bash
cd frontend
npm ci
npm run test:basketball
npm run test:basketball-ui
npm run stats:basketball
npm run lint:basketball
npm run typecheck
npm run build
```

엔진 테스트는 별도 임시 디렉터리로 TypeScript를 CommonJS 컴파일하고 Node test runner로 실행한다. React DOM은 Vitest3/jsdom26/Testing Library를 사용하며 Node20 대상 저장소와 호환되는 버전을 선택했다. 별도 TypeScript 설정과 Vitest include로 두 러너를 섞지 않는다.

## 통합 테스트의 의미와 한계

React 화면은 실제 엔진과 연결한 채 버튼·폼·범위 입력·파일 입력·다시 시작/모드 변경 취소를 조작했다. 경기 결과를 더미로 대체하지 않는다. 통계 Worker 수명주기 테스트만 Worker를 스텁하며 계산 자체는 동일한 순수 통계 모듈을 엔진 테스트/CLI에서 실행한다.

jsdom의 모바일/데스크톱 DOM 확인은 요소·접근성 의미 및 컨트롤 존재 검사다. CSS 레이아웃/실제 픽셀/실기기 터치/브라우저 Worker 번들 실행을 확인한 것은 아니다.

클라우드 브라우저가 실행 명령의 격리된 localhost 서버에 접근하지 못해 `ERR_CONNECTION_REFUSED`가 발생했다. 정식 sandbox escalation도 연결을 해결하지 못했고 추가 확인은 bwrap mount 런타임 오류로 실패했다. 우회 터널·다른 브라우저 제어를 사용하지 않았으며 브라우저 스크린샷을 성공한 결과처럼 제공하지 않는다. 사용자 환경에서 /basketball의 좁은 화면, 실제 Worker, 파일 다운로드/가져오기 및 키보드 흐름을 추가 확인해야 한다.

## 기존 전체 lint 기준

초기 전체 lint에서44개 오류/16개 경고를 확인했다. 대부분 기존 vendored Three.js의 규칙 및 기존 CookieBanner/useInfiniteScroll/GifMaker 등의 React/TypeScript lint다. 농구 변경의 오류로 보고하지 않으며 이번 범위에서 기존 게임 벤더·블로그·훅 코드를 수정하지 않았다. 신규 파일 및 변경한 헤더/탭은 별도 범위로 검사한다. 전체 lint가 통과했다고 주장하지 않는다.

## 완료 조건 매핑

1. 처음부터 끝까지 경기: 실제 AI/수비 조작 통합 및 통계 완주
2. 3드리블/네 번째 거부: 행동·복합·큐·계속 명령의 단위 테스트
3. 풋워크: 초기 무단 이동·개더 두 스텝·더블 드리블·피벗 관성 테스트
4. 공수 세부 조작: 행동 카탈로그48종/방향·속도·간격·예측·슈팅 입력
5. 같은 시간축: 제출 순서 독립/미제출 불변/이벤트 경계 테스트
6.30개 능력치/양측 체력: 실제 동적 차이 및 통제된 관계 검증
7. 공간 상호작용: 경로·접촉·수비 자세·돌파/제어 분리
8. 슛·스틸·블록·파울·리바운드: 고정 시드 사건 관측 및 소유권 규칙
9.4모드/역할 교대: React DOM과 엔진 통합
10. UI 분리/재현: 순수 TS 모듈과 JSON 명령 리플레이
11. 자동 테스트/10,000포제션: 실행 원자료와밸런스 보고서
12. 전체 행동/속성 문서,30개 상호작용 사례: docs/basketball의17개 문서

검사 통과는 실제 농구와의 통계적 정합성이나 전략 최적성을 증명하지 않는다. 발견한 선공 편향·미관측 기술·시각 검증 한계는 balance_report와 이 문서에 분리해 기록한다.

## 최종 통합 실행 증거

2026-10-13 UTC 실행: 엔진54/54, React DOM24/24, 신규 ESLint, 전체 TypeScript, production build 순서로 모두 exit0. 전체 ESLint는 원본과 같은44개 오류/16개 경고로 exit1. 원자료는 results/aggregate-checks.txt와 results/full-lint-existing.txt, results/test-results.json이다.
