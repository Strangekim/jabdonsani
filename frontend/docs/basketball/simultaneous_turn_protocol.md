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

제출 순서가 실행 우선권이 되지 않는다. 중복·오래된 결정점 제출은 거부한다. **양측의 명령 한 쌍은 하나의 의미 있는 플레이를 끝낸다.** 내부에서는 공통 틱으로 이동·접촉·릴리스를 계산하지만 진행률마다 다시 입력을 요구하지 않는다. 짧은 동작의 종료 뒤에도 상대 동작은 그 상호작용 안에서 해석한다. 슛의 성공·실패, 돌파와 저지, 공 상태나 소유권 변화가 공개된 뒤 다음 선택을 받는다.

다음 턴의 `situation`은 정면 대치(`face_up`), 공격 우위(`advantage`), 드리블 종료(`pickup`), 공간 경합(`contested`), 루즈볼(`loose_ball`), 리바운드(`rebound`)를 구분한다. `lastOutcome`에는 완료된 플레이의 결과가 담긴다. 공격 우위와 수비의 늦은 반응은 다음 플레이에 이어진다. 수비 압박으로 공을 잡은 `forcedPickup` 상태는 일반적인 자발적 개더와 구별되며 공격자가 슛만 선택하도록 제한한다.

## 비공개 정보

PlayerObservation은 상대 미공개 명령·상대 큐·난수 시드/현재 상태·AI 내부 점수를 포함하지 않는다. AI 입력은 관찰 타입으로 제한한다. 인간 명령을 제출한 뒤 AI에 전체 GameState를 넘기지 않는다.

로컬 hotseat는 첫 제출 뒤 입력 폼/예상 경로를 숨기는 인계 화면을 쓴다. 한 기기의 로컬 메모리를 공유하므로 개발자 도구까지 방어하는 보안 기능은 아니다. 미래 서버 연결 시 원본 GameState는 서버가 보유해야 한다.

## 행동 큐

예약은 즉시 실행이 아니다. 예약 시 누적 드리블 비용을 검사하고, 실행 시 현재 상태로 다시 검증한다. 상황 변화로 다음 예약이 불법이면 큐를 취소하고 이유를 남긴다. 사용자에게 큐 취소 컨트롤을 제공한다. 양측이 모두 확정되기 전에는 큐도 혼자 시간을 진행할 수 없다.

## 재현

초기 config/seed/선수와 확정 DecisionRecord 목록이 재현 입력이다. 정확한 큐/취소 상태까지 복원할 때에는 ReplayOperation(제출, 예약, 취소, 첫 예약 제출) 목록도 기록한다. 동일 입력은 동일 상태와 이벤트를 만든다. 시작 전 취소나 거부는 물리 경기 결과를 바꾸지 않는다. 플레이 중 hotseat의 UI 내보내기는 확정 DecisionRecord만 사용하여 미공개 예약/제출을 파일에 노출하지 않는다. UI에서 임의 상태를 주입하는 방식으로 리플레이를 수행하지 않는다.

## 리플레이 버전 2

이벤트 턴의 명령과 결과는 버전 2로 저장한다. 버전 1은 이전 마이크로 턴 실행 순서와 계속하기 명령에 의존하므로 지원하지 않는다. UI와 엔진은 버전 1 파일을 새 규칙으로 조용히 해석하지 않고, 규칙이 달라 재생할 수 없다는 이유를 표시한다. 새 파일을 불러오지 못하면 현재 경기는 보존한다.

타임라인의 한 칸은 완료된 양측 선택 한 쌍이다. 인계 화면에서도 공개 결과는 유지하지만 새 선택·경로 미리보기·개인 큐는 숨긴다. 상황별 대응 버튼은 현재 조작자의 합법 행동만 표시하며 미공개 상대 선택을 추천에 사용하지 않는다.
