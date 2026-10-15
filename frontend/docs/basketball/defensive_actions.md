# 수비 및 공통 행동

> 아래는 기존 리플레이까지 지원하는 엔진 전체 목록이다. 새 화면과 AI는 `compact.ts`의 상황별 소수 행동만 사용한다. 조작 방식은 `game_design.md`의 간결한 선택 화면을 참고한다.


아래 기본값은 actions.ts에서 추출했다. 실제 시간은 주능력 평균/피로/회복, 소모량은 Endurance/기술 효율, 판정은 상대/거리/현재 상태에 따라 달라진다. 표의 시간은 내부 시뮬레이션의 행동 시간이며 한 쌍의 선택은 완결된 이벤트 턴으로 해석한다. Walk/Sprint는 공격의 라이브 드리블 상태일 때 조건부로 1단위를 소비하며 아래 기본 비용 0을 덮어쓴다.

## 행동별 계산 입력

| ID / 이름 | 주능력 | 기본 시간(s) | 체력 / 순간자원 | 이동배율 | 균형 / 제어 | 기본 드리블 비용 |
|---|---|---:|---:|---:|---:|---:|
| Walk / 걷기 | Speed, Footwork | 0.65 | 0.7 / 0 | 0.35 | 2 / 0 | 0 |
| Sprint / 스프린트 | Speed, Acceleration, Endurance | 0.75 | 5 / 8 | 1 | -6 / -9 | 0 |
| Stop / 정지 | Deceleration, Balance | 0.5 | 0.5 / 0 | 0 | 6 / 3 | 0 |
| HoldPosition / 위치 유지 | PerimeterDefense, DefensiveAwareness, Endurance | 0.65 | 0.8 / 0 | 0.25 | 4 / 0 | 0 |
| DefensiveSlideLeft / 왼쪽 슬라이드 | LateralQuickness, Agility, PerimeterDefense | 0.65 | 2.7 / 2 | 0.7 | -2 / 0 | 0 |
| DefensiveSlideRight / 오른쪽 슬라이드 | LateralQuickness, Agility, PerimeterDefense | 0.65 | 2.7 / 2 | 0.7 | -2 / 0 | 0 |
| RetreatStep / 수비 후퇴 | Footwork, Deceleration, DefensiveAwareness | 0.6 | 1.3 / 1 | 0.45 | 2 / 0 | 0 |
| ForwardStep / 전진 압박 | Footwork, Acceleration, PerimeterDefense | 0.6 | 1.6 / 1 | 0.45 | 0 / 0 | 0 |
| CloseOut / 클로즈아웃 | Speed, Deceleration, ShotContest | 0.8 | 3.8 / 4 | 0.9 | -4 / 0 | 0 |
| CutOffDrivingLane / 돌파 경로 차단 | PerimeterDefense, Anticipation, DefensiveAwareness | 0.7 | 2.7 / 3 | 0.7 | 0 / 0 | 0 |
| ShadeLeft / 왼쪽 차단 | PerimeterDefense, Anticipation, LateralQuickness | 0.65 | 1.8 / 1 | 0.5 | 1 / 0 | 0 |
| ShadeRight / 오른쪽 차단 | PerimeterDefense, Anticipation, LateralQuickness | 0.65 | 1.8 / 1 | 0.5 | 1 / 0 | 0 |
| AnticipateDirection / 방향 예측 | Anticipation, DecisionMaking, Reaction | 0.6 | 1.1 / 0 | 0.4 | 2 / 0 | 0 |
| StealAttempt / 스틸 시도 | Steal, Reaction, DefensiveAwareness | 0.55 | 2.8 / 3 | 0.18 | -3 / 0 | 0 |
| ReachIn / 리치인 | Steal, Anticipation, Reaction | 0.6 | 2.5 / 2 | 0.25 | -5 / 0 | 0 |
| BodyUp / 바디업 | Strength, PerimeterDefense, Balance | 0.7 | 2.8 / 2 | 0.45 | -1 / 0 | 0 |
| ContestShot / 손 들기 | ShotContest, Reaction, DefensiveAwareness | 0.75 | 1.8 / 1 | 0.16 | 0 / 0 | 0 |
| JumpContest / 점프 컨테스트 | ShotContest, Vertical, Reaction | 0.8 | 3.3 / 5 | 0.12 | -5 / 0 | 0 |
| BlockAttempt / 블록 시도 | Block, Vertical, Reaction | 0.85 | 4 / 7 | 0.16 | -7 / 0 | 0 |
| RecoverBalance / 균형 회복 | Balance, Endurance, BodyControl | 0.7 | 0 / 0 | 0 | 14 / 6 | 0 |
| Rebound / 리바운드 | Vertical, Strength, Anticipation | 0.75 | 3 / 4 | 0.8 | -2 / 0 | 0 |
| RecoverBall / 루즈볼 회수 | BallControl, Reaction, Agility | 0.65 | 2.5 / 3 | 0.8 | -2 / 0 | 0 |

## 행동 설명과 대응 속성

### 걷기 (Walk)

라이브 드리블 이동은 1회 차감. 개더 후에는 한 스텝만 허용

