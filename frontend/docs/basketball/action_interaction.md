# 공격·수비 상호작용 사례

아래는 같은 틱에서 계산되는 전략적 관계다. 표의 결과는 **조건에 따른 경향**이며 확정 승리나 고정 성공률이 아니다. 실제 확률과 위치는 이벤트 데이터로 확인한다. 방향은 화면의 좌우/골대 방향을 기준으로 한다.

| # | 공격 선택 | 수비 선택 | 공간·능력치·상태 상호작용 |
|---|---|---|---|
| 1 | 오른쪽 Crossover | 같은 방향 DefensiveSlideRight | BallHandling/Agility와 LateralQuickness/Reaction, 현재 균형에 따라 양측 방향 전환; 먼저 차단 영역을 점유한 수비가 진행을 제한 |
| 2 | 왼쪽 Crossover | ShadeRight | 잘못된 방향 예측으로 열린 경로가 생길 수 있으나 기존 수비 위치가 경로를 막고 있으면 돌파를 보장하지 않음 |
| 3 | SpeedDribble | RetreatStep | 공격 가속과 수비 후퇴가 함께 진행; 공간을 내주면서 골대 경로를 유지하는 선택 |
| 4 | ProtectedDribble | StealAttempt | 낮은 공 노출과 DribbleProtection/BallControl이 Steal/Reaction에 대응; 수비는 도박과 에너지 비용을 부담 |
| 5 | BehindTheBack | ReachIn | 보호 효과와 기술 난도, 약한 손/공 제어, 수비 도달 거리 및 파울 위험을 함께 평가 |
| 6 | BetweenTheLegs | HoldPosition | 공격이 방향을 바꾸더라도 수비 선점 영역은 유지; 기술 자체에 자동 돌파 보너스 없음 |
| 7 | Hesitation | CloseOut | 접근하는 수비의 관성과 반응 지연을 이용할 여지; 가까워지면 기본 압박 증가 |
| 8 | InAndOut | AnticipateDirection | 예측 방향과 실제 진행 방향, Anticipation과 기술 숙련도가 반응 및 균형에 반영 |
| 9 | SpinMove | BodyUp | 회전 난도·Strength·BodyControl·Balance와 수비 접촉이 함께 작용; 파울/공 노출 위험 존재 |
| 10 | RetreatDribble | ForwardStep | 뒤로 물러나는 공격과 압박하는 수비를 공통 이동식으로 처리; 코트 경계도 적용 |
| 11 | Sprint | CutOffDrivingLane | 공격자가 이미 확보한 통로와 수비 차단 선점 비교; 수비를 관통하는 순간이동 없음 |
| 12 | Stop | StealAttempt | 공격 감속도와 균형 회복, 공의 상태/손, 수비 거리로 스틸 가능성 계산 |
| 13 | ProtectBall | ReachIn | 공 보호는 제어 안정성을 높이지만 슛클록은 흐름; 무리한 리치인은 파울 위험 |
| 14 | JabStep | ShadeLeft | 피벗 발을 유지한 잽은 드리블 비용 0; 예측 방향과 균형의 상호작용 |
| 15 | Pivot | BodyUp | 발 고정과 피벗 반경 안에서 몸 방향을 조정; 제한을 넘는 이동은 허용하지 않음 |
| 16 | StepBack | CloseOut | Footwork/Agility 기반 거리 생성에 수비 접근속도·반응·측면 속도가 대응 |
| 17 | SideStep | DefensiveSlideLeft | 양측 방향 변화와 감속/가속을 평가; 수비가 같은 슈팅 라인을 유지할 수 있음 |
| 18 | PumpFake | JumpContest | 수비의 점프 커밋·반응·균형과 공격 ShotCreation/Composure를 평가; 페이크 후에도 시간은 소모 |
| 19 | Gather | StealAttempt | 공을 잡아 드리블 종료; 공 보호/수비 거리와 리치 판정. 재드리블은 잔여 횟수와 무관하게 불가 |
| 20 | StandingShot | HoldPosition | 별도 컨테스트 명령이 없어도 근거리 수비 압박 적용; 거리별 슛 능력과 균형 반영 |
| 21 | PullUpJumper | ContestShot | 릴리스 전 이동속도와 슛 창출 능력, 수비 접근속도·거리·컨테스트가 정확도에 반영 |
| 22 | StepBackShot | BlockAttempt | 실제 이동 이후의 거리·릴리스 시점과 수비 점프 도달/타이밍이 블록 및 슛 확률에 작용 |
| 23 | Floater | BlockAttempt | 가까운 거리에서 릴리스 종류·Layup/CloseShot 계열 능력과 수비 Block/Vertical/Reaction을 비교 |
| 24 | Layup | BodyUp | 마무리 능력·BodyControl·Strength·공간이 접촉·슈팅 파울과 마무리 정확도에 영향 |
| 25 | ReverseLayup | JumpContest | 골대 각도와 진입 위치, 릴리스 종류 및 수비 타이밍을 함께 평가 |
| 26 | Dunk | BlockAttempt | Dunk/Vertical/Strength와 수비 Block/Vertical, 체력·위치·타이밍이 경쟁 |
| 27 | RecoverBall | RecoverBall | 루즈볼 좌표까지 양측 거리와 능력·상태를 비교. 원공격자 회복이면 드리블 횟수 유지 |
| 28 | Rebound | Rebound | 낙하지점·거리·점프·힘·예측·균형 경쟁. 수비 확보일 때 새 포제션 |
| 29 | 3회 소진 후 PumpFake | RecoverBalance | 공격은 더 드리블할 수 없고 수비는 균형 회복; 슛클록이 전략적 비용 |
| 30 | 복합 Crossover + BehindTheBack | CutOffDrivingLane | 각 드리블 단위를 누적 계산; 3회 초과 명령은 양측 시뮬레이션 전 거부 |

관련 실행 경로: `engine.ts`, `formulas.ts`, `actions.ts`. 구체적인 기본값은 행동 문서와 수식 문서를 함께 참조한다.
