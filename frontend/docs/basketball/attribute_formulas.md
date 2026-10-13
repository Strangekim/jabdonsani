# 능력치 및 확률 계산식

구현 진실의 원천은 `src/lib/basketball/formulas.ts`와 `engine.ts`다. 아래에서 속성 이름은 0~100 고정 능력치, stamina/burst/fatigue/balance는 현재 0~100 상태다. 모든 거리 단위는 m이다.

`clamp(x,a,b) = min(b,max(a,x))`, `sigmoid(x) = 1/(1+exp(-x))`. 확률 함수 자체는 순수하며 난수를 소비하지 않는다. 엔진이 계산한 확률에 시드 PRNG 표본을 비교한다.

## 공통 성능과 행동

- F = (0.58 + 0.42 × stamina/100) × (1 − 0.23 × fatigue/100) × (0.78 + 0.22 × burst/100)
- 행동 효율 E = 1.35 − 0.0045 × Endurance − 0.002 × primaryAttributes 평균
- 행동 시간 = Σ[기본 duration × (1.18 − 주능력 평균/300) × (1.12 − 0.12F)] + 기존 recoveryTime
- 최고속도 = (2.4 + 0.044Speed) × F × (0.65 + 0.35balance/100) × 행동 이동 배율
- 수비 이동은 위 속도에 (0.62 + 0.38LateralQuickness/100), 드리블은 (0.65 + 0.35DribbleSpeed/100)을 곱한다.
- 균형 회복속도 = (3 + 0.07Balance + 0.035BodyControl) × F
- 반응 지연 = (0.43 − 0.0022Reaction − 0.001DefensiveAwareness) × (1.35 − 0.35F) + (100 − balance)/550

## 드리블 제어

pressure = clamp((2.1 − 선수 사이 거리)/2.1, 0, 1)

control = clamp[(0.34BallHandling + 0.23BallControl + 0.13DribbleProtection + 0.13BodyControl + 0.08Composure + 0.09balance) × F + 행동 ballControlModifier − pressure × (0.08상대 PerimeterDefense + 0.04상대 Anticipation) − 행동 difficulty × 5, 0, 100]

기술별 기본 난도, 보호, 이동 및 균형 비용이 다르다. 난수로 돌파 성공을 직접 정하지 않는다. 제어 불안정에 난수를 적용하고, 돌파 우위는 갱신된 위치와 수비 차단 영역으로 결정한다.

## 스틸

- 공격 보호 점수 A = 0.38BallControl + 0.34DribbleProtection + 0.16Composure + 0.12현재 공 제어
- 수비 경합 점수 D = (0.55Steal + 0.23Reaction + 0.22DefensiveAwareness) × 수비 F
- P(steal) = clamp[sigmoid((D − A × 공격 F + exposure − 20)/17) × clamp((1.95 − gap)/1.4) × (0.55 + 0.45수비 balance/100), 0, 0.82]

공 노출은 선택 행동·손·공 보호 상태에서 정한다. 도달할 수 없는 거리에서는 스틸 확률이 0이다. 스틸과 별도로 리치/접촉 파울 조건을 평가한다.

## 슛

일반 슈팅 능력은 거리 <2.5m이면 CloseShot, 아크 안이면 MidRangeShot, 밖이면 LongRangeShot이다.

- 덩크 능력: 0.70Dunk + 0.18Vertical + 0.12Strength
- 레이업/리버스: 0.72Layup + 0.28BodyControl
- 플로터: 0.50CloseShot + 0.30Layup + 0.20ShotCreation
- 창출: 스텝백/풀업은 0.22ShotCreation + 0.10Footwork, 나머지는 0.12ShotCreation
- 이동 패널티: 현재속력 × 슛별 계수 × (1 − BodyControl/150). 레이업/덩크/리버스 0.65, 풀업 1.5, 나머지 3.5
- 거리 패널티: 덩크 2d, 레이업/리버스 3.5d, 플로터 3d, 점퍼 3.1 × max(0,d−1.5)
- 실행점수 X = (0.85슈팅능력 + 창출 + 0.10Composure + 0.06Balance) × F + 0.13현재 balance − 이동 패널티 − 거리 패널티 − 슛 각도패널티 − 12 × |releaseTiming|
- P(make) = clamp[sigmoid((X − 48 − 42 × contestStrength)/19), 0.025, 0.97]

## 컨테스트와 블록

컨테스트는 수비와의 거리, 슈터-골대-수비 방향, 접근속도, 반응 지연, 릴리스 타이밍, ShotContest, 현재 균형과 F를 곱한다. 수비가 아무 대응도 하지 않아도 기본 강도 0.25를 적용한다. ContestShot/JumpContest/BlockAttempt의 적극 강도는 각각 0.78/1.15/1.05다. 점프 도달 거리는 Vertical에 따라 증가한다.