- 역할/분류: both / movement
- 기본 전제조건: 양측 공통; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: Strength, Footwork
- 난도: 0.200, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 스프린트 (Sprint)

공 소유 시 드리블 1회로 빠르게 이동. 공을 잡은 뒤에는 불가

- 역할/분류: both / movement
- 기본 전제조건: 양측 공통; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: Strength, Footwork
- 난도: 0.644, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 정지 (Stop)

감속하고 자세 회복

- 역할/분류: both / movement
- 기본 전제조건: 양측 공통; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: Strength, Footwork
- 난도: 0.200, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 위치 유지 (HoldPosition)

낮은 자세로 선택한 간격 유지

- 역할/분류: defense / defense
- 기본 전제조건: 수비 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: BallControl, DribbleProtection, Agility, Composure
- 난도: 0.200, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 왼쪽 슬라이드 (DefensiveSlideLeft)

왼쪽으로 측면 이동

- 역할/분류: defense / defense
- 기본 전제조건: 수비 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: BallControl, DribbleProtection, Agility, Composure
- 난도: 0.311, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 오른쪽 슬라이드 (DefensiveSlideRight)

오른쪽으로 측면 이동

- 역할/분류: defense / defense
- 기본 전제조건: 수비 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: BallControl, DribbleProtection, Agility, Composure
- 난도: 0.311, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 수비 후퇴 (RetreatStep)

골대 쪽으로 후퇴하며 공간 유지

- 역할/분류: defense / defense
- 기본 전제조건: 수비 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: BallControl, DribbleProtection, Agility, Composure
- 난도: 0.256, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 전진 압박 (ForwardStep)

공격자 쪽으로 접근

- 역할/분류: defense / defense
- 기본 전제조건: 수비 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: BallControl, DribbleProtection, Agility, Composure
- 난도: 0.256, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 클로즈아웃 (CloseOut)

슛 거리를 빠르게 좁히기

- 역할/분류: defense / defense
- 기본 전제조건: 수비 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: BallControl, DribbleProtection, Agility, Composure
- 난도: 0.422, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 돌파 경로 차단 (CutOffDrivingLane)

예상 경로를 선점해 진행 제한

- 역할/분류: defense / defense
- 기본 전제조건: 수비 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: BallControl, DribbleProtection, Agility, Composure
- 난도: 0.367, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 왼쪽 차단 (ShadeLeft)

공격자의 왼쪽 진입 차단

- 역할/분류: defense / defense
- 기본 전제조건: 수비 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: BallControl, DribbleProtection, Agility, Composure
- 난도: 0.256, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 오른쪽 차단 (ShadeRight)

공격자의 오른쪽 진입 차단

- 역할/분류: defense / defense
- 기본 전제조건: 수비 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: BallControl, DribbleProtection, Agility, Composure
- 난도: 0.256, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 방향 예측 (AnticipateDirection)

정한 방향에 준비. 반대쪽 공격에 취약

- 역할/분류: defense / defense
- 기본 전제조건: 수비 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: BallControl, DribbleProtection, Agility, Composure
- 난도: 0.200, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 스틸 시도 (StealAttempt)

공 노출과 손 위치를 이용한 탈취

- 역할/분류: defense / defense
- 기본 전제조건: 수비 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: BallControl, DribbleProtection, Agility, Composure
- 난도: 0.367, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 리치인 (ReachIn)

넓은 도달 거리, 증가한 파울 위험

- 역할/분류: defense / defense
- 기본 전제조건: 수비 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: BallControl, DribbleProtection, Agility, Composure
- 난도: 0.311, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 바디업 (BodyUp)

몸으로 경로 차단. 늦은 접촉은 파울

- 역할/분류: defense / defense
- 기본 전제조건: 수비 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: BallControl, DribbleProtection, Agility, Composure
- 난도: 0.311, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 손 들기 (ContestShot)

점프 없이 슛 궤적 견제

- 역할/분류: defense / defense
- 기본 전제조건: 수비 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: BallControl, DribbleProtection, Agility, Composure
- 난도: 0.256, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 점프 컨테스트 (JumpContest)

릴리스 타이밍에 점프해 견제

- 역할/분류: defense / defense
- 기본 전제조건: 수비 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: BallControl, DribbleProtection, Agility, Composure
- 난도: 0.478, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 블록 시도 (BlockAttempt)

타이밍과 도달 거리가 맞으면 블록

- 역할/분류: defense / defense
- 기본 전제조건: 수비 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: BallControl, DribbleProtection, Agility, Composure
- 난도: 0.589, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 균형 회복 (RecoverBalance)

정지해 균형·스태미너·순간 에너지 회복

- 역할/분류: both / recovery
- 기본 전제조건: 양측 공통; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: Strength, Footwork
- 난도: 0.200, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 리바운드 (Rebound)

실패한 슛의 낙하 지점으로 이동

- 역할/분류: both / ball
- 기본 전제조건: 양측 공통; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: Strength, Footwork
- 난도: 0.422, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 루즈볼 회수 (RecoverBall)

느슨해진 공에 먼저 접근

- 역할/분류: both / ball
- 기본 전제조건: 양측 공통; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: Strength, Footwork
- 난도: 0.367, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조
