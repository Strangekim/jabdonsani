import { ACTIONS, ACTION_LIST } from './actions';
import { ATTRIBUTE_KEYS, DEFAULT_ATTRIBUTES, DEFAULT_CONFIG } from './config';
import { actionDuration, actionEfficiency, balanceRecovery, blockProbability, clamp, distance, dot, dribbleControlScore, fakeAdvantage, length, movementSpeed, normalize, performanceFactor, reactionDelay, shotProbability, stealProbability, subtract } from './formulas';
import type { ActionCommand, ActionDefinition, ActionId, ActionValidation, ConfigOverrides, DecisionRecord, EngineResult, GameConfig, GameEvent, GameState, PlayerId, PlayerObservation, PlayerSetup, PlayerState, ReplayData, ScheduledAction, Vec2 } from './types';

const IDS:PlayerId[]=['p1','p2'];
const FOOT_STEPS:ActionId[]=['StepBack','SideStep','StepBackShot'];
const JUMP_DEFENSE:ActionId[]=['JumpContest','BlockAttempt'];
const SHOOTING_MOVES:ActionId[]=['Layup','Dunk','ReverseLayup'];
export const otherPlayer = (id:PlayerId):PlayerId => id==='p1'?'p2':'p1';
export const getPlayer = (s:Pick<GameState,'players'>,id:PlayerId):PlayerState => s.players[id==='p1'?0:1];
const copy = <T>(value:T):T => structuredClone(value);
/** 과거 이벤트/입력은 불변으로 공유하고 변경하는 현재 상태만 깊게 복제한다. */
function cloneState(s:GameState):GameState {
  return {...s,players:copy(s.players),score:{...s.score},submissions:copy(s.submissions),queues:copy(s.queues),ongoingActions:copy(s.ongoingActions),ball:copy(s.ball),stats:copy(s.stats),events:[...s.events],history:[...s.history],operations:[...s.operations]};
}
const pair = () => ({p1:0,p2:0});
const validId = (id:unknown):id is PlayerId => id==='p1'||id==='p2';
const failure = (error:string,code:string):ActionValidation => ({valid:false,error,code});
const rounded = (n:number) => Math.round(n*1e9)/1e9;

