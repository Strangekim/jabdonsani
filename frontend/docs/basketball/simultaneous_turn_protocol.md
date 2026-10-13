# 동시 명령 프로토콜

## 공개 API

```ts
createGame(config?, seed?, players?): GameState
getObservation(state, playerId, eventLimit?): PlayerObservation
getLegalActions(state, playerId): ActionDefinition[]
validateAction(state, playerId, command): ActionValidation
submitAction(state, playerId, decisionId, command): EngineResult
submitQueuedAction(state, playerId, decisionId?): EngineResult
queueActions(state, playerId, commands): EngineResult
cancelQueue(state, playerId): EngineResult
chooseAIAction(observation, difficulty?): ActionCommand
runAIDecision(state, difficulty?): GameState
exportReplay(state): ReplayData
replayGame(replay): GameState
```

EngineResult는 state와 선택적인 error/code/resolved를 반환한다. 오류가 발생하면 UI는 사유를 표시하고 잘못된 입력으로 경기 시간을 진행하지 않는다.

## 제출과 잠금

1. 현재 decisionId를 포함해 playerId와 명령을 제출한다.
2. 선수/결정점/행동 역할·전제조건·숫자 범위·드리블/풋워크 제한을 검사한다.
3. 유효한 첫 명령만 잠그며, 아직 상대 입력이 없으면 시계·위치·자원·난수를 진행하지 않는다.
4. 두 명령이 모이면 같은 시작 상태에서 행동을 스케줄하고 공통 틱으로 이동·접촉·공 제어·자원·규칙을 함께 해석한다.
5. 결과와 확정 양측 명령을 기록하고 다음 decisionId를 연다.

제출 순서가 실행 우선권이 되지 않는다. 중복·오래된 결정점 제출은 거부한다. 진행률 0.35/0.7의 인터럽트 창, 0.72의 슛 릴리스, 더 짧은 동작 완료와 공 상태 변화에서 경계를 연다. 긴 행동의 runtime은 ongoingActions에 보관하며 ContinueAction으로 나머지를 이어간다. 허용 창 밖에서는 교체할 수 없다. 이전 동작의 recoveryDelay 동안 새 이동·실행·드리블 비용 발생을 지연한다.

## 비공개 정보

PlayerObservation은 상대 미공개 명령·상대 큐·난수 시드/현재 상태·AI 내부 점수를 포함하지 않는다. AI 입력은 관찰 타입으로 제한한다. 인간 명령을 제출한 뒤 AI에 전체 GameState를 넘기지 않는다.

로컬 hotseat는 첫 제출 뒤 입력 폼/예상 경로를 숨기는 인계 화면을 쓴다. 한 기기의 로컬 메모리를 공유하므로 개발자 도구까지 방어하는 보안 기능은 아니다. 미래 서버 연결 시 원본 GameState는 서버가 보유해야 한다.

## 행동 큐

예약은 즉시 실행이 아니다. 예약 시 누적 드리블 비용을 검사하고, 실행 시 현재 상태로 다시 검증한다. 상황 변화로 다음 예약이 불법이면 큐를 취소하고 이유를 남긴다. 사용자에게 큐 취소 컨트롤을 제공한다. 양측이 모두 확정되기 전에는 큐도 혼자 시간을 진행할 수 없다.

## 재현

초기 config/seed/선수와 확정 DecisionRecord 목록이 재현 입력이다. 정확한 큐/취소 상태까지 복원할 때에는 ReplayOperation(제출, 예약, 취소, 첫 예약 제출) 목록도 기록한다. 동일 입력은 동일 상태와 이벤트를 만든다. 시작 전 취소나 거부는 물리 경기 결과를 바꾸지 않는다. 시작한 동작을 인터럽트 창에서 교체하면 이미 소모한 자원은 유지한다. 플레이 중 hotseat의 UI 내보내기는 확정 DecisionRecord만 사용하여 미공개 예약/제출을 파일에 노출하지 않는다. UI에서 임의 상태를 주입하는 방식으로 리플레이를 수행하지 않는다.
