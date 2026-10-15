import { ACTIONS } from './actions';
import type { ActionCommand, ActionDefinition, AttributeKey, GameConfig, PlayerState, Vec2 } from './types';
/** 모든 확률의 입력은 연속값이며 난수 발생은 이 파일 밖의 엔진이 담당한다. */
export const clamp = (v:number,min=0,max=1) => Math.max(min,Math.min(max,v));
export const length = (v:Vec2) => Math.hypot(v.x,v.y);
export const distance = (a:Vec2,b:Vec2) => Math.hypot(a.x-b.x,a.y-b.y);
export const subtract = (a:Vec2,b:Vec2):Vec2 => ({x:a.x-b.x,y:a.y-b.y});
export const normalize = (v:Vec2):Vec2 => { const l=length(v); return l>1e-9?{x:v.x/l,y:v.y/l}:{x:0,y:0}; };
export const dot = (a:Vec2,b:Vec2) => a.x*b.x+a.y*b.y;
export const meanAttributes = (p:PlayerState,keys:AttributeKey[]) => keys.reduce((n,k)=>n+p.attributes[k],0)/Math.max(1,keys.length);
export const logistic = (v:number) => 1/(1+Math.exp(-v));
export function performanceFactor(p:PlayerState):number { return (0.58+0.42*p.stamina/100)*(1-0.23*p.fatigue/100)*(0.78+0.22*p.burstEnergy/100); }
export function actionEfficiency(p:PlayerState,a:ActionDefinition):number { return 1.35-0.0045*p.attributes.Endurance-0.002*meanAttributes(p,a.primaryAttributes); }
export function movementSpeed(p:PlayerState,a:ActionDefinition):number {
  const lateral=a.role==='defense' ? (0.62+0.38*p.attributes.LateralQuickness/100) : 1;
  const dribble=a.dribbleCost ? (0.65+0.35*p.attributes.DribbleSpeed/100) : 1;
  const profile=a.id==='RetreatStep'&&p.beaten>0.2?1:a.movementProfile;
  return (2.4+0.044*p.attributes.Speed)*performanceFactor(p)*(0.65+0.35*p.bodyBalance/100)*profile*lateral*dribble;
}
export function balanceRecovery(p:PlayerState):number { return (3+0.07*p.attributes.Balance+0.035*p.attributes.BodyControl)*performanceFactor(p); }
export function reactionDelay(p:PlayerState):number { return (0.43-0.0022*p.attributes.Reaction-0.001*p.attributes.DefensiveAwareness)*(1.35-0.35*performanceFactor(p))+(100-p.bodyBalance)/550; }
export function dribbleControlScore(p:PlayerState,defender:PlayerState,a:ActionDefinition):number {
  const pressure=clamp((2.1-distance(p.position,defender.position))/2.1);
  return clamp((0.34*p.attributes.BallHandling+0.23*p.attributes.BallControl+0.13*p.attributes.DribbleProtection+0.13*p.attributes.BodyControl+0.08*p.attributes.Composure+0.09*p.bodyBalance)*performanceFactor(p)+a.ballControlModifier-pressure*(0.08*defender.attributes.PerimeterDefense+0.04*defender.attributes.Anticipation)-a.difficulty*5,0,100);
}
export function stealProbability(attacker:PlayerState,defender:PlayerState,gap:number,exposure:number):number {
  const attack=0.38*attacker.attributes.BallControl+0.34*attacker.attributes.DribbleProtection+0.16*attacker.attributes.Composure+0.12*attacker.ballControl;
  const defense=(0.55*defender.attributes.Steal+0.23*defender.attributes.Reaction+0.22*defender.attributes.DefensiveAwareness)*performanceFactor(defender);
  return clamp(logistic((defense-attack*performanceFactor(attacker)+exposure-20)/17)*clamp((1.95-gap)/1.4)*(.55+.45*defender.bodyBalance/100),0,0.82);
}
export function contestStrength(attacker:PlayerState,defender:PlayerState,command:ActionCommand,config:GameConfig):number {
  const gap=distance(attacker.position,defender.position);
  const active=defender.recoveryTime>0?0.25:defender.actionState==='ContestShot'?0.78:defender.actionState==='JumpContest'?1.15:defender.actionState==='BlockAttempt'?1.05:['Sprint','CloseOut'].includes(defender.actionState??'')?0.6:0.25;
  const airborne=defender.actionState==='JumpContest'||defender.actionState==='BlockAttempt';
  const timing=clamp(1-Math.abs((command.releaseTiming??0)*0.3+defender.reactionDelay-(airborne?0.17:0.08)),0.3,1);
  const toHoop=normalize(subtract(config.hoop,attacker.position)), toDef=normalize(subtract(defender.position,attacker.position));
  const angle=0.08+0.92*clamp((dot(toHoop,toDef)+1)/2);
  const reach=airborne?2.25+0.006*defender.attributes.Vertical:2.2;
  const closing=clamp(dot(defender.velocity,normalize(subtract(attacker.position,defender.position))),0,5)*0.025;
  return clamp((clamp((reach-gap)/reach)+closing)*(1-0.88*defender.beaten)*active*timing*angle*(0.3+0.007*defender.attributes.ShotContest)*performanceFactor(defender)*(0.6+0.4*defender.bodyBalance/100));
}
export function shotProbability(attacker:PlayerState,defender:PlayerState,command:ActionCommand,config:GameConfig):number {
  const d=distance(attacker.position,config.hoop), a=attacker.attributes, id=command.actionId;
  const baseSkill=d<2.5?a.CloseShot:d<config.arcRadius?a.MidRangeShot:a.LongRangeShot;
  const skill=id==='Dunk'?0.7*a.Dunk+0.18*a.Vertical+0.12*a.Strength:id==='Layup'||id==='ReverseLayup'?0.72*a.Layup+0.28*a.BodyControl:id==='Floater'?0.5*a.CloseShot+0.3*a.Layup+0.2*a.ShotCreation:baseSkill;
  const creation=(id==='StepBackShot'||id==='PullUpJumper')?0.22*a.ShotCreation+0.10*a.Footwork:0.12*a.ShotCreation;
  const movingPenalty=length(attacker.velocity)*(id==='Layup'||id==='Dunk'||id==='ReverseLayup'?0.65:id==='PullUpJumper'?1.5:3.5)*(1-a.BodyControl/150);
  const angle=Math.abs(attacker.position.x-config.hoop.x)/Math.max(1,d);
  const distancePenalty=id==='Dunk'?d*2:id==='Layup'||id==='ReverseLayup'?d*3.5:id==='Floater'?d*3:Math.max(0,d-1.5)*3.1;
  const execution=(skill*0.85+creation+0.10*a.Composure+0.06*a.Balance)*performanceFactor(attacker)+0.13*attacker.bodyBalance-movingPenalty-distancePenalty-angle*3-Math.abs(command.releaseTiming??0)*12;
  return clamp(logistic((execution-48-contestStrength(attacker,defender,command,config)*42)/19),0.025,0.97);
}
export function blockProbability(attacker:PlayerState,defender:PlayerState,command:ActionCommand,config:GameConfig):number {
  if(defender.recoveryTime>0||(defender.actionState!=='BlockAttempt'&&defender.actionState!=='JumpContest'))return 0;
  const gap=distance(attacker.position,defender.position), a=defender.attributes;
  const reach=clamp((2.35+0.004*a.Vertical-gap)/2.1);
  const timing=clamp(1-Math.abs((command.releaseTiming??0)*0.3+defender.reactionDelay-0.18)*2,0,1);
  const offense=0.38*attacker.attributes.ShotCreation+0.27*attacker.attributes.BodyControl+0.2*attacker.attributes.Composure+0.15*attacker.attributes.Vertical;
  const defense=(0.58*a.Block+0.25*a.Vertical+0.17*a.Reaction)*performanceFactor(defender);
  const reverse=command.actionId==='ReverseLayup'?0.62:1;
  const rimAngle=dot(normalize(subtract(config.hoop,attacker.position)),normalize(subtract(defender.position,attacker.position)));
  return clamp(logistic((defense-offense-19)/19)*reach*timing*(0.5+0.5*defender.bodyBalance/100)*(defender.actionState==='JumpContest'?0.55:1)*reverse*(0.08+0.92*clamp(rimAngle))*(1-0.95*defender.beaten),0,0.72);
}
/** 저숙련 페이크/예측도 대칭적인 능력치 경합이며 슛 확률 자체에 보너스를 더하지 않는다. */
export function fakeAdvantage(attacker:PlayerState,defender:PlayerState,definition:ActionDefinition):number {
  return (meanAttributes(attacker,definition.primaryAttributes)*performanceFactor(attacker)+0.2*attacker.attributes.DecisionMaking)-(0.35*defender.attributes.Anticipation+0.3*defender.attributes.Reaction+0.2*defender.attributes.DefensiveAwareness+0.15*defender.attributes.DecisionMaking)*performanceFactor(defender);
}
export function actionDuration(p:PlayerState,command:ActionCommand):number {
  const definitions=[ACTIONS[command.actionId],...(command.combo??[]).map(id=>ACTIONS[id])];
  return definitions.reduce((t,a)=>t+a.duration*(1.18-meanAttributes(p,a.primaryAttributes)/300)*(1.12-0.12*performanceFactor(p)),0)+p.recoveryTime;
}