/** xorshift32의 현재 상태만 보관하며 관찰 API에는 절대 내보내지 않는다. */
function avalanche(seed:number):number { let x=seed|0; x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return ((x^(x>>>15))>>>0)||0x9e3779b9; }
function random(s:GameState):number { let x=s.rngState; x^=x<<13; x^=x>>>17; x^=x<<5; s.rngState=x>>>0; return s.rngState/4294967296; }
function emit(s:GameState,type:GameEvent['type'],message:string,extra:Partial<GameEvent>={}):void {
  const id=(s.events.at(-1)?.id??0)+1;
  s.events.push({id,type,time:rounded(s.time),decisionId:s.decisionId,possession:s.possession,message,...extra});
  // 긴 AI 경기도 현재 표시용 로그의 메모리가 무한 증가하지 않는다. 전체 재현은 명령 기록을 사용한다.
  if(s.events.length>600)s.events.splice(0,s.events.length-600);
}
function validateConfig(c:GameConfig):void {
  for(const [k,v] of Object.entries(c))if(k!=='hoop'&&k!=='initialOffenseId'&&(typeof v!=='number'||!Number.isFinite(v)))throw new Error(`설정 ${k}는 유한한 숫자여야 합니다.`);
  if(c.tickDuration<0.02||c.tickDuration>0.25)throw new Error('틱 간격은 0.02~0.25초입니다.');
  if(c.shotClock<3||c.shotClock>60)throw new Error('공격 제한시간은 3~60초입니다.');
  if(!Number.isInteger(c.maxDribbles)||c.maxDribbles<1||c.maxDribbles>3)throw new Error('드리블 제한은 1~3회입니다.');
  if(!Number.isInteger(c.targetScore)||c.targetScore<1||c.targetScore>100||!Number.isInteger(c.winBy)||c.winBy<1||c.winBy>10||!Number.isInteger(c.maxScore)||c.maxScore<c.targetScore)throw new Error('승리 점수, 점수차, 최대 점수를 확인하세요.');
  if(!Number.isInteger(c.maxPossessions)||c.maxPossessions<1||c.maxPossessions>10000)throw new Error('최대 포제션은 1~10000입니다.');
  if(c.courtWidth<10||c.courtWidth>30||c.courtLength<10||c.courtLength>30||!Number.isFinite(c.hoop.x)||!Number.isFinite(c.hoop.y)||c.hoop.x<=0||c.hoop.x>=c.courtWidth||c.hoop.y<=0||c.hoop.y>=c.courtLength)throw new Error('코트 크기나 골대 좌표가 유효하지 않습니다.');
  if(c.arcRadius<3||c.arcRadius>10||c.maxQueueLength<1||c.maxQueueLength>12||!Number.isInteger(c.maxQueueLength)||c.offensiveReboundClock<1||c.offensiveReboundClock>60||c.foulLimit<1||!Number.isInteger(c.foulLimit)||!validId(c.initialOffenseId))throw new Error('경기 규칙 범위를 확인하세요.');
}
function makePlayer(id:PlayerId,setup:PlayerSetup):PlayerState {
  const attributes={...DEFAULT_ATTRIBUTES,...setup.attributes};
  for(const key of ATTRIBUTE_KEYS){if(!Number.isFinite(attributes[key]))throw new Error(`능력치 ${key}가 유효하지 않습니다.`);attributes[key]=clamp(attributes[key],0,100);}
  return {playerId:id,name:(setup.name??(id==='p1'?'플레이어 1':'플레이어 2')).slice(0,40),attributes,dominantHand:setup.dominantHand??'right',position:{x:0,y:0},velocity:{x:0,y:0},facingDirection:{x:0,y:-1},movementDirection:{x:0,y:0},stamina:100,burstEnergy:100,fatigue:0,bodyBalance:100,ballPossession:false,ballHand:setup.dominantHand??'right',dribbleState:'ready',dribblesUsed:0,ballControl:100,footworkState:'planted',pivotFoot:null,pivotPosition:null,gatheredSteps:0,actionState:null,actionProgress:0,recoveryTime:0,defensiveStance:'upright',defensiveCommitment:{x:0,y:0},reactionDelay:0,fouls:0};
}
function setCheckBall(s:GameState):void {
  const attack=getPlayer(s,s.offenseId),defend=getPlayer(s,otherPlayer(s.offenseId));
  attack.position={x:s.config.hoop.x,y:Math.min(s.config.courtLength-1,s.config.hoop.y+7.2)};
  defend.position={x:s.config.hoop.x,y:attack.position.y-1.65};
  for(const p of s.players){p.velocity={x:0,y:0};p.movementDirection={x:0,y:0};p.facingDirection=normalize(subtract(s.config.hoop,p.position));p.ballPossession=p.playerId===s.offenseId;p.dribbleState='ready';p.dribblesUsed=0;p.gatheredSteps=0;p.footworkState='planted';p.pivotFoot=null;p.pivotPosition=null;p.actionState=null;p.actionProgress=0;p.recoveryTime=0;p.defensiveStance='upright';p.defensiveCommitment={x:0,y:0};p.bodyBalance=Math.max(85,p.bodyBalance);p.ballControl=100;p.stamina=clamp(p.stamina+4,0,100);p.burstEnergy=clamp(p.burstEnergy+14,0,100);}
  s.ball={status:'held',ownerId:s.offenseId,position:{...attack.position},lastTouchId:s.offenseId};
  s.shotClock=s.config.shotClock;s.possessionStartedAt=s.time;
  emit(s,'check_ball','체크볼: 새로운 공격을 시작합니다.',{playerId:s.offenseId,position:{...attack.position}});
}
export function createGame(overrides:ConfigOverrides={},seed=1,players:[PlayerSetup,PlayerSetup]=[{},{}]):GameState {
  if(!overrides||typeof overrides!=='object'||Array.isArray(overrides)||!Array.isArray(players)||players.length!==2||players.some(p=>!p||typeof p!=='object'||Array.isArray(p)))throw new Error('경기 설정 또는 선수 형식이 잘못되었습니다.');
  for(const k of Object.keys(overrides))if(!Object.hasOwn(DEFAULT_CONFIG,k))throw new Error(`알 수 없는 설정: ${k}`);
  for(const p of players){if(p.name!==undefined&&typeof p.name!=='string')throw new Error('선수 이름은 문자열이어야 합니다.');if(p.dominantHand!==undefined&&!['left','right'].includes(p.dominantHand))throw new Error('주로 쓰는 손이 잘못되었습니다.');if(p.attributes!==undefined&&(!p.attributes||typeof p.attributes!=='object'||Array.isArray(p.attributes)||Object.keys(p.attributes).some(k=>!ATTRIBUTE_KEYS.includes(k as typeof ATTRIBUTE_KEYS[number]))))throw new Error('능력치 형식이 잘못되었습니다.');}
  const config:GameConfig={...DEFAULT_CONFIG,...overrides,hoop:{...(overrides.hoop??DEFAULT_CONFIG.hoop)}};validateConfig(config);
  if(!Number.isFinite(seed))throw new Error('시드는 유한한 숫자여야 합니다.');
  const initialPlayers=copy(players),normalizedSeed=seed>>>0;
  const s:GameState={version:1,config,seed:normalizedSeed,rngState:avalanche(normalizedSeed),initialPlayers,players:[makePlayer('p1',players[0]),makePlayer('p2',players[1])],offenseId:config.initialOffenseId,score:pair(),shotClock:config.shotClock,decisionId:1,possession:1,possessionStartedAt:0,time:0,submissions:{},queues:{p1:[],p2:[]},ongoingActions:{},operations:[],events:[],history:[],status:'playing',winner:null,ball:{status:'held',ownerId:config.initialOffenseId,position:{x:0,y:0},lastTouchId:config.initialOffenseId},decisionReason:'체크볼',stats:{possessions:1,completedPossessions:0,totalPossessionTime:0,totalDecisions:0,totalDribbles:0,shots:pair(),madeShots:pair(),turnovers:pair(),steals:pair(),stealAttempts:pair(),blocks:pair(),blockAttempts:pair(),fouls:pair(),rebounds:pair(),drives:pair(),dribbleAttempts:{},dribbleSuccesses:{},staminaSpent:pair()}};
  setCheckBall(s);return s;
}
export function commandDribbleCost(command:ActionCommand,state?:Pick<GameState,'players'|'offenseId'>,id?:PlayerId):number {
  if(state&&id===state.offenseId&&getPlayer(state,id).dribbleState==='live'&&['Walk','Sprint'].includes(command.actionId))return 1;
  return [command.actionId,...(command.combo??[])].reduce((sum,key)=>sum+(ACTIONS[key]?.dribbleCost??0),0);
}
function unstartedDribbles(r:Runtime|undefined):number { if(!r)return 0;const future=r.units.slice(r.index+1).reduce((n,id)=>n+ACTIONS[id].dribbleCost,0);return future+(r.unitPending?ACTIONS[r.units[r.index]].dribbleCost:!r.executionStarted?r.unitDribbleCost:0); }
function validateShape(command:ActionCommand):ActionValidation {
  if(!command||typeof command!=='object'||!Object.hasOwn(ACTIONS,command.actionId))return failure('알 수 없는 행동입니다.','UNKNOWN_ACTION');
  if(command.combo!==undefined&&(!Array.isArray(command.combo)||command.combo.length>2||command.combo.some(id=>!Object.hasOwn(ACTIONS,id)||ACTIONS[id].category!=='dribble')||ACTIONS[command.actionId].category!=='dribble'))return failure('복합 명령은 최대 세 개의 드리블 행동으로 구성합니다.','INVALID_COMBO');
  for(const v of [command.direction,command.anticipatedDirection])if(v!==undefined&&(!v||!Number.isFinite(v.x)||!Number.isFinite(v.y)||Math.abs(v.x)>1000||Math.abs(v.y)>1000))return failure('유효한 이동 방향을 선택하세요.','INVALID_DIRECTION');
  if(command.speed!==undefined&&(!Number.isFinite(command.speed)||command.speed<0||command.speed>1))return failure('속도는 0~1 사이입니다.','INVALID_SPEED');
  if(command.releaseTiming!==undefined&&(!Number.isFinite(command.releaseTiming)||Math.abs(command.releaseTiming)>1))return failure('릴리스 타이밍은 -1~1 사이입니다.','INVALID_TIMING');
  if(command.desiredGap!==undefined&&(!Number.isFinite(command.desiredGap)||command.desiredGap<0.5||command.desiredGap>4))return failure('수비 간격은 0.5~4m입니다.','INVALID_GAP');
  if(command.hand!==undefined&&command.hand!=='left'&&command.hand!=='right')return failure('드리블 손을 확인하세요.','INVALID_HAND');
  return {valid:true};
}
export function validateAction(s:GameState,id:PlayerId,command:ActionCommand):ActionValidation {
  if(!validId(id))return failure('알 수 없는 플레이어입니다.','INVALID_PLAYER');
  if(s.status!=='playing')return failure('경기가 끝났습니다.','GAME_OVER');
  const shape=validateShape(command);if(!shape.valid)return shape;
  const p=getPlayer(s,id),a=ACTIONS[command.actionId],offense=id===s.offenseId,ongoing=s.ongoingActions[id];
  if(command.actionId==='ContinueAction')return ongoing?{valid:true}:failure('이어갈 행동이 없습니다.','NO_ONGOING_ACTION');
  if(ongoing&&!ongoing.interruptible)return failure('행동 중간 잠금 구간입니다. 현재 행동을 계속하세요.','ACTION_LOCKED');
  if(s.ball.status==='loose'||s.ball.status==='rebound'){
    if(!['Rebound','RecoverBall','RecoverBalance','HoldPosition','Walk','Sprint','Stop','BodyUp'].includes(a.id))return failure('공을 회수하거나 리바운드를 준비하세요.','LOOSE_BALL_ACTION');
    if(a.id==='Rebound'&&s.ball.status!=='rebound')return failure('현재는 리바운드 상황이 아닙니다.','NO_REBOUND');
    return {valid:true};
  }
  if(a.category==='ball')return failure('회수할 공이 없습니다.','NO_LOOSE_BALL');
  if(a.role!=='both'&&a.role!==(offense?'offense':'defense'))return failure('현재 역할에서 사용할 수 없는 행동입니다.','WRONG_ROLE');
  if(a.role==='offense'&&(!p.ballPossession||s.ball.ownerId!==id))return failure('공을 소유해야 합니다.','NO_POSSESSION');
  const liveMovement=offense&&['Walk','Sprint'].includes(a.id)&&p.dribbleState==='live';
  if(a.dribbleCost||liveMovement){
    if(p.dribbleState==='ended')return failure('공을 잡은 뒤 다시 드리블할 수 없습니다 (더블 드리블).','DOUBLE_DRIBBLE');
    if(p.dribblesUsed+(liveMovement?1:commandDribbleCost(command))>s.config.maxDribbles)return failure('한 포제션의 드리블 행동은 최대 3회입니다.','DRIBBLE_LIMIT');
  }
  if(offense&&['Walk','Sprint'].includes(a.id)&&p.dribbleState!=='live'){
    if(p.dribbleState==='ready'||a.id==='Sprint'||p.gatheredSteps>=2)return failure('공을 잡은 상태의 허용 스텝을 벗어납니다 (트래블링).','TRAVELING');
  }
  if(offense&&FOOT_STEPS.includes(a.id)){
    if(p.dribbleState==='ready')return failure('피벗 발을 두고 이동할 수 없습니다. 먼저 드리블을 시작하세요.','TRAVELING');
    if(p.gatheredSteps>=2)return failure('개더 뒤 두 스텝을 모두 사용했습니다 (트래블링).','TRAVELING');
    if(a.id==='Sprint'&&p.dribbleState==='ended')return failure('공을 잡은 상태에서 스프린트할 수 없습니다.','TRAVELING');
  }
  if(a.id==='Layup'&&distance(p.position,s.config.hoop)>3.4)return failure('레이업은 골대 3.4m 이내에서 가능합니다.','OUT_OF_RANGE');
  if(a.id==='ReverseLayup'&&distance(p.position,s.config.hoop)>3)return failure('리버스 레이업은 골대 3m 이내에서 가능합니다.','OUT_OF_RANGE');
  if(a.id==='Dunk'&&distance(p.position,s.config.hoop)>2.4)return failure('덩크는 골대 2.4m 이내에서 가능합니다.','OUT_OF_RANGE');
  if(a.id==='Floater'&&distance(p.position,s.config.hoop)>5)return failure('플로터는 골대 5m 이내에서 가능합니다.','OUT_OF_RANGE');
  if(offense&&SHOOTING_MOVES.includes(a.id)&&p.gatheredSteps>=2&&length(p.velocity)>0.2)return failure('두 스텝 후에는 추가 발걸음 없이 점프슛을 선택하세요.','TRAVELING');
  return {valid:true};
}
export function getLegalActions(s:GameState,id:PlayerId):ActionDefinition[] { if(!validId(id))return [];return ACTION_LIST.filter(a=>validateAction(s,id,{actionId:a.id}).valid).map(copy); }
export function getObservation(s:GameState,id:PlayerId,eventLimit=600):PlayerObservation {
  if(!validId(id))throw new Error('알 수 없는 플레이어입니다.');
  return copy({config:s.config,players:s.players,playerId:id,offenseId:s.offenseId,score:s.score,shotClock:s.shotClock,decisionId:s.decisionId,possession:s.possession,time:s.time,status:s.status,winner:s.winner,ball:s.ball,events:eventLimit===0?[]:s.events.slice(-Math.max(0,Math.floor(eventLimit))),ownQueue:s.queues[id],ownSubmitted:!!s.submissions[id],legalActions:getLegalActions(s,id),decisionReason:s.decisionReason});
}
export function queueActions(s:GameState,id:PlayerId,commands:ActionCommand[]):EngineResult {
  if(!validId(id)||!Array.isArray(commands))return {state:s,error:'예약 명령 형식이 잘못되었습니다.',code:'INVALID_QUEUE'};
  if(s.status!=='playing')return {state:s,error:'경기가 끝났습니다.',code:'GAME_OVER'};
  if(s.queues[id].length+commands.length>s.config.maxQueueLength)return {state:s,error:`예약은 최대 ${s.config.maxQueueLength}개입니다.`,code:'QUEUE_LIMIT'};
  const next=cloneState(s); const active=next.ongoingActions[id]; next.ongoingActions={}; const p=getPlayer(next,id);
  if(active&&(!s.submissions[id]||s.submissions[id]?.actionId==='ContinueAction')){p.dribblesUsed+=unstartedDribbles(active);if(p.dribblesUsed>=s.config.maxDribbles)p.dribbleState='ended';}
  const planned=[...(s.submissions[id]?[s.submissions[id]!]:[]),...s.queues[id],...commands];
  // 예약 순서의 풋워크/드리블 상태를 미리 진행해 숨은 복합 명령도 예산에 포함한다.
  for(const cmd of planned){
    if(cmd.actionId==='ContinueAction')continue;
    const valid=validateAction(next,id,cmd);if(!valid.valid)return {state:s,error:valid.error,code:valid.code};
    const liveMove=id===s.offenseId&&p.dribbleState==='live'&&['Walk','Sprint'].includes(cmd.actionId);
    p.dribblesUsed+=liveMove?1:commandDribbleCost(cmd);
    const def=ACTIONS[cmd.actionId];
    if(def.dribbleCost||liveMove)p.dribbleState=p.dribblesUsed>=s.config.maxDribbles?'ended':'live';
    if(FOOT_STEPS.includes(cmd.actionId)&&id===s.offenseId){p.gatheredSteps++;p.dribbleState='ended';}
    if(['Gather','ProtectBall','PumpFake','Pivot','JabStep'].includes(cmd.actionId)&&p.dribbleState==='live')p.dribbleState='ended';
    if(cmd.actionId==='Gather')p.dribbleState='ended';
    if(def.category==='shot'&&cmd!==planned.at(-1))return {state:s,error:'슛 뒤 예약은 결과가 정해진 후 선택하세요.',code:'QUEUE_AFTER_SHOT'};
  }
  const result=cloneState(s);result.queues[id].push(...copy(commands));result.operations.push({type:'queue',playerId:id,commands:copy(commands)});return {state:result};
}
export function cancelQueue(s:GameState,id:PlayerId):EngineResult {
  if(!validId(id))return {state:s,error:'알 수 없는 플레이어입니다.',code:'INVALID_PLAYER'};
  const next=cloneState(s);next.operations.push({type:'cancel',playerId:id});if(next.queues[id].length){next.queues[id]=[];emit(next,'queue_cancelled','아직 시작하지 않은 예약 행동을 취소했습니다.',{playerId:id});}return {state:next};
}
function endMatchIfNeeded(s:GameState):boolean {
  const high=Math.max(s.score.p1,s.score.p2),diff=Math.abs(s.score.p1-s.score.p2);
  if((high>=s.config.targetScore&&diff>=s.config.winBy)||high>=s.config.maxScore||s.stats.completedPossessions>=s.config.maxPossessions){
    s.status='finished';s.winner=s.score.p1===s.score.p2?null:s.score.p1>s.score.p2?'p1':'p2';s.submissions={};s.queues={p1:[],p2:[]};
    emit(s,'game_over',s.winner?`${getPlayer(s,s.winner).name} 승리!`:'포제션 제한에 도달해 무승부입니다.',{...(s.winner?{playerId:s.winner}:{}),data:{p1:s.score.p1,p2:s.score.p2}});return true;
  }return false;
}
function finishPossession(s:GameState,nextId:PlayerId,reason:string):void {
  s.stats.completedPossessions++;s.stats.totalPossessionTime+=s.time-s.possessionStartedAt;
  emit(s,'possession_change',reason,{playerId:nextId,data:{duration:rounded(s.time-s.possessionStartedAt),dribbles:getPlayer(s,s.offenseId).dribblesUsed}});
  s.queues={p1:[],p2:[]};s.submissions={};s.ongoingActions={};
  if(endMatchIfNeeded(s))return;
  s.offenseId=nextId;s.possession++;s.stats.possessions++;setCheckBall(s);
}
function turnover(s:GameState,id:PlayerId,reason:string):void { s.stats.turnovers[id]++;emit(s,'turnover',reason,{playerId:id});finishPossession(s,otherPlayer(id),reason); }
function gather(p:PlayerState):void { if(p.dribbleState==='live')p.dribbleState='ended';p.footworkState='gathered';p.pivotFoot=p.ballHand==='right'?'left':'right';p.pivotPosition??={...p.position}; }
type Runtime = ScheduledAction;
function beginUnit(s:GameState,p:PlayerState,r:Runtime):void {
  const a=ACTIONS[r.units[r.index]];p.actionState=a.id;p.actionProgress=0;r.elapsed=0;r.recoveryDelay=p.recoveryTime;r.executionStarted=false;r.unitDribbleCost=a.dribbleCost||(p.ballPossession&&p.dribbleState==='live'&&['Walk','Sprint'].includes(a.id)?1:0);r.duration=actionDuration(p,{...r.command,actionId:a.id,combo:undefined})-r.recoveryDelay;r.controlChecked=false;r.fakeChecked=false;r.unitPending=false;r.nextWindow=0;r.interruptible=false;r.startPosition={...p.position};
  if(r.recoveryDelay<=0)startExecution(s,p,r);
}
function startExecution(s:GameState,p:PlayerState,r:Runtime):void {
  const a=ACTIONS[r.units[r.index]];r.executionStarted=true;r.startPosition={...p.position};
  p.reactionDelay=p.playerId===s.offenseId?0:reactionDelay(p);p.defensiveStance=JUMP_DEFENSE.includes(a.id)?'airborne':a.role==='defense'?'low':'upright';
  p.defensiveCommitment=normalize(r.command.anticipatedDirection??r.command.direction??{x:0,y:0});
  if(r.command.hand)p.ballHand=r.command.hand;
  const liveMove=p.ballPossession&&p.dribbleState==='live'&&['Walk','Sprint'].includes(a.id);
  if(a.dribbleCost||liveMove){
    p.dribblesUsed++;s.stats.totalDribbles++;s.stats.dribbleAttempts[a.id]=(s.stats.dribbleAttempts[a.id]??0)+1;p.dribbleState='live';p.footworkState='moving';p.pivotFoot=null;p.pivotPosition=null;p.gatheredSteps=0;
    if(['Crossover','BetweenTheLegs','BehindTheBack','SpinMove'].includes(a.id)&&!r.command.hand)p.ballHand=p.ballHand==='left'?'right':'left';
    s.ball.status='dribbling';emit(s,'dribble',`${p.name}: ${a.name} (${p.dribblesUsed}/${s.config.maxDribbles})`,{playerId:p.playerId,actionId:a.id,data:{dribblesUsed:p.dribblesUsed,unit:r.index+1,units:r.units.length}});
  }
  r.maxTravel=1000;
  if(p.ballPossession&&(FOOT_STEPS.includes(a.id)||(a.id==='Walk'&&p.dribbleState==='ended'))){gather(p);p.dribbleState='ended';p.gatheredSteps++;r.maxTravel=0.55+0.006*p.attributes.Footwork;}
  if(p.ballPossession&&['ProtectBall','Pivot','JabStep','PumpFake','Gather'].includes(a.id)){gather(p);if(a.id==='Gather')p.dribbleState='ended';s.ball.status='held';}
  if(a.category==='shot'){gather(p);p.dribbleState='ended';s.ball.status='held';if(SHOOTING_MOVES.includes(a.id)){r.maxTravel=0.7+0.004*p.attributes.Footwork;p.gatheredSteps=Math.min(2,p.gatheredSteps+1);}}
  if(a.id==='StealAttempt'||a.id==='ReachIn')s.stats.stealAttempts[p.playerId]++;
  if(a.id==='BlockAttempt'||a.id==='JumpContest')s.stats.blockAttempts[p.playerId]++;
  emit(s,'action_start',`${p.name}: ${a.name}`,{playerId:p.playerId,actionId:a.id,position:{...p.position},data:{duration:r.duration,interruptAt:a.interruptWindows.join(',')}});
}
function directionFor(s:GameState,p:PlayerState,r:Runtime):Vec2 {
  const id=r.units[r.index],op=getPlayer(s,otherPlayer(p.playerId)),hoop=s.config.hoop;
  if(id==='Rebound'||id==='RecoverBall')return normalize(subtract(s.ball.position,p.position));
  if(r.command.direction&&length(r.command.direction)>0)return normalize(r.command.direction);
  if(['StepBack','StepBackShot','RetreatDribble'].includes(id))return normalize(subtract(p.position,hoop));
  if(id==='SideStep')return {x:p.ballHand==='right'?1:-1,y:0};
  if(id==='DefensiveSlideLeft')return {x:-1,y:0};
  if(id==='DefensiveSlideRight')return {x:1,y:0};
  if(id==='RetreatStep')return normalize(subtract(p.position,op.position));
  if(id==='ShadeLeft'||id==='ShadeRight')return normalize({x:op.position.x+(id==='ShadeLeft'?-0.85:0.85)-p.position.x,y:op.position.y-(r.command.desiredGap??1.3)-p.position.y});
  if(id==='HoldPosition'||id==='CutOffDrivingLane'||id==='AnticipateDirection'){
    const target=normalize(subtract(hoop,op.position)),gap=r.command.desiredGap??1.4,anticipated=r.command.anticipatedDirection??{x:0,y:0};
    return normalize({x:op.position.x+target.x*gap+anticipated.x*0.6-p.position.x,y:op.position.y+target.y*gap+anticipated.y*0.6-p.position.y});
  }
  if(p.playerId!==s.offenseId)return normalize(subtract(op.position,p.position));
  if(id==='ReverseLayup')return normalize({x:hoop.x+(p.position.x<hoop.x?0.65:-0.65)-p.position.x,y:hoop.y-p.position.y});
  return normalize(subtract(hoop,p.position));
}
function proposedMove(s:GameState,p:PlayerState,r:Runtime,dt:number):{position:Vec2;velocity:Vec2;direction:Vec2;turn:number} {
  const a=ACTIONS[r.units[r.index]],direction=directionFor(s,p,r),oldDirection=normalize(p.velocity);
  let targetSpeed=r.completed||!r.executionStarted?0:movementSpeed(p,a)*(r.command.speed??0.8);
  if(p.playerId!==s.offenseId&&r.elapsed-r.recoveryDelay<p.reactionDelay)targetSpeed=0;
  if(['HoldPosition','CutOffDrivingLane'].includes(a.id)){
    const attack=getPlayer(s,s.offenseId),target=normalize(subtract(s.config.hoop,attack.position)),gap=r.command.desiredGap??1.4;
    if(distance(p.position,{x:attack.position.x+target.x*gap,y:attack.position.y+target.y*gap})<0.18)targetSpeed=0;
  }
  if(a.id==='Hesitation'&&p.actionProgress<0.4)targetSpeed*=0.2;
  if(a.id==='SpinMove'&&p.actionProgress<0.3)targetSpeed*=0.5;
  if(a.category==='shot'&&p.actionProgress>0.5)targetSpeed=0;
  if(a.movementProfile===0)targetSpeed=0;
  const turn=length(p.velocity)>0.15?clamp((1-dot(oldDirection,direction))/2):0;
  const agility=(0.45+0.0055*p.attributes.Agility)*performanceFactor(p);
  targetSpeed*=1-turn*(1-agility*0.75);
  const target={x:direction.x*targetSpeed,y:direction.y*targetSpeed},delta=subtract(target,p.velocity);
  const decelerating=targetSpeed<length(p.velocity)||dot(p.velocity,target)<0;
  const accel=(decelerating?2.8+0.085*p.attributes.Deceleration:2+0.075*p.attributes.Acceleration)*performanceFactor(p);
  const change=Math.min(1,accel*dt/Math.max(0.0001,length(delta)));
  let velocity={x:p.velocity.x+delta.x*change,y:p.velocity.y+delta.y*change};
  let position={x:p.position.x+velocity.x*dt,y:p.position.y+velocity.y*dt};
  if(a.movementProfile===0&&length(p.velocity)<0.05){velocity={x:0,y:0};position={...p.position};}
  // 고정 발 행동은 관성 이동으로 피벗 규칙을 우회할 수 없다.
  if(['Pivot','JabStep','ProtectBall','PumpFake','Gather'].includes(a.id)){position={...p.position};velocity={x:0,y:0};}
  if(distance(position,r.startPosition)>r.maxTravel){const n=normalize(subtract(position,r.startPosition));position={x:r.startPosition.x+n.x*r.maxTravel,y:r.startPosition.y+n.y*r.maxTravel};velocity={x:0,y:0};}
  return {position,velocity,direction,turn};
}
function updateResources(s:GameState,p:PlayerState,r:Runtime,turn:number,dt:number):void {
  const a=ACTIONS[r.units[r.index]],efficiency=actionEfficiency(p,a),active=!r.completed&&r.executionStarted;
  const cost=active?a.staminaCost*efficiency*dt/r.duration:0;
  s.stats.staminaSpent[p.playerId]+=cost;p.stamina=clamp(p.stamina-cost,0,100);p.burstEnergy=clamp(p.burstEnergy-(active?a.burstCost*efficiency*dt/r.duration:0),0,100);
  p.fatigue=clamp(p.fatigue+cost*(0.09-0.00045*p.attributes.Endurance),0,100);
  if(a.staminaCost<1.2||r.completed){p.stamina=clamp(p.stamina+(0.4+0.008*p.attributes.Endurance)*dt,0,100);p.burstEnergy=clamp(p.burstEnergy+(3+0.045*p.attributes.Endurance)*dt,0,100);}
  const recovery=balanceRecovery(p)*(a.id==='RecoverBalance'?2.2:0.4)*dt;
  const disturbance=turn*(8-0.045*p.attributes.Balance-0.022*p.attributes.Footwork)*dt*length(p.velocity);
  p.bodyBalance=clamp(p.bodyBalance+recovery+(active?a.balanceModifier*dt/r.duration:0)-disturbance,0,100);
  p.recoveryTime=Math.max(0,p.recoveryTime-dt);
}
function resolveMovement(s:GameState,runtimes:Record<PlayerId,Runtime>,dt:number):void {
  // 후보 위치를 모두 계산한 뒤 한 번에 적용하므로 제출 순서에 따른 우선권이 없다.
  const moves={p1:proposedMove(s,getPlayer(s,'p1'),runtimes.p1,dt),p2:proposedMove(s,getPlayer(s,'p2'),runtimes.p2,dt)};
  const attack=getPlayer(s,s.offenseId),defend=getPlayer(s,otherPlayer(s.offenseId)),aMove=moves[attack.playerId],dMove=moves[defend.playerId],ar=runtimes[attack.playerId],dr=runtimes[defend.playerId];
  if(s.ball.ownerId===attack.playerId){
    const relativeStart=subtract(attack.position,defend.position),relativeEnd=subtract(aMove.position,dMove.position),relativeDelta=subtract(relativeEnd,relativeStart);
    const closestT=clamp(-dot(relativeStart,relativeDelta)/Math.max(1e-9,dot(relativeDelta,relativeDelta)));
    const sweptGap=length({x:relativeStart.x+relativeDelta.x*closestT,y:relativeStart.y+relativeDelta.y*closestT});
    const gap=Math.min(distance(aMove.position,dMove.position),sweptGap),bodyRadius=0.72;
    const toHoop=normalize(subtract(s.config.hoop,attack.position));
    const lane=dot(normalize(subtract(defend.position,attack.position)),toHoop)>0.15;
    if(gap<bodyRadius&&lane){
      const defense=(0.5*defend.attributes.PerimeterDefense+0.28*defend.attributes.Strength+0.22*defend.bodyBalance)*performanceFactor(defend);
      const offense=(0.36*attack.attributes.Strength+0.29*attack.attributes.BodyControl+0.2*attack.attributes.Footwork+0.15*attack.bodyBalance)*performanceFactor(attack);
      const committed=dr.command.anticipatedDirection??dr.command.direction;
      const prediction=committed?dot(normalize(committed),aMove.direction)*(defend.attributes.Anticipation/100)*0.18:0;
      const resistance=clamp(0.5+(defense-offense)/140+prediction,0.15,0.9);
      if(sweptGap<bodyRadius&&distance(aMove.position,dMove.position)>=bodyRadius){aMove.position={x:attack.position.x+(aMove.position.x-attack.position.x)*closestT,y:attack.position.y+(aMove.position.y-attack.position.y)*closestT};dMove.position={x:defend.position.x+(dMove.position.x-defend.position.x)*closestT,y:defend.position.y+(dMove.position.y-defend.position.y)*closestT};}
      const contactNormal=normalize(subtract(aMove.position,dMove.position));
      const normal=length(contactNormal)>0?contactNormal:{x:0,y:1};
      aMove.position={x:aMove.position.x+normal.x*(bodyRadius-gap)*resistance,y:aMove.position.y+normal.y*(bodyRadius-gap)*resistance};
      dMove.position={x:dMove.position.x-normal.x*(bodyRadius-gap)*(1-resistance),y:dMove.position.y-normal.y*(bodyRadius-gap)*(1-resistance)};
      aMove.velocity={x:aMove.velocity.x*(1-resistance*0.7),y:aMove.velocity.y*(1-resistance*0.7)};
      attack.bodyBalance=clamp(attack.bodyBalance-resistance*3*(1-attack.attributes.Balance/200),0,100);
      defend.bodyBalance=clamp(defend.bodyBalance-(1-resistance)*2,0,100);
      if(!ar.blockedLane){ar.blockedLane=true;emit(s,'lane_blocked','수비가 이동 경로를 선점했습니다.',{playerId:defend.playerId,targetId:attack.playerId,data:{resistance,gap}});
        const charge=length(attack.velocity)>3.2&&length(defend.velocity)<0.6&&defense>offense+10;
        if(charge){turnover(s,attack.playerId,'자리 잡은 수비수에게 돌진: 공격자 파울');attack.fouls++;s.stats.fouls[attack.playerId]++;emit(s,'foul','공격자 차징 파울',{playerId:attack.playerId});return;}
        if(dr.command.actionId==='BodyUp'&&random(s)<clamp((100-defend.attributes.PerimeterDefense+100-defend.attributes.BodyControl)/900+length(defend.velocity)/80,0.015,0.23)){defensiveFoul(s,attack,defend,false,1,false);return;}
      }
    }
  }
  for(const p of s.players){const move=moves[p.playerId];p.velocity=move.velocity;p.movementDirection=move.direction;if(length(move.direction)>0)p.facingDirection=move.direction;
    if(p.playerId===s.offenseId&&p.ballPossession&&(move.position.x<0.2||move.position.x>s.config.courtWidth-0.2||move.position.y<0.2||move.position.y>s.config.courtLength-0.2)){turnover(s,p.playerId,'공을 소유한 선수가 코트 밖으로 나갔습니다.');return;}
    p.position={x:clamp(move.position.x,0.25,s.config.courtWidth-0.25),y:clamp(move.position.y,0.25,s.config.courtLength-0.25)};
    updateResources(s,p,runtimes[p.playerId],move.turn,dt);
  }
  if(s.ball.ownerId){s.ball.position={...getPlayer(s,s.ball.ownerId).position};}
  if(s.ball.ownerId===attack.playerId&&!ar.driveLogged&&ACTIONS[ar.units[ar.index]].movementProfile>0){
    const toward=normalize(subtract(s.config.hoop,attack.position)),behind=dot(subtract(defend.position,attack.position),toward)<-0.35;
    if(behind&&distance(attack.position,s.config.hoop)<distance(ar.startPosition,s.config.hoop)-0.4){ar.driveLogged=true;s.stats.drives[attack.playerId]++;emit(s,'drive_advantage','공간을 확보해 수비수 앞쪽으로 돌파했습니다.',{playerId:attack.playerId,position:{...attack.position}});}
  }
}
function looseBall(s:GameState,p:PlayerState,reason:string):void {
  p.ballPossession=false;
  s.ball={status:'loose',ownerId:null,lastTouchId:p.playerId,position:{x:clamp(p.position.x+(random(s)-0.5)*1.5,0.3,s.config.courtWidth-0.3),y:clamp(p.position.y+(random(s)-0.5)*1.5,0.3,s.config.courtLength-0.3)}};
  emit(s,'loose_ball',reason,{playerId:p.playerId,position:{...s.ball.position},data:{originalOffenseId:s.offenseId,dribblesUsed:p.dribblesUsed}});
}
function defensiveFoul(s:GameState,attacker:PlayerState,defender:PlayerState,shooting:boolean,points:number,made:boolean):void {
  defender.fouls++;s.stats.fouls[defender.playerId]++;defender.bodyBalance=clamp(defender.bodyBalance-5,0,100);
  emit(s,'foul',`${defender.name}: ${shooting?'슈팅':'수비'} 파울`,{playerId:defender.playerId,targetId:attacker.playerId,data:{shooting,fouls:defender.fouls}});
  if(shooting||defender.fouls%s.config.foulLimit===0){
    const attempts=made?1:shooting?points:1;
    const probability=clamp(0.32+0.0042*attacker.attributes.CloseShot+0.002*attacker.attributes.Composure-0.0012*attacker.fatigue,0.15,0.96);
    for(let i=0;i<attempts;i++){const success=random(s)<probability;if(success)s.score[attacker.playerId]++;emit(s,'free_throw',success?'자유투 성공 (+1)':'자유투 실패',{playerId:attacker.playerId,data:{success,probability,attempt:i+1,attempts}});}
    finishPossession(s,defender.playerId,'파울 자유투 후 공격권 전환');
  }else{
    // 비슈팅 파울은 같은 포제션이다. 드리블 제한과 종료 상태를 초기화하지 않는다.
    s.shotClock=Math.max(s.shotClock,Math.min(6,s.config.shotClock));attacker.velocity={x:0,y:0};defender.velocity={x:0,y:0};s.queues={p1:[],p2:[]};s.decisionReason='수비 파울';
    const toward=normalize(subtract(s.config.hoop,attacker.position));defender.position={x:clamp(attacker.position.x+toward.x*1.4,0.3,s.config.courtWidth-0.3),y:clamp(attacker.position.y+toward.y*1.4,0.3,s.config.courtLength-0.3)};
  }
}
function resolveDribbleAndDefense(s:GameState,runtimes:Record<PlayerId,Runtime>):boolean {
  const attacker=getPlayer(s,s.offenseId),defender=getPlayer(s,otherPlayer(s.offenseId)),ar=runtimes[attacker.playerId],dr=runtimes[defender.playerId];
  const a=ACTIONS[ar.units[ar.index]],d=ACTIONS[dr.units[dr.index]],gap=distance(attacker.position,defender.position);
  if((a.dribbleCost||(['Walk','Sprint'].includes(a.id)&&attacker.dribbleState==='live'))&&!ar.controlChecked&&attacker.actionProgress>=a.interruptWindows[0]){
    ar.controlChecked=true;attacker.ballControl=dribbleControlScore(attacker,defender,a);
    const weakHand=attacker.ballHand!==attacker.dominantHand?(100-attacker.attributes.BallHandling)/900:0;
    const lossProbability=clamp((75-attacker.ballControl)/650+weakHand+Math.max(0,30-attacker.bodyBalance)/450,0.002,0.32);
    if(random(s)<lossProbability){looseBall(s,attacker,'드리블 제어를 잃어 루즈볼이 됐습니다.');return true;}
    s.stats.dribbleSuccesses[a.id]=(s.stats.dribbleSuccesses[a.id]??0)+1;
  }
  if(!ar.fakeChecked&&attacker.actionProgress>=0.35&&['Crossover','Hesitation','InAndOut','SpinMove','JabStep','PumpFake'].includes(a.id)){
    ar.fakeChecked=true;const advantage=fakeAdvantage(attacker,defender,a),expected=dr.command.anticipatedDirection??dr.command.direction;
    const wrongWay=expected?dot(normalize(expected),attacker.movementDirection)<-0.15:false;
    const jumping=a.id==='PumpFake'&&JUMP_DEFENSE.includes(d.id);
    const penalty=clamp(advantage/8+(wrongWay?9:0)+(jumping?14:0),0,24);
    if(penalty>0){defender.bodyBalance=clamp(defender.bodyBalance-penalty,0,100);defender.reactionDelay+=penalty/100;defender.recoveryTime=Math.max(defender.recoveryTime,jumping?0.55:penalty/100);emit(s,'fake','페이크와 방향 전환으로 수비 반응이 늦어졌습니다.',{playerId:attacker.playerId,targetId:defender.playerId,data:{advantage,balancePenalty:penalty}});}
  }
  if(!dr.stealChecked&&(d.id==='StealAttempt'||d.id==='ReachIn')&&defender.actionProgress>=0.4){
    dr.stealChecked=true;
    const exposure=(a.dribbleCost?10:0)-a.ballControlModifier+(attacker.ballHand!==attacker.dominantHand?5:0)+(100-attacker.bodyBalance)/7;
    const reach=d.id==='ReachIn'?0.2:0;
    const probability=stealProbability(attacker,defender,gap-reach,exposure);
    emit(s,'steal_attempt','수비가 공을 노렸습니다.',{playerId:defender.playerId,targetId:attacker.playerId,data:{probability,gap,exposure}});
    const foulChance=gap<1.8?clamp((100-defender.attributes.Steal+100-defender.attributes.BodyControl+100-defender.attributes.DecisionMaking)/1500+(d.id==='ReachIn'?0.035:0),0.008,0.24):0;
    if(random(s)<foulChance){defensiveFoul(s,attacker,defender,false,1,false);return true;}
    if(random(s)<probability){
      if(random(s)<clamp(0.35+0.003*defender.attributes.BallControl+0.002*defender.attributes.Reaction+0.001*defender.attributes.Steal-gap*0.09,0.25,0.92)){s.stats.steals[defender.playerId]++;emit(s,'steal','공을 빼앗았습니다.',{playerId:defender.playerId,targetId:attacker.playerId,data:{dribblesUsed:attacker.dribblesUsed}});turnover(s,attacker.playerId,'스틸로 공격권이 바뀝니다.');}
      else{looseBall(s,attacker,'수비가 공을 쳐내 루즈볼이 됐습니다.');s.ball.lastTouchId=defender.playerId;}
      return true;
    }
    defender.bodyBalance=clamp(defender.bodyBalance-4,0,100);
  }
  return false;
}
function resolveShot(s:GameState,attacker:PlayerState,defender:PlayerState,command:ActionCommand):void {
  const gap=distance(attacker.position,defender.position),points=distance(attacker.position,s.config.hoop)>=s.config.arcRadius?2:1;
  const probability=shotProbability(attacker,defender,command,s.config),blockChance=blockProbability(attacker,defender,command,s.config);
  s.stats.shots[attacker.playerId]++;
  emit(s,'shot',`${attacker.name}: ${ACTIONS[command.actionId].name}`,{playerId:attacker.playerId,actionId:command.actionId,position:{...attacker.position},data:{probability,blockProbability:blockChance,points,distance:distance(attacker.position,s.config.hoop),velocity:length(attacker.velocity),releaseTiming:command.releaseTiming??0}});
  const blocked=random(s)<blockChance;
  const foulChance=gap<1.4&&['BodyUp','ReachIn','JumpContest','BlockAttempt','CloseOut'].includes(defender.actionState??'')?clamp((200-defender.attributes.ShotContest-defender.attributes.BodyControl)/1300+length(defender.velocity)/100,0.012,0.2):0;
  const foul=random(s)<foulChance;
  const made=!blocked&&random(s)<probability;
  if(made){s.stats.madeShots[attacker.playerId]++;s.score[attacker.playerId]+=points;emit(s,'score',`${points}점 성공!`,{playerId:attacker.playerId,data:{points,p1:s.score.p1,p2:s.score.p2}});}
  if(foul){defensiveFoul(s,attacker,defender,true,points,made);return;}
  if(made){finishPossession(s,defender.playerId,'득점 후 공격권 전환');return;}
  if(blocked){s.stats.blocks[defender.playerId]++;emit(s,'block','슛을 블록했습니다.',{playerId:defender.playerId,targetId:attacker.playerId,data:{probability:blockChance}});}
  else emit(s,'miss','슛이 빗나갔습니다.',{playerId:attacker.playerId,data:{probability}});
  attacker.ballPossession=false;
  const angle=random(s)*Math.PI*2,radius=(blocked?1:1.2)+random(s)*(points===2?2.5:1.3),origin=blocked?attacker.position:s.config.hoop;
  s.ball={status:'rebound',ownerId:null,lastTouchId:blocked?defender.playerId:attacker.playerId,position:{x:clamp(origin.x+Math.cos(angle)*radius,0.4,s.config.courtWidth-0.4),y:clamp(origin.y+Math.sin(angle)*radius,0.4,s.config.courtLength-0.4)}};
  emit(s,'loose_ball','리바운드 위치가 결정됐습니다. 양측이 다음 행동을 선택합니다.',{position:{...s.ball.position},data:{rebound:true,originalOffenseId:s.offenseId,dribblesUsed:attacker.dribblesUsed}});
}
function resolveAvailableBall(s:GameState,runtimes:Record<PlayerId,Runtime>):void {
  const rebound=s.ball.status==='rebound';
  const scores=s.players.map(p=>{
    const command=runtimes[p.playerId].command,a=p.attributes,gap=distance(p.position,s.ball.position),active=command.actionId==='Rebound'||command.actionId==='RecoverBall';
    const skill=rebound?0.34*a.Vertical+0.24*a.Strength+0.22*a.Anticipation+0.2*a.BodyControl:0.38*a.BallControl+0.28*a.Reaction+0.2*a.Agility+0.14*a.DecisionMaking;
    return (skill*performanceFactor(p)+0.15*p.bodyBalance-gap*30+(active?20:0)+(command.actionId==='BodyUp'?8:0));
  });
  // 두 선수의 동시 위치와 능력을 평가한 뒤 작은 불확실성만 더한다.
  const offenseIndex=s.offenseId==='p1'?0:1,winChance=1/(1+Math.exp(-(scores[offenseIndex]-scores[1-offenseIndex])/15)),winner=random(s)<winChance?s.offenseId:otherPlayer(s.offenseId),p=getPlayer(s,winner);
  if(rebound){s.stats.rebounds[winner]++;emit(s,'rebound',`${p.name} 리바운드`,{playerId:winner,position:{...s.ball.position},data:{offensive:winner===s.offenseId,probability:winner===s.offenseId?winChance:1-winChance}});}
  else emit(s,'ball_recovered',`${p.name} 루즈볼 회수`,{playerId:winner,data:{samePossession:winner===s.offenseId,dribblesUsed:p.dribblesUsed}});
  if(winner!==s.offenseId){if(!rebound)s.stats.turnovers[s.offenseId]++;finishPossession(s,winner,rebound?'수비 리바운드로 공격권 전환':'루즈볼 탈취로 공격권 전환');return;}
  p.ballPossession=true;gather(p);p.dribbleState='ended';p.ballControl=clamp(0.7*p.attributes.BallControl+30,0,100);s.ball={status:'held',ownerId:winner,lastTouchId:winner,position:{...p.position}};
  if(rebound)s.shotClock=Math.max(s.shotClock,s.config.offensiveReboundClock);
  // 같은 공격자의 회수는 드리블 예산을 되살리지 않는다.
  s.queues={p1:[],p2:[]};
}
function resolvePair(s:GameState,commands:Record<PlayerId,ActionCommand>):void {
  const oldPossession=s.possession,wasAvailable=s.ball.status==='loose'||s.ball.status==='rebound';
  s.history.push({decisionId:s.decisionId,commands:copy(commands)});s.stats.totalDecisions++;s.submissions={};
  const runtime=(cmd:ActionCommand):Runtime=>({command:cmd,units:[cmd.actionId,...(cmd.combo??[])],index:0,elapsed:0,duration:0,completed:false,startPosition:{x:0,y:0},maxTravel:1000,controlChecked:false,stealChecked:false,fakeChecked:false,blockedLane:false,driveLogged:false,nextWindow:0,interruptible:false,unitPending:false,recoveryDelay:0,executionStarted:false,unitDribbleCost:0});
  const runtimes={} as Record<PlayerId,Runtime>;
  for(const id of IDS){
    const previous=s.ongoingActions[id];
    if(commands[id].actionId==='ContinueAction'&&previous){runtimes[id]=copy(previous);runtimes[id].interruptible=false;if(runtimes[id].unitPending)beginUnit(s,getPlayer(s,id),runtimes[id]);}
    else{
      if(previous)emit(s,'action_end','중단 가능 시점에서 현재 행동을 교체했습니다.',{playerId:id,actionId:previous.units[previous.index],data:{interrupted:true}});
      runtimes[id]=runtime(commands[id]);beginUnit(s,getPlayer(s,id),runtimes[id]);
    }
  }
  s.ongoingActions={};
  let stop=false,elapsed=0,eventReason='행동 종료';
  while(!stop&&elapsed<8&&s.status==='playing'&&s.possession===oldPossession){
    for(const id of IDS){const r=runtimes[id];if(!r.executionStarted&&r.elapsed+1e-9>=r.recoveryDelay)startExecution(s,getPlayer(s,id),r);}
    // 가장 이른 인터럽트/릴리스/종료 시각까지 정확히 적분한다. 짧은 행동이 긴 행동을 삭제하지 않는다.
    let dt=s.config.tickDuration;
    for(const id of IDS){const r=runtimes[id];if(r.completed)continue;const a=ACTIONS[r.units[r.index]];
      const nextWindow=a.interruptWindows[r.nextWindow];
      const boundary=!r.executionStarted?r.recoveryDelay:r.recoveryDelay+(nextWindow===undefined?r.duration:r.duration*nextWindow);
      dt=Math.min(dt,Math.max(0.000001,boundary-r.elapsed));
      if(a.category==='shot'&&r.elapsed<r.recoveryDelay+r.duration*0.72)dt=Math.min(dt,r.recoveryDelay+r.duration*0.72-r.elapsed);
    }
    s.time=rounded(s.time+dt);elapsed+=dt;
    if(!wasAvailable||s.ball.status==='loose')s.shotClock=rounded(Math.max(0,s.shotClock-dt));
    for(const id of IDS){const r=runtimes[id],p=getPlayer(s,id);if(!r.completed){r.elapsed+=dt;p.actionProgress=clamp((r.elapsed-r.recoveryDelay)/r.duration);}}
    const beforeFouls=s.stats.fouls.p1+s.stats.fouls.p2;
    resolveMovement(s,runtimes,dt);
    if(s.possession!==oldPossession||s.status!=='playing')break;
    if(s.stats.fouls.p1+s.stats.fouls.p2!==beforeFouls){stop=true;eventReason='파울';break;}
    if(!wasAvailable){
      stop=resolveDribbleAndDefense(s,runtimes);
      if(s.stats.fouls.p1+s.stats.fouls.p2!==beforeFouls)eventReason='파울';
      if(s.possession!==oldPossession||s.status!=='playing'||stop)break;
      const attacker=getPlayer(s,s.offenseId),r=runtimes[attacker.playerId],def=ACTIONS[r.units[r.index]];
      if(def.category==='shot'&&attacker.actionProgress>=0.72-1e-9){
        const timeToRelease=Math.max(0,r.recoveryDelay+r.duration*0.72-(r.elapsed-dt));
        if(s.shotClock+dt>=timeToRelease-1e-9){resolveShot(s,attacker,getPlayer(s,otherPlayer(s.offenseId)),{...r.command,actionId:def.id});stop=true;eventReason='슛 릴리스';break;}
      }
    }
    if(s.shotClock<=0&&s.ball.status!=='rebound'){emit(s,'shot_clock','공격 제한시간이 만료됐습니다.',{playerId:s.offenseId});turnover(s,s.offenseId,'공격 제한시간 위반');break;}
    let completedAny=false;
    for(const id of IDS){const r=runtimes[id],p=getPlayer(s,id);if(r.completed)continue;const a=ACTIONS[r.units[r.index]];
      if(r.elapsed+1e-8>=r.recoveryDelay+r.duration){
        completedAny=true;emit(s,'action_end',`${p.name}: ${a.name} 종료`,{playerId:id,actionId:a.id,position:{...p.position}});
        if(p.ballPossession&&p.dribbleState==='live'&&p.dribblesUsed>=s.config.maxDribbles){gather(p);p.dribbleState='ended';s.ball.status='held';}
        if(r.index+1<r.units.length){r.index++;r.unitPending=true;r.interruptible=true;}
        else{r.completed=true;p.actionProgress=1;p.recoveryTime=Math.max(p.recoveryTime,a.recoveryDuration);if(JUMP_DEFENSE.includes(a.id)){p.defensiveStance='upright';p.actionState='RecoverBalance';}}
        stop=true;eventReason='행동 완료';
      }else if(a.interruptWindows[r.nextWindow]!==undefined&&r.elapsed+1e-8>=r.recoveryDelay+r.duration*a.interruptWindows[r.nextWindow]){
        r.nextWindow++;r.interruptible=true;stop=true;eventReason=a.category==='shot'?'슛 준비 · 수비 대응':a.dribbleCost?'드리블 제어 · 방향 대응':'중단 가능 시점';
      }
    }
    if(wasAvailable&&completedAny){resolveAvailableBall(s,runtimes);eventReason='공 회수';stop=true;}
  }
  const disrupted=s.possession!==oldPossession||s.status!=='playing'||wasAvailable&&(s.ball.status==='held'||s.ball.status==='dribbling')||!wasAvailable&&(s.ball.status==='loose'||s.ball.status==='rebound')||eventReason==='파울'||eventReason==='슛 릴리스';
  if(!disrupted){for(const id of IDS)if(!runtimes[id].completed)s.ongoingActions[id]=runtimes[id];}
  if(s.status==='playing'&&s.possession===oldPossession){
    for(const p of s.players){
      if(p.bodyBalance<25)emit(s,'balance_loss',`${p.name}의 균형이 무너졌습니다.`,{playerId:p.playerId,data:{balance:p.bodyBalance}});
      emit(s,'movement',`${p.name} 위치 갱신`,{playerId:p.playerId,position:{...p.position},data:{velocity:{...p.velocity},stamina:p.stamina,balance:p.bodyBalance}});
    }
    if(s.ball.status==='held'||s.ball.status==='dribbling')s.ball.position={...getPlayer(s,s.offenseId).position};
  }
  s.decisionId++;
  s.decisionReason=s.status==='finished'?'경기 종료':s.possession!==oldPossession?'공격권 전환':s.ball.status==='rebound'?'리바운드 경합':s.ball.status==='loose'?'루즈볼 경합':eventReason;
  if(s.status==='playing')emit(s,'decision_point',s.decisionReason);
}
function primeQueues(s:GameState):void {
  for(const id of IDS){if(s.submissions[id]||!s.queues[id].length)continue;if(s.ongoingActions[id]){s.submissions[id]={actionId:'ContinueAction'};continue;}const cmd=s.queues[id][0],valid=validateAction(s,id,cmd);
    if(valid.valid){s.submissions[id]=s.queues[id].shift()!;}else{s.queues[id]=[];emit(s,'queue_cancelled','상황이 바뀌어 실행 불가능한 예약을 취소했습니다.',{playerId:id});}}
}
export function submitAction(s:GameState,id:PlayerId,decisionId:number,command:ActionCommand):EngineResult {
  if(!validId(id))return {state:s,error:'알 수 없는 플레이어입니다.',code:'INVALID_PLAYER'};
  if(decisionId!==s.decisionId)return {state:s,error:'이미 지난 의사결정입니다. 현재 상태에서 다시 선택하세요.',code:'STALE_DECISION'};
  if(s.submissions[id])return {state:s,error:'이미 확정한 명령은 바꿀 수 없습니다.',code:'ALREADY_SUBMITTED'};
  const valid=validateAction(s,id,command);if(!valid.valid)return {state:s,error:valid.error,code:valid.code};
  const budget=cloneState(s),bp=getPlayer(budget,id);let reserved=commandDribbleCost(command,s,id)+(command.actionId==='ContinueAction'?unstartedDribbles(s.ongoingActions[id]):0);
  if(commandDribbleCost(command,s,id)>0)bp.dribbleState='live';
  for(const queued of s.queues[id]){reserved+=commandDribbleCost(queued,budget,id);if(commandDribbleCost(queued,budget,id)>0)bp.dribbleState='live';}
  if(id===s.offenseId&&getPlayer(s,id).dribblesUsed+reserved>s.config.maxDribbles)return {state:s,error:'현재 명령과 예약이 남은 드리블 횟수를 초과합니다.',code:'DRIBBLE_LIMIT'};
  const next=cloneState(s);next.operations.push({type:'submit',playerId:id,decisionId,command:copy(command)});next.submissions[id]=copy(command);let resolved=false;
  while(next.status==='playing'&&next.submissions.p1&&next.submissions.p2){
    const commands={p1:next.submissions.p1,p2:next.submissions.p2};resolvePair(next,commands);resolved=true;if(next.status==='playing')primeQueues(next);
  }
  return {state:next,resolved};
}
/** 예약의 첫 명령을 명시적으로 확정할 때 사용한다. AI도 동일한 제출 검증을 거친다. */
export function submitQueuedAction(s:GameState,id:PlayerId,decisionId=s.decisionId):EngineResult {
  if(!validId(id)||!s.queues[id].length)return {state:s,error:'예약한 명령이 없습니다.',code:'EMPTY_QUEUE'};
  if(s.submissions[id])return {state:s,error:'이미 확정한 명령이 있습니다.',code:'ALREADY_SUBMITTED'};
  if(s.ongoingActions[id])return submitAction(s,id,decisionId,{actionId:'ContinueAction'});
  const prepared=cloneState(s),cmd=prepared.queues[id].shift()!,before=prepared.operations.length;
  const result=submitAction(prepared,id,decisionId,cmd);
  if(result.error)return {state:s,error:result.error,code:result.code};
  result.state.operations[before]={type:'queued',playerId:id,decisionId};return result;
}
export function exportReplay(s:GameState):ReplayData { return copy({version:1,config:s.config,seed:s.seed,players:s.initialPlayers,decisions:s.history,operations:s.operations}); }
/** 외부 리플레이도 제출 검증을 우회하지 않으며 파일 입력은 크기와 형태를 제한한다. */
export function replayGame(replay:ReplayData):GameState {
  if(!replay||replay.version!==1||!Array.isArray(replay.players)||replay.players.length!==2||!Array.isArray(replay.decisions)||replay.decisions.length>100000)throw new Error('지원하지 않는 리플레이 형식입니다.');
  let s=createGame(replay.config,replay.seed,replay.players);
  if(replay.operations!==undefined){
    if(!Array.isArray(replay.operations)||replay.operations.length>250000)throw new Error('리플레이 입력 수가 유효하지 않습니다.');
    for(const operation of replay.operations){
      if(!operation||!validId(operation.playerId))throw new Error('리플레이 플레이어가 유효하지 않습니다.');
      const result=operation.type==='submit'?submitAction(s,operation.playerId,operation.decisionId,operation.command):operation.type==='queue'?queueActions(s,operation.playerId,operation.commands):operation.type==='cancel'?cancelQueue(s,operation.playerId):operation.type==='queued'?submitQueuedAction(s,operation.playerId,operation.decisionId):null;
      if(!result||result.error)throw new Error(result?.error??'알 수 없는 리플레이 입력입니다.');s=result.state;
    }
    if(JSON.stringify(s.history)!==JSON.stringify(replay.decisions))throw new Error('리플레이 명령 기록이 일치하지 않습니다.');
    return s;
  }
  for(const entry of replay.decisions){
    if(!entry||entry.decisionId!==s.decisionId||!entry.commands)throw new Error('리플레이 의사결정 순서가 잘못됐습니다.');
    for(const id of IDS){const result=submitAction(s,id,entry.decisionId,entry.commands[id]);if(result.error)throw new Error(`리플레이 #${entry.decisionId}: ${result.error}`);s=result.state;}
  }
  return s;
}
/** 리플레이 타임라인은 각 동시 명령 직후의 완전한 상태를 다시 계산한다. */
export function replayFrames(replay:ReplayData):GameState[] {
  const frames:GameState[]=[];let s=createGame(replay.config,replay.seed,replay.players);frames.push(s);
  for(const entry of replay.decisions){for(const id of IDS){const result=submitAction(s,id,entry.decisionId,entry.commands[id]);if(result.error)throw new Error(result.error);s=result.state;}frames.push(s);}return frames;
}
export type { DecisionRecord };
