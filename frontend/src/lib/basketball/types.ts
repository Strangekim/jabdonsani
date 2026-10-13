/** 브라우저나 서버에 의존하지 않는 경기 계약. 좌표와 속도의 단위는 m, m/s다. */
export type PlayerId = 'p1' | 'p2';
export type Role = 'offense' | 'defense' | 'both';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type Vec2 = { x: number; y: number };
export type AttributeKey = 'Speed' | 'Acceleration' | 'Agility' | 'Deceleration' | 'Footwork' | 'BallHandling' | 'BallControl' | 'DribbleSpeed' | 'DribbleProtection' | 'CloseShot' | 'MidRangeShot' | 'LongRangeShot' | 'Layup' | 'Dunk' | 'ShotCreation' | 'PerimeterDefense' | 'LateralQuickness' | 'Steal' | 'Block' | 'ShotContest' | 'DefensiveAwareness' | 'Reaction' | 'Strength' | 'Balance' | 'Vertical' | 'Endurance' | 'BodyControl' | 'Composure' | 'Anticipation' | 'DecisionMaking';
export type Attributes = Record<AttributeKey, number>;
export type ActionId = 'NormalDribble' | 'SpeedDribble' | 'ProtectedDribble' | 'Crossover' | 'BetweenTheLegs' | 'BehindTheBack' | 'Hesitation' | 'InAndOut' | 'SpinMove' | 'RetreatDribble' | 'Walk' | 'Sprint' | 'Stop' | 'ProtectBall' | 'JabStep' | 'Pivot' | 'StepBack' | 'SideStep' | 'PumpFake' | 'Gather' | 'Layup' | 'Floater' | 'JumpShot' | 'Dunk' | 'StandingShot' | 'PullUpJumper' | 'StepBackShot' | 'ReverseLayup' | 'HoldPosition' | 'DefensiveSlideLeft' | 'DefensiveSlideRight' | 'RetreatStep' | 'ForwardStep' | 'CloseOut' | 'CutOffDrivingLane' | 'ShadeLeft' | 'ShadeRight' | 'AnticipateDirection' | 'StealAttempt' | 'ReachIn' | 'BodyUp' | 'ContestShot' | 'JumpContest' | 'BlockAttempt' | 'RecoverBalance' | 'Rebound' | 'RecoverBall' | 'ContinueAction';
export interface ActionCommand {
  actionId: ActionId;
  direction?: Vec2;
  desiredGap?: number; // 수비가 유지할 간격(m), 0.5~4
  speed?: number; // 0~1의 목표 속도 비율
  hand?: 'left' | 'right';
  anticipatedDirection?: Vec2;
  releaseTiming?: number; // -1(빠름)~1(늦음)
  combo?: ActionId[]; // 드리블 기술만 추가 가능하며 각 단위가 카운트된다.
}
export interface ActionDefinition {
  id: ActionId; name: string; role: Role;
  category: 'dribble' | 'movement' | 'footwork' | 'shot' | 'defense' | 'recovery' | 'ball';
  description: string; prerequisites: string[];
  primaryAttributes: AttributeKey[]; secondaryAttributes: AttributeKey[]; opposingAttributes: AttributeKey[];
  duration: number; staminaCost: number; burstCost: number; movementProfile: number;
  balanceModifier: number; ballControlModifier: number; dribbleCost: number;
  interruptWindows: number[]; recoveryDuration: number; difficulty: number;
}
export interface PlayerSetup { name?: string; attributes?: Partial<Attributes>; dominantHand?: 'left' | 'right'; }
export interface PlayerState {
  playerId: PlayerId; name: string; attributes: Attributes; dominantHand: 'left' | 'right';
  position: Vec2; velocity: Vec2; facingDirection: Vec2; movementDirection: Vec2;
  stamina: number; burstEnergy: number; fatigue: number; bodyBalance: number;
  ballPossession: boolean; ballHand: 'left' | 'right';
  dribbleState: 'ready' | 'live' | 'ended'; dribblesUsed: number; ballControl: number;
  footworkState: 'planted' | 'moving' | 'gathered'; pivotFoot: 'left' | 'right' | null; pivotPosition: Vec2 | null; gatheredSteps: number;
  actionState: ActionId | null; actionProgress: number; recoveryTime: number;
  defensiveStance: 'upright' | 'low' | 'airborne'; defensiveCommitment: Vec2; reactionDelay: number;
  fouls: number;
}
export interface GameConfig {
  tickDuration: number; shotClock: number; maxDribbles: number; targetScore: number;
  winBy: number; maxScore: number; maxPossessions: number; courtWidth: number; courtLength: number;
  hoop: Vec2; arcRadius: number; maxQueueLength: number; offensiveReboundClock: number;
  foulLimit: number; initialOffenseId: PlayerId;
}
export type ConfigOverrides = Partial<Omit<GameConfig, 'hoop'>> & { hoop?: Vec2 };
export type EventType = 'check_ball' | 'action_start' | 'action_end' | 'movement' | 'dribble' | 'fake' | 'balance_loss' | 'lane_blocked' | 'drive_advantage' | 'steal_attempt' | 'steal' | 'loose_ball' | 'ball_recovered' | 'shot' | 'score' | 'miss' | 'block' | 'foul' | 'free_throw' | 'rebound' | 'turnover' | 'possession_change' | 'shot_clock' | 'queue_cancelled' | 'game_over' | 'decision_point';
export interface GameEvent {
  id: number; type: EventType; time: number; decisionId: number; possession: number;
  playerId?: PlayerId; targetId?: PlayerId; actionId?: ActionId;
  message: string; position?: Vec2; data?: Record<string, number | string | boolean | Vec2>;
}
export interface BallState { status: 'held' | 'dribbling' | 'loose' | 'rebound'; ownerId: PlayerId | null; position: Vec2; lastTouchId: PlayerId; }
export interface DecisionRecord { decisionId: number; commands: Record<PlayerId, ActionCommand>; }
export interface GameStats {
  possessions: number; completedPossessions: number; totalPossessionTime: number; totalDecisions: number; totalDribbles: number;
  shots: Record<PlayerId, number>; madeShots: Record<PlayerId, number>; turnovers: Record<PlayerId, number>;
  steals: Record<PlayerId, number>; stealAttempts: Record<PlayerId, number>; blocks: Record<PlayerId, number>; blockAttempts: Record<PlayerId, number>;
  fouls: Record<PlayerId, number>; rebounds: Record<PlayerId, number>; drives: Record<PlayerId, number>;
  dribbleAttempts: Partial<Record<ActionId, number>>; dribbleSuccesses: Partial<Record<ActionId, number>>;
  staminaSpent: Record<PlayerId, number>;
}
export interface ScheduledAction {
  command: ActionCommand; units: ActionId[]; index: number; elapsed: number; duration: number; completed: boolean;
  startPosition: Vec2; maxTravel: number; controlChecked: boolean; stealChecked: boolean; fakeChecked: boolean;
  blockedLane: boolean; driveLogged: boolean; nextWindow: number; interruptible: boolean; unitPending: boolean; recoveryDelay: number; executionStarted: boolean; unitDribbleCost: number;
}
export type ReplayOperation = { type: 'submit'; playerId: PlayerId; decisionId: number; command: ActionCommand } | { type: 'queue'; playerId: PlayerId; commands: ActionCommand[] } | { type: 'cancel'; playerId: PlayerId } | { type: 'queued'; playerId: PlayerId; decisionId: number };
export interface GameState {
  version: 1; config: GameConfig; seed: number; rngState: number; initialPlayers: [PlayerSetup, PlayerSetup];
  players: [PlayerState, PlayerState]; offenseId: PlayerId; score: Record<PlayerId, number>;
  shotClock: number; decisionId: number; possession: number; possessionStartedAt: number; time: number;
  submissions: Partial<Record<PlayerId, ActionCommand>>; queues: Record<PlayerId, ActionCommand[]>;
  ongoingActions: Partial<Record<PlayerId, ScheduledAction>>; operations: ReplayOperation[];
  events: GameEvent[]; history: DecisionRecord[]; status: 'playing' | 'finished'; winner: PlayerId | null;
  ball: BallState; stats: GameStats; decisionReason: string;
}
/** 상대의 미공개 제출, 큐, 시드, 미래 난수 및 내부 AI 점수는 관찰 계약에서 제거한다. */
export interface PlayerObservation {
  config: GameConfig; players: [PlayerState, PlayerState]; playerId: PlayerId; offenseId: PlayerId;
  score: Record<PlayerId, number>; shotClock: number; decisionId: number; possession: number; time: number;
  status: 'playing' | 'finished'; winner: PlayerId | null; ball: BallState;
  events: GameEvent[]; ownQueue: ActionCommand[]; ownSubmitted: boolean; legalActions: ActionDefinition[];
  decisionReason: string;
}
export interface ActionValidation { valid: boolean; error?: string; code?: string; }
export interface EngineResult { state: GameState; error?: string; code?: string; resolved?: boolean; }
export interface ReplayData { version: 1; config: GameConfig; seed: number; players: [PlayerSetup, PlayerSetup]; decisions: DecisionRecord[]; operations?: ReplayOperation[]; }
