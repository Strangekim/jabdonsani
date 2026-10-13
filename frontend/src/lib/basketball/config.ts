import type { AttributeKey, Attributes, GameConfig } from './types';
/** 명세에 열거된 능력치는 30개이며 모두 실제 계산 경로에서 사용한다. */
export const ATTRIBUTE_KEYS: AttributeKey[] = ['Speed','Acceleration','Agility','Deceleration','Footwork','BallHandling','BallControl','DribbleSpeed','DribbleProtection','CloseShot','MidRangeShot','LongRangeShot','Layup','Dunk','ShotCreation','PerimeterDefense','LateralQuickness','Steal','Block','ShotContest','DefensiveAwareness','Reaction','Strength','Balance','Vertical','Endurance','BodyControl','Composure','Anticipation','DecisionMaking'];
export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  Speed:'속도',Acceleration:'가속',Agility:'민첩',Deceleration:'감속',Footwork:'풋워크',BallHandling:'볼 핸들링',BallControl:'볼 제어',DribbleSpeed:'드리블 속도',DribbleProtection:'드리블 보호',CloseShot:'근거리 슛',MidRangeShot:'중거리 슛',LongRangeShot:'장거리 슛',Layup:'레이업',Dunk:'덩크',ShotCreation:'슛 창출',PerimeterDefense:'대인 수비',LateralQuickness:'횡이동',Steal:'스틸',Block:'블록',ShotContest:'슛 견제',DefensiveAwareness:'수비 인지',Reaction:'반응',Strength:'힘',Balance:'균형',Vertical:'점프',Endurance:'지구력',BodyControl:'신체 제어',Composure:'침착',Anticipation:'예측',DecisionMaking:'판단',
};
export const DEFAULT_ATTRIBUTES = Object.fromEntries(ATTRIBUTE_KEYS.map(k => [k,65])) as Attributes;
export const DEFAULT_CONFIG: GameConfig = {
  tickDuration:0.1,shotClock:12,maxDribbles:3,targetScore:11,winBy:1,maxScore:21,maxPossessions:300,
  courtWidth:15,courtLength:14,hoop:{x:7.5,y:1.2},arcRadius:6.75,maxQueueLength:6,offensiveReboundClock:6,foulLimit:4,initialOffenseId:'p1',
};
export const PLAYER_PRESETS: {id:string;name:string;description:string;attributes:Attributes}[] = [
  {id:'balanced',name:'올라운더',description:'고른 기술과 체력',attributes:{...DEFAULT_ATTRIBUTES}},
  {id:'guard',name:'핸들러',description:'빠른 방향 전환과 정교한 볼 제어',attributes:{...DEFAULT_ATTRIBUTES,Speed:85,Acceleration:88,Agility:90,Footwork:82,BallHandling:92,BallControl:87,DribbleSpeed:88,DribbleProtection:79,ShotCreation:82,Strength:45,Block:40,Dunk:40,Vertical:60}},
  {id:'shooter',name:'슈터',description:'외곽 슛과 침착한 풋워크',attributes:{...DEFAULT_ATTRIBUTES,CloseShot:80,MidRangeShot:91,LongRangeShot:92,ShotCreation:85,Composure:90,Footwork:83,Speed:60,BallHandling:62,Steal:48,Block:45,Dunk:35}},
  {id:'defender',name:'락다운',description:'간격 제어와 압박 수비',attributes:{...DEFAULT_ATTRIBUTES,PerimeterDefense:92,LateralQuickness:90,Steal:85,ShotContest:90,DefensiveAwareness:90,Reaction:88,Anticipation:85,Endurance:85,LongRangeShot:48,MidRangeShot:54}},
  {id:'finisher',name:'피니셔',description:'강한 몸싸움과 골밑 마무리',attributes:{...DEFAULT_ATTRIBUTES,Strength:94,Vertical:91,Dunk:94,Layup:88,CloseShot:90,BodyControl:86,Block:82,Balance:85,Speed:57,LongRangeShot:35,DribbleSpeed:55}},
];