블록 경합 점수:
- A = 0.38공격 ShotCreation + 0.27BodyControl + 0.20Composure + 0.15Vertical
- D = (0.58수비 Block + 0.25Vertical + 0.17Reaction) × 수비 F
- P(block) = sigmoid((D − A − 19)/19) × 도달계수 × 타이밍 × 균형계수 × 행동계수 × 리버스계수 × 림각도계수, 최대 0.72

JumpContest는 블록 행동계수 0.55, BlockAttempt는 1.0이다. ReverseLayup는 블록 노출계수 0.62다. 실제 판정에는 동일 틱의 위치와 상태를 사용한다.

## 페이크

fakeAdvantage = 공격 주능력 평균 × 공격 F + 0.20공격 DecisionMaking − (0.35수비 Anticipation + 0.30Reaction + 0.20DefensiveAwareness + 0.15DecisionMaking) × 수비 F

이 차이는 수비 반응·커밋·균형에 작용한다. 슛 확률에 근거 없는 난도 보너스를 직접 더하지 않는다.

## 검증 해석

단일 능력치 증가가 **모든 시드의 모든 득점을 단조 증가**시키지는 않는다. 난수 소비 경로와 이후 상대 행동이 달라질 수 있다. 동일 상황의 확률/물리 함수와 같은 시드 표본에서 기대 성능을 비교한다. 구현의 구체적인 접촉·회수·자원 틱 식은 해당 도메인 문서에 기록한다.

## 제어 상실, 페이크 후 상태, 접촉

- 약한 손 추가 위험 = (100−BallHandling)/900 (주손이면0)
- P(드리블 제어 상실) = clamp((75−현재 공제어)/650 + 약한손 위험 + max(0,30−현재균형)/450,0.002,0.32)
- 스틸이 성공했을 때 클린 확보 확률 = clamp(0.35+0.003수비 BallControl+0.002Reaction+0.001Steal−0.09gap,0.25,0.92). 확보 실패면 쳐낸 루즈볼로 이어진다.
- 페이크 균형 페널티 = clamp(fakeAdvantage/8 + 잘못된방향이면9 + 슛페이크에점프했으면14,0,24). 수비 반응 지연에는 페널티/100초를 더하고, 회복시간은 점프시0.55초 또는 페널티/100초까지 늘린다.
- 접촉 수비점수 D = (0.50PerimeterDefense+0.28Strength+0.22현재균형)×F
- 접촉 공격점수 A = (0.36Strength+0.29BodyControl+0.20Footwork+0.15현재균형)×F
- 방향예측 보정 P = 예측방향·공격진행방향 × Anticipation/100 ×0.18
- 경로 저항 R = clamp(0.5+(D−A)/140+P,0.15,0.9)
- 접촉 반경0.72m의 겹침을 공격 R, 수비1−R 비율로 분리하고 공격속도를(1−0.7R)배로 감쇠
- 접촉 균형 손실: 공격3R×(1−Balance/200), 수비2×(1−R)

차징은 공격속력>3.2m/s, 수비속력<0.6m/s, D>A+10인 선점 접촉에서 발생한다. 돌파 우위는 수비 위치가 공격자 기준 골대방향 투영으로−0.35m 뒤에 있고 공격자가 해당 행동 시작보다 골대에0.4m 이상 가까워졌을 때 기록한다.

## 파울 확률

범위 조건에 해당하지 않으면0이다.

- 근접 바디업: clamp((200−PerimeterDefense−BodyControl)/900 + 수비속력/80,0.015,0.23)
- 스틸/리치인, gap<1.8m: clamp((300−Steal−BodyControl−DecisionMaking)/1500 + 리치인이면0.035,0.008,0.24)
- 슈팅, gap<1.4m이고 적극 접촉 행동: clamp((200−ShotContest−BodyControl)/1300 + 수비속력/100,0.012,0.20)

## 공 회수 및 낙하 위치

- 리바운드 기술점수 =0.34Vertical+0.24Strength+0.22Anticipation+0.20BodyControl
- 루즈볼 기술점수 =0.38BallControl+0.28Reaction+0.20Agility+0.14DecisionMaking
- 회수 점수 = 기술점수×F +0.15현재균형 −30×공까지거리 + 적극회수명령이면20 + BodyUp이면8
- P(공격자 확보)=sigmoid((공격회수점수−수비회수점수)/15). 난수 경합 기준을 역할로 정해 선수 ID 자체의 보너스를 피한다.
- 원공격자 확보 후 공제어 =clamp(0.7BallControl+30,0,100)
- 제어 실패 루즈볼 좌표: 선수좌표에 각 축(U−0.5)×1.5m를 더하고 코트 안으로 제한
- 실패 슛 낙하지점: 일반은 골대, 블록은 슈터 위치를 중심으로 각도2πU; 반경(블록이면1,그외1.2)+U×(외곽이면2.5,그외1.3)m

U는 독립적으로 소비한 시드 PRNG 표본이다. 초기 정수 시드를 avalanche 혼합한 뒤 xorshift32를 사용해 작은 연속 시드의 첫 표본 상관을 줄인다. 미래 PRNG 상태는 관찰에 포함하지 않는다.
