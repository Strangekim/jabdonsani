# 능력치 시스템

첨부 명세의 목록은 실제로 **30개**다. 모든 능력치는 0~100이며 기본 선수는 65다. 준비 화면의 프리셋은 같은 스키마의 초기값만 바꾼다. 프리셋 자체의 판정 보정은 없다.

## 계산 경로

`formulas.ts`의 식과 `engine.ts`의 틱 갱신이 실행 경로다. 행동에 지정한 primaryAttributes의 평균은 행동 시간과 기술 효율에도 사용한다. 단순히 사용 목록에 이름을 적는 것으로 사용 여부를 판단하지 않고, 자동 테스트는 실제 수식/상태 변화를 비교한다.

| 능력치 | 실제 적용 대상 |
|---|---|
| Speed | 공통 이동 최고속도 및 스프린트/스피드 드리블 |
| Acceleration | 목표속도 도달 가속, 헤지테이션/전진 효율 |
| Agility | 방향 전환, 드리블/측면 이동 효율 |
| Deceleration | 감속, 정지·풀업·후퇴 효율 |
| Footwork | 피벗/개더/스텝백, 슛 창출 및 해당 행동 시간 |
| BallHandling | 드리블 제어 점수 및 기술 효율 |
| BallControl | 드리블 제어, 스틸 저항, 루즈볼 회수 |
| DribbleSpeed | 드리블 중 최고속도와 기술 시간 |
| DribbleProtection | 드리블 제어, 공 노출·스틸 저항 |
| CloseShot | 근거리 점퍼와 플로터 능력 |
| MidRangeShot | 아크 안 점퍼 능력 |
| LongRangeShot | 아크 밖 점퍼 능력 |
| Layup | 레이업/리버스 및 플로터 능력 |
| Dunk | 덩크 실행 능력 |
| ShotCreation | 이동 슛/스텝백 정확도, 페이크, 블록 회피 |
| PerimeterDefense | 근접 압박, 차단 영역 및 기술 대응 |
| LateralQuickness | 수비 이동속도와 측면 방향 대응 |
| Steal | 스틸 경합 점수 |
| Block | 블록 경합 점수 |
| ShotContest | 슛 압박 강도 |
| DefensiveAwareness | 반응 지연, 스틸·페이크 대응 |
| Reaction | 반응 지연, 스틸·블록·루즈볼 대응 |
| Strength | 접촉·몸싸움, 덩크, 리바운드 |
| Balance | 균형 회복 속도, 슛 및 급격한 방향 전환 |
| Vertical | 덩크·블록 점프 도달, 리바운드 |
| Endurance | 모든 행동의 자원 소모 효율, 회복 행동 |
| BodyControl | 균형 회복, 공 제어, 이동 슛 안정 및 블록 회피 |
| Composure | 드리블/스틸 저항/슛 및 페이크 |
| Anticipation | 경로 예측, 드리블 압박, 리바운드 |
| DecisionMaking | 페이크 경합과 AI의 공개 관찰 기반 선택 품질 |

## 동적 상태와 구분

Balance는 고정 능력치이고 bodyBalance는 현재 자세다. Endurance는 효율 능력치이고 stamina는 남은 체력이다. Vertical은 점프 능력이고 burstEnergy는 순간 자원이다. fatigue는 누적 피로이며 포제션 전환으로 완전히 사라지지 않는다.

자원 감소는 연속적인 곱셈 감쇠를 사용해 0/1의 갑작스러운 성능 절벽을 피한다. 확률 상한/하한은 극단에서 0%·100% 확정을 방지하기 위한 모델 제한이며 선수별 고정 보너스가 아니다.
