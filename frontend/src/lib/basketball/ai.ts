import { ACTIONS } from './actions';
import { getObservation, getPlayer, otherPlayer, submitAction, submitQueuedAction } from './engine';
import { distance, length, normalize, shotProbability, subtract } from './formulas';
import type { ActionCommand, ActionId, Difficulty, GameState, PlayerObservation } from './types';
/** 공개 상태만 입력받는 정책. 엔진 시드나 상대의 제출 객체에 접근하지 않는다. */
function visibleNoise(o:PlayerObservation,salt:number):number {
  let x=(o.decisionId*374761393+o.possession*668265263+salt*1274126177+Math.round(o.time*100)+(o.playerId===o.offenseId?17:83))|0;
  x=Math.imul(x^(x>>>13),1274126177);return ((x^(x>>>16))>>>0)/4294967296;
}
export function chooseAIAction(o:PlayerObservation,difficulty:Difficulty='normal'):ActionCommand {
  const me=getPlayer(o,o.playerId),opponent=getPlayer(o,otherPlayer(o.playerId)),offense=o.offenseId===o.playerId;
  const legal=new Set(o.legalActions.map(a=>a.id)),hoop=o.config.hoop,d=distance(me.position,hoop),gap=distance(me.position,opponent.position);
  if(!o.legalActions.length)return {actionId:'RecoverBalance'};
  if(legal.has('ContinueAction'))return {actionId:'ContinueAction'};
  if(o.ball.status==='loose'||o.ball.status==='rebound')return {actionId:legal.has(o.ball.status==='rebound'?'Rebound':'RecoverBall')?(o.ball.status==='rebound'?'Rebound':'RecoverBall'):o.legalActions[0].id,direction:normalize(subtract(o.ball.position,me.position)),speed:0.95};
  const quality=(difficulty==='hard'?0.92:difficulty==='easy'?0.42:0.73)*(0.6+me.attributes.DecisionMaking/250);
  const scores=new Map<ActionId,number>();
  for(const a of o.legalActions)scores.set(a.id,-15+visibleNoise(o,o.legalActions.indexOf(a))*14*(1-quality));
  const set=(id:ActionId,value:number)=>{if(legal.has(id))scores.set(id,(scores.get(id)??0)+value);};
  let direction:ActionCommand['direction'];
  if(offense){
    const remaining=o.config.maxDribbles-me.dribblesUsed,urgent=o.shotClock<2.3||remaining===0||me.dribbleState==='ended';
    const jumper=shotProbability(me,opponent,{actionId:'JumpShot'},o.config);
    set('JumpShot',26+jumper*19+(urgent?28:0)+(gap>2?9:0)-(d>5&&remaining>0?18:0));
    set('StandingShot',24+jumper*18+(urgent?26:0)+(length(me.velocity)<0.5?4:-5));
    set('PullUpJumper',23+jumper*18+(urgent?24:0)+(length(me.velocity)>0.6?6:0));
    set('Layup',48+(urgent?14:0)+(me.attributes.Layup-65)/5);set('ReverseLayup',44+(gap<1.4?6:0)+(me.attributes.BodyControl-65)/7);
    set('Dunk',44+(me.attributes.Dunk-55)/3+(gap<1?0:7));set('Floater',36+(opponent.attributes.Block>75?8:0)+(urgent?15:0));
    set('NormalDribble',d>4?53:30);set('SpeedDribble',d>4&&gap>1.6?57:27);set('Crossover',d>3&&gap<2.2?51:31);set('BehindTheBack',gap<1.2?48:30);
    set('ProtectedDribble',gap<1.2?51:30);set('BetweenTheLegs',gap<1.6?47:31);set('Hesitation',remaining>1&&gap<1.7?45:31);set('InAndOut',remaining>1?42:30);set('SpinMove',gap<1.3&&me.attributes.BallHandling>78?49:25);
    set('RetreatDribble',gap<0.9&&o.shotClock>5?42:15);set('PumpFake',gap<1.3&&o.shotClock>4?33:9);set('StepBackShot',gap<1.3?45:26);set('JabStep',me.dribbleState==='ready'&&gap<1.4?30:8);
    set('RecoverBalance',me.bodyBalance<45&&o.shotClock>3?49:me.stamina<20&&o.shotClock>5?38:0);
    const side=me.position.x<opponent.position.x?-1:me.position.x>opponent.position.x?1:visibleNoise(o,7)>0.5?1:-1;
    direction=normalize({x:hoop.x-me.position.x+(gap<2?side*2.5:0),y:hoop.y-me.position.y});
  }else{
    const remaining=o.config.maxDribbles-opponent.dribblesUsed,rim=distance(opponent.position,hoop),shotLikely=remaining===0||opponent.dribbleState==='ended'||o.shotClock<2.5;
    set('HoldPosition',29);set('CutOffDrivingLane',shotLikely?24:45);set('AnticipateDirection',shotLikely?17:33);set('ShadeLeft',opponent.ballHand==='left'?38:28);set('ShadeRight',opponent.ballHand==='right'?38:28);
    set('CloseOut',gap>2?49:17);set('ForwardStep',gap>1.8?40:15);set('RetreatStep',gap<0.8&&!shotLikely?32:12);set('ContestShot',shotLikely?53:gap<1.9?35:15);set('JumpContest',shotLikely&&gap<2.2?52:14);
    set('BlockAttempt',shotLikely&&rim<3&&gap<2?51+(me.attributes.Block-60)/6:12);set('StealAttempt',gap<1.4&&!shotLikely?39+(me.attributes.Steal-opponent.attributes.BallControl)/8:10);set('ReachIn',gap>1.3&&gap<1.8&&!shotLikely?34:9);set('BodyUp',gap<1&&!shotLikely?38:13);set('RecoverBalance',me.bodyBalance<45?54:me.stamina<18?44:0);
  }
  const ranked=[...scores].sort((a,b)=>b[1]-a[1]),variety=visibleNoise(o,71),index=difficulty==='easy'&&variety<0.3?Math.min(3,ranked.length-1):difficulty==='normal'&&variety<0.12?1:0;
  const actionId=ranked[index][0],definition=ACTIONS[actionId],command:ActionCommand={actionId,speed:me.burstEnergy<20?0.6:difficulty==='easy'?0.7:0.9};
  if(offense&&definition.category==='dribble'&&actionId!=='RetreatDribble')command.direction=direction;
  if(!offense){command.desiredGap=opponent.dribbleState==='ended'?0.9:1.25;command.anticipatedDirection=normalize(subtract(hoop,opponent.position));}
  if(definition.category==='shot')command.releaseTiming=(visibleNoise(o,44)-0.5)*(1-quality)*0.8;
  return command;
}
export function runAIDecision(s:GameState,difficulty:Difficulty='normal'):GameState {
  if(s.status!=='playing')return s;
  const selected={p1:chooseAIAction(getObservation(s,'p1',0),difficulty),p2:chooseAIAction(getObservation(s,'p2',0),difficulty)};
  const decision=s.decisionId;let next=s;
  for(const id of ['p1','p2'] as const){if(next.decisionId!==decision||next.status!=='playing')break;if(next.submissions[id])continue;const result=next.queues[id].length&&!next.ongoingActions[id]?submitQueuedAction(next,id,decision):submitAction(next,id,decision,selected[id]);if(result.error){const fallback=getObservation(next,id,0).legalActions.find(a=>a.dribbleCost===0);if(!fallback)return next;const retry=submitAction(next,id,decision,{actionId:fallback.id});if(retry.error)return next;next=retry.state;}else next=result.state;}
  return next;
}
