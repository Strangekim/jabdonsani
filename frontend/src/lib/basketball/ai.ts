import { ACTIONS } from './actions';
import { compactActions, compactCommand } from './compact';
import { getObservation, getPlayer, otherPlayer, submitAction, submitQueuedAction } from './engine';
import { distance, shotProbability } from './formulas';
import type { ActionCommand, ActionId, Difficulty, GameState, PlayerObservation } from './types';
/** 공개 상태만 입력받는 정책. 엔진 시드나 상대의 제출 객체에 접근하지 않는다. */
function visibleNoise(o:PlayerObservation,salt:number):number {
  let x=(o.decisionId*374761393+o.possession*668265263+salt*1274126177+Math.round(o.time*100)+(o.playerId===o.offenseId?17:83))|0;
  x=Math.imul(x^(x>>>13),1274126177);return ((x^(x>>>16))>>>0)/4294967296;
}
export function chooseAIAction(o:PlayerObservation,difficulty:Difficulty='normal'):ActionCommand {
  const me=getPlayer(o,o.playerId),opponent=getPlayer(o,otherPlayer(o.playerId)),offense=o.offenseId===o.playerId;
  const choices=compactActions(o),legal=new Set(choices.map(a=>a.id)),hoop=o.config.hoop,d=distance(me.position,hoop),gap=distance(me.position,opponent.position);
  if(!choices.length)return {actionId:'RecoverBalance'};
  const side=me.position.x<opponent.position.x?'left':me.position.x>opponent.position.x?'right':visibleNoise(o,7)>0.5?'right':'left';
  if(o.ball.status==='loose'||o.ball.status==='rebound')return compactCommand(o,choices[0].id,side);
  const quality=(difficulty==='hard'?0.92:difficulty==='easy'?0.42:0.73)*(0.6+me.attributes.DecisionMaking/250);
  const scores=new Map<ActionId,number>();
  for(const [index,a] of choices.entries())scores.set(a.id,-15+visibleNoise(o,index)*14*(1-quality));
  const set=(id:ActionId,value:number)=>{if(legal.has(id))scores.set(id,(scores.get(id)??0)+value);};
  if(offense){
    const remaining=o.config.maxDribbles-me.dribblesUsed,urgent=o.shotClock<2.3||remaining===0||me.dribbleState==='ended';
    const jumper=shotProbability(me,opponent,{actionId:'JumpShot'},o.config);
    set('JumpShot',26+jumper*19+(urgent?28:0)+(gap>2?9:0)-(d>5&&remaining>0?18:0));
    set('Layup',48+(urgent?14:0)+(me.attributes.Layup-65)/5);
    set('Floater',36+(opponent.attributes.Block>75?8:0)+(urgent?15:0));
    set('NormalDribble',d>4?53:30);set('Crossover',d>3&&gap<2.2?51:31);
    set('RetreatDribble',gap<0.9&&o.shotClock>5?42:15);
    set('RecoverBalance',me.bodyBalance<45&&o.shotClock>3?49:me.stamina<20&&o.shotClock>5?38:0);
  }else{
    const remaining=o.config.maxDribbles-opponent.dribblesUsed,rim=distance(opponent.position,hoop),shotLikely=remaining===0||opponent.dribbleState==='ended'||o.shotClock<2.5;
    if(me.beaten>0.45){set('CloseOut',shotLikely?65:42);set('RetreatStep',shotLikely?20:65);}
    set('HoldPosition',29);set('CutOffDrivingLane',shotLikely?24:45);
    set('CloseOut',gap>2?49:17);set('RetreatStep',gap<0.8&&!shotLikely?32:12);set('ContestShot',shotLikely?53:gap<1.9?35:15);
    set('BlockAttempt',shotLikely&&rim<3&&gap<2?51+(me.attributes.Block-60)/6:12);set('StealAttempt',gap<1.4&&!shotLikely?39+(me.attributes.Steal-opponent.attributes.BallControl)/8:10);set('RecoverBalance',me.bodyBalance<45?54:me.stamina<18?44:0);
  }
  const ranked=[...scores].sort((a,b)=>b[1]-a[1]),variety=visibleNoise(o,71),index=difficulty==='easy'&&variety<0.3?Math.min(3,ranked.length-1):difficulty==='normal'&&variety<0.12?1:0;
  const actionId=ranked[Math.min(index,ranked.length-1)][0],definition=ACTIONS[actionId],command=compactCommand(o,actionId,side);
  if(definition.category==='shot')command.releaseTiming=(visibleNoise(o,44)-0.5)*(1-quality)*0.8;
  return command;
}
export function runAIDecision(s:GameState,difficulty:Difficulty='normal'):GameState {
  if(s.status!=='playing')return s;
  const selected={p1:chooseAIAction(getObservation(s,'p1',0),difficulty),p2:chooseAIAction(getObservation(s,'p2',0),difficulty)};
  const decision=s.decisionId;let next=s;
  for(const id of ['p1','p2'] as const){if(next.decisionId!==decision||next.status!=='playing')break;if(next.submissions[id])continue;const result=next.queues[id].length&&!next.ongoingActions[id]?submitQueuedAction(next,id,decision):submitAction(next,id,decision,selected[id]);if(result.error){const observation=getObservation(next,id,0),fallback=compactActions(observation).find(a=>a.dribbleCost===0);if(!fallback)return next;const retry=submitAction(next,id,decision,compactCommand(observation,fallback.id,'left'));if(retry.error)return next;next=retry.state;}else next=result.state;}
  return next;
}
