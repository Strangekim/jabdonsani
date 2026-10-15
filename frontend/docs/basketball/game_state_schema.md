# 상태 스키마와 이벤트

권위 있는 TypeScript 정의는 `src/lib/basketball/types.ts`다.

## GameState

| 필드 | 의미 |
|---|---|
| version/config | 상태/리플레이 버전 2와 경기 규칙 |
| seed/rngState | 초기 시드와 현재 PRNG 상태. 관찰에는 숨김 |
| initialPlayers | 재현용 선수 설정 |
| players | 고정 정체성 p1, p2 두 선수. 역할이 바뀌어도 정체성·점수·피로 유지 |
| offenseId/score | 현재 공격 선수와 선수별 점수 |
| time/shotClock | 누적 시뮬레이션 시각과 남은 공격시간 |
| decisionId/decisionReason | 현재 의사결정 식별자와 열린 이유 |
| possession/possessionStartedAt | 포제션 번호와 시작 시간 |
| submissions | 잠긴 비공개 명령. 두 개가 모인 뒤에만 실행 |
| queues | 선수별 비공개 예약 명령 |
| ball | held/dribbling/loose/rebound, 소유자·위치·마지막 터치 |
| ongoingActions | 내부 실행용 필드. 이벤트 턴이 끝나면 남은 동작 없이 비어 있음 |
| situation | 공개된 상황 종류, 0~1 공격 우위, 직전 플레이 결과 |
| operations | 정확한 재현용 제출/예약/취소 입력 기록 |
| events/history | 구조화된 표현 이벤트와 확정된 양측 명령 기록 |
| stats | 누적 경기 계측 |
| status/winner | playing/finished 및 승자 |

## PlayerState

공수 모두 같은 상태 형식을 사용한다. 위치·속도·바라보는 방향·이동 방향, stamina/burstEnergy/fatigue/bodyBalance, ballPossession/ballHand/dribbleState/dribblesUsed/ballControl, footworkState/pivotFoot/pivotPosition/gatheredSteps, actionState/actionProgress/recoveryTime, defensiveStance/defensiveCommitment/reactionDelay, 수비가 뒤처진 정도 beaten, 강제 공 잡기 forcedPickup, fouls와 실제 능력치 30개가 포함된다.

좌표는 미터, 속도는 m/s, 시간은 초다. 자원과 능력치는 0~100 범위에서 관리한다. 체력과 드리블 규칙은 공수 정체성이 아니라 현재 행동/역할에 따라 적용한다.

## PlayerObservation

공개 선수 상태, 공, 점수, 시간, 의사결정, situation, 합법 행동과 자신의 큐·제출 여부만 제공한다. 상대 큐/미공개 명령, seed/rngState, AI 평가 값은 없다. AI 함수는 GameState 대신 이 타입을 입력받는다. 반환 객체는 내부 상태 변경의 통로로 사용하지 않는다.

## GameEvent와 재현

각 이벤트는 id, type, time, decisionId, possession, 선택적 playerId/targetId/actionId, 설명, 좌표 및 수치 데이터를 갖는다. UI는 이를 로그/코트/리플레이로 표현할 수 있다. 확률 이벤트의 data에는 실행 시 계산한 판정 값을 담는다.

ReplayData는 version 2, config, seed, players, 확정된 양측 decisions와 선택적인 operations를 저장한다. operations는 큐/취소/제출 상태까지 정확히 재현하는 권위 엔진용 기록이며 상대에게 보내는 관찰이 아니다. 리플레이는 저장된 결과를 믿어서 상태를 덮어쓰는 방식이 아니라 초기 상태와 명령을 다시 엔진에 넣어 재계산한다. 플레이 중 hotseat 화면의 내보내기는 operations를 제외하고 확정 기록만 저장해 상대의 미공개 명령/큐를 숨긴다. 화면의 표현 이벤트는 최근 600개로 제한하되 명령 기록으로 이전 구간을 다시 생성할 수 있다.

버전 1 명령 기록은 이벤트 턴과 호환되지 않아 명시적으로 거부한다. 강제 공 잡기는 슛만 허용하고, 자발적 개더는 기존 풋워크 규칙을 따른다.
