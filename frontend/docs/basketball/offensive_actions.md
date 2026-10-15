# 공격 및 공통 행동

아래 기본값은 actions.ts에서 추출했다. 실제 시간은 주능력 평균/피로/회복, 소모량은 Endurance/기술 효율, 판정은 상대/거리/현재 상태에 따라 달라진다. 표의 시간은 내부 시뮬레이션의 행동 시간이며 한 쌍의 선택은 완결된 이벤트 턴으로 해석한다. Walk/Sprint는 공격의 라이브 드리블 상태일 때 조건부로 1단위를 소비하며 아래 기본 비용 0을 덮어쓴다.

## 행동별 계산 입력

| ID / 이름 | 주능력 | 기본 시간(s) | 체력 / 순간자원 | 이동배율 | 균형 / 제어 | 기본 드리블 비용 |
|---|---|---:|---:|---:|---:|---:|
| NormalDribble / 일반 드리블 | BallHandling, BallControl, DribbleSpeed | 0.7 | 2.1 / 1 | 0.64 | 0 / 0 | 1 |
| SpeedDribble / 스피드 드리블 | DribbleSpeed, Speed, BallHandling | 0.8 | 4.5 / 7 | 1 | -5 / -10 | 1 |
| ProtectedDribble / 보호 드리블 | DribbleProtection, BallControl, Strength | 0.8 | 2.3 / 1 | 0.42 | 2 / 16 | 1 |
| Crossover / 크로스오버 | BallHandling, Agility, DribbleSpeed | 0.75 | 3.4 / 4 | 0.74 | -4 / -3 | 1 |
| BetweenTheLegs / 비트윈 더 레그 | BallHandling, BallControl, Agility | 0.8 | 3.1 / 3 | 0.62 | -2 / 7 | 1 |
| BehindTheBack / 비하인드 백 | BallHandling, DribbleProtection, BodyControl | 0.85 | 3.5 / 4 | 0.67 | -4 / 10 | 1 |
| Hesitation / 헤지테이션 | BallHandling, Acceleration, Composure | 0.9 | 2.9 / 4 | 0.62 | -1 / 3 | 1 |
| InAndOut / 인앤아웃 | BallHandling, Agility, ShotCreation | 0.8 | 3.1 / 4 | 0.7 | -3 / 1 | 1 |
| SpinMove / 스핀 무브 | BallHandling, BodyControl, Footwork | 1 | 4.5 / 6 | 0.68 | -9 / 5 | 1 |
| RetreatDribble / 후퇴 드리블 | BallControl, Deceleration, Footwork | 0.8 | 2.7 / 2 | 0.55 | 2 / 8 | 1 |
| Walk / 걷기 | Speed, Footwork | 0.65 | 0.7 / 0 | 0.35 | 2 / 0 | 0 |
| Sprint / 스프린트 | Speed, Acceleration, Endurance | 0.75 | 5 / 8 | 1 | -6 / -9 | 0 |
| Stop / 정지 | Deceleration, Balance | 0.5 | 0.5 / 0 | 0 | 6 / 3 | 0 |
| ProtectBall / 볼 보호 | DribbleProtection, Strength, Composure | 0.65 | 0.9 / 0 | 0 | 3 / 20 | 0 |
| JabStep / 잽 스텝 | Footwork, ShotCreation, Agility | 0.55 | 1.2 / 1 | 0 | 0 / 3 | 0 |
| Pivot / 피벗 | Footwork, BodyControl, Balance | 0.55 | 0.9 / 0 | 0 | 4 / 8 | 0 |
| StepBack / 스텝백 | Footwork, Agility, ShotCreation | 0.65 | 2.7 / 3 | 0.48 | -5 / -1 | 0 |
| SideStep / 사이드 스텝 | Footwork, Agility, Balance | 0.6 | 2.2 / 3 | 0.45 | -3 / 0 | 0 |
| PumpFake / 슛 페이크 | ShotCreation, Composure, BodyControl | 0.55 | 1 / 0 | 0 | 1 / 3 | 0 |
| Gather / 개더 | BallControl, Footwork, BodyControl | 0.4 | 0.5 / 0 | 0 | 4 / 8 | 0 |
| Layup / 레이업 | Layup, BodyControl, CloseShot | 0.8 | 3.5 / 4 | 0.42 | -2 / 0 | 0 |
| Floater / 플로터 | CloseShot, Layup, ShotCreation | 0.75 | 2.7 / 3 | 0.15 | -1 / 0 | 0 |
| JumpShot / 점프슛 | MidRangeShot, ShotCreation, Composure | 0.75 | 2.7 / 3 | 0 | 0 / 0 | 0 |
| Dunk / 덩크 | Dunk, Vertical, Strength | 0.85 | 5 / 8 | 0.4 | -4 / 0 | 0 |
| StandingShot / 스탠딩 슛 | MidRangeShot, Composure, Balance | 0.8 | 2.4 / 2 | 0 | 1 / 0 | 0 |
| PullUpJumper / 풀업 점퍼 | MidRangeShot, ShotCreation, Deceleration | 0.7 | 3.3 / 4 | 0.1 | -3 / 0 | 0 |
| StepBackShot / 스텝백 슛 | Footwork, ShotCreation, Agility | 0.9 | 4 / 5 | 0.4 | -5 / 0 | 0 |
| ReverseLayup / 리버스 레이업 | Layup, BodyControl, Footwork | 0.95 | 4 / 5 | 0.35 | -4 / 0 | 0 |
| RecoverBalance / 균형 회복 | Balance, Endurance, BodyControl | 0.7 | 0 / 0 | 0 | 14 / 6 | 0 |
| Rebound / 리바운드 | Vertical, Strength, Anticipation | 0.75 | 3 / 4 | 0.8 | -2 / 0 | 0 |
| RecoverBall / 루즈볼 회수 | BallControl, Reaction, Agility | 0.65 | 2.5 / 3 | 0.8 | -2 / 0 | 0 |

## 행동 설명과 대응 속성

### 일반 드리블 (NormalDribble)

방향을 정해 한 단위 전진

- 역할/분류: offense / dribble
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: PerimeterDefense, LateralQuickness, Reaction, Anticipation
- 난도: 0.256, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 스피드 드리블 (SpeedDribble)

공을 노출하며 빠르게 전진

- 역할/분류: offense / dribble
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: PerimeterDefense, LateralQuickness, Reaction, Anticipation
- 난도: 0.589, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 보호 드리블 (ProtectedDribble)

몸으로 공을 가리고 천천히 이동

- 역할/분류: offense / dribble
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: PerimeterDefense, LateralQuickness, Reaction, Anticipation
- 난도: 0.256, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 크로스오버 (Crossover)

손과 진행 방향을 바꾸는 돌파

- 역할/분류: offense / dribble
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: PerimeterDefense, LateralQuickness, Reaction, Anticipation
- 난도: 0.422, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 비트윈 더 레그 (BetweenTheLegs)

다리 사이에서 공을 보호하며 전환

- 역할/분류: offense / dribble
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: PerimeterDefense, LateralQuickness, Reaction, Anticipation
- 난도: 0.367, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 비하인드 백 (BehindTheBack)

등 뒤로 손을 바꿔 리치인 회피

- 역할/분류: offense / dribble
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: PerimeterDefense, LateralQuickness, Reaction, Anticipation
- 난도: 0.422, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 헤지테이션 (Hesitation)

감속 후 가속으로 수비의 예측 교란

- 역할/분류: offense / dribble
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: PerimeterDefense, LateralQuickness, Reaction, Anticipation
- 난도: 0.422, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 인앤아웃 (InAndOut)

손을 유지하고 반대쪽 페이크

- 역할/분류: offense / dribble
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: PerimeterDefense, LateralQuickness, Reaction, Anticipation
- 난도: 0.422, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 스핀 무브 (SpinMove)

몸을 회전해 공을 숨기는 고난도 동작

- 역할/분류: offense / dribble
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: PerimeterDefense, LateralQuickness, Reaction, Anticipation
- 난도: 0.533, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 후퇴 드리블 (RetreatDribble)

압박에서 벗어나 간격 확보

- 역할/분류: offense / dribble
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: PerimeterDefense, LateralQuickness, Reaction, Anticipation
- 난도: 0.311, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

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

### 볼 보호 (ProtectBall)

공을 잡아 보호. 드리블 재시작 불가

- 역할/분류: offense / footwork
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: Strength, Footwork
- 난도: 0.200, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 잽 스텝 (JabStep)

피벗 발을 유지하고 수비의 방향 예측 시험

- 역할/분류: offense / footwork
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: Strength, Footwork
- 난도: 0.256, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 피벗 (Pivot)

고정된 피벗 발 주위로 몸 방향 전환

- 역할/분류: offense / footwork
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: Strength, Footwork
- 난도: 0.200, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 스텝백 (StepBack)

라이브 드리블을 종료하고 개더 한 스텝 후퇴

- 역할/분류: offense / footwork
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: Strength, Footwork
- 난도: 0.367, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 사이드 스텝 (SideStep)

개더 한 스텝으로 옆 공간 확보

- 역할/분류: offense / footwork
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: Strength, Footwork
- 난도: 0.367, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 슛 페이크 (PumpFake)

공을 잡아 슛 동작을 보여 수비 점프 유도

- 역할/분류: offense / footwork
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: Strength, Footwork
- 난도: 0.200, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 개더 (Gather)

드리블 종료. 이후 최대 두 스텝 허용

- 역할/분류: offense / footwork
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: Strength, Footwork
- 난도: 0.200, 회복 시간 0.12s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 레이업 (Layup)

골대 3.4m 이내의 러닝 마무리

- 역할/분류: offense / shot
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: ShotContest, Block, Reaction, Vertical
- 난도: 0.422, 회복 시간 0.25s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 플로터 (Floater)

골대 5m 이내에서 높게 띄우기

- 역할/분류: offense / shot
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: ShotContest, Block, Reaction, Vertical
- 난도: 0.367, 회복 시간 0.25s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 점프슛 (JumpShot)

거리별 슈팅 능력치를 적용

- 역할/분류: offense / shot
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: ShotContest, Block, Reaction, Vertical
- 난도: 0.367, 회복 시간 0.25s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 덩크 (Dunk)

골대 2.4m 이내 파워 마무리

- 역할/분류: offense / shot
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: ShotContest, Block, Reaction, Vertical
- 난도: 0.644, 회복 시간 0.25s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 스탠딩 슛 (StandingShot)

안정된 정지 자세에서 슛

- 역할/분류: offense / shot
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: ShotContest, Block, Reaction, Vertical
- 난도: 0.311, 회복 시간 0.25s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 풀업 점퍼 (PullUpJumper)

이동 속도를 줄이며 빠른 릴리스

- 역할/분류: offense / shot
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: ShotContest, Block, Reaction, Vertical
- 난도: 0.422, 회복 시간 0.25s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 스텝백 슛 (StepBackShot)

개더 한 스텝으로 물러나며 릴리스

- 역할/분류: offense / shot
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: ShotContest, Block, Reaction, Vertical
- 난도: 0.478, 회복 시간 0.25s
- 계산 경로: 주능력 평균→시간/효율, 이동배율→공통 가속/방향 전환, 균형/제어 보정→틱 상태. 사용자 입력은 이벤트 턴 경계에서만 받는다. 슛/드리블/접촉 경쟁식은 attribute_formulas.md 및 engine.ts 참조

### 리버스 레이업 (ReverseLayup)

골대 3m 이내 반대쪽 림으로 마무리

- 역할/분류: offense / shot
- 기본 전제조건: 공 소유, 공격 역할; 거리/공 상태/드리블 종료/개더 스텝/강제 공 잡기 상태는 validator가 추가 검사
- 보조 능력: Balance, Endurance, BodyControl
- 대응 능력: ShotContest, Block, Reaction, Vertical
- 난도: 0.478, 회복 시간 0.25s
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
