import { EXPERIMENT, RULES, makeGame, preview, apply, view, active, score } from './engine.mjs';
import { chooseAction } from './ai.mjs';

const DEFAULT_EXPERIMENT={...EXPERIMENT},DEFAULT_RULES={...RULES};
function configure(variant){
  Object.assign(EXPERIMENT,DEFAULT_EXPERIMENT,variant.experiment??{});
  Object.assign(RULES,DEFAULT_RULES,variant.rules??{});
}
function nearest(items,point){
  return items.reduce((best,p)=>!best||Math.hypot(...p.center.map((x,i)=>x-point[i]))<Math.hypot(...best.center.map((x,i)=>x-point[i]))?p:best,null);
}
function runGame(variant,setting){
  configure(variant);
  const players=setting.profiles.length;
  let s=makeGame({players,rounds:setting.rounds,factor:setting.factor??5});
  const counts=s.players.map(()=>({})),structures=[],perWeapon={},turnHistory=[],shotsByBuilding={},regions=[];
  let attackCount=0,paintCount=0,firstContact=null,highShots=0,forced=0,traps=0,trapArea=0,trapInk=0,trapStoredInk=0,trapRegionsTriggered=0,ghostPlacements=[];
  const started=Date.now(),initialArea=score(s).total;
  const act=(command,forcedAction=false)=>{
    const pid=active(s),p=preview(s,command);
    if(!p.ok)throw Error(JSON.stringify({command,message:p.message,round:s.round,variant:variant.name}));
    const label=command.kind==='build'?command.building:command.kind==='paint'?command.weapon:'pass';
    counts[pid][label]=(counts[pid][label]??0)+1;
    const before=score(s).scores,byId=new Map(s.surfaces.map(q=>[q.id,q]));
    if(command.kind==='build'){
      structures.push({id:p.building.id,kind:command.building,owner:pid,round:s.round+1,turn:s.turn,forced:forcedAction,position:[p.building.x,p.building.z],paintApBefore:s.ap});
    }else if(command.kind==='paint'&&command.weapon!=='ghost'){
      paintCount++;
      const v=perWeapon[label]??={count:0,areaGain:0,enemyLoss:0,inkMass:0,hits:0,rays:0,buildingInk:0,buildingHits:0};
      v.count++;
      v.areaGain+=p.scores[pid]-before[pid];
      v.enemyLoss+=before.reduce((sum,x,i)=>i===pid?sum:sum+Math.max(0,x-p.scores[i]),0);
      let attacked=false;
      for(const d of p.affected){
        const q=byId.get(d.id),mass=d.amount*q.area;v.inkMass+=mass;
        if(q.building!==null){v.buildingInk+=mass;v.buildingHits++;}
        if(q.owner!==null&&q.owner!==pid&&q.density>=RULES.threshold)attacked=true;
      }
      if(attacked){attackCount++;if(firstContact===null)firstContact=s.round+1;}
      if(p.rayStats){v.hits+=p.rayStats.hitCount;v.rays+=p.rayStats.rays;}
      if(command.weapon==='bomb'&&command.sourceId){highShots++;const b=byId.get(command.sourceId)?.building;if(b)(shotsByBuilding[b]??=Array(players).fill(0))[pid]++;}
    }
    if(command.kind==='paint'&&command.weapon==='ghost')ghostPlacements.push({player:pid,round:s.round+1,area:p.ghostArea??0,patches:p.ghostIds.length,target:command.targetId});
    if(forcedAction)forced++;
    const round=s.round+1;
    s=apply(s,command);
    const event=s.events.at(-1);traps+=event.triggered;trapArea+=event.trapArea??0;trapInk+=event.trapInk??0;trapStoredInk+=event.trapStoredInk??0;trapRegionsTriggered+=event.trapRegionsTriggered??0;
    if(s.round+1!==round||s.finished){const t=score(s);turnHistory.push({round,scores:t.scores,coverage:1-t.neutral/t.total});}
  };
  if(setting.opening){
    const {kind,seat=0}=setting.opening;
    while(active(s)!==seat&&s.round===0)act(chooseAction(view(s),setting.profiles[active(s)],{fast:true}).command);
    if(active(s)===seat&&s.round===0){
      const b=s.players[seat].base,point=setting.opening.point??[b[0]*.32,0,b[2]*.32];
      const targets=s.surfaces.filter(p=>p.building===null).sort((a,b)=>Math.hypot(...a.center.map((x,i)=>x-point[i]))-Math.hypot(...b.center.map((x,i)=>x-point[i])));
      const cmd=targets.map(p=>({kind:'build',building:kind,targetId:p.id,rotation:setting.opening.rotation??0})).find(c=>preview(s,c).ok);
      if(!cmd)throw Error('No legal opening');
      act(cmd,true);
      if(setting.opening.follow==='air'&&active(s)===seat){
        const building=s.buildings.at(-1);
        const roofs=s.surfaces.filter(p=>p.building===building.id&&p.normal[1]>.1);
        const candidates=roofs.filter((p,i)=>i%Math.max(1,Math.ceil(roofs.length/18))===0).flatMap(p=>(EXPERIMENT.patterns==='rays'?[0,1,2,3]:[0]).map(rotation=>({kind:'paint',weapon:'air',targetId:p.id,rotation})));
        let best=null,rank=-Infinity;
        for(const command of candidates){
          const p=preview(s,command);if(!p.ok)continue;
          const byId=new Map(s.surfaces.map(q=>[q.id,q]));
          const area=p.affected.reduce((v,d)=>v+(d.controller===seat&&byId.get(d.id)?.building===building.id?byId.get(d.id).area:0),0);
          const value=area+(p.scores[seat]-score(s).scores[seat])*.25;
          if(value>rank){best=command;rank=value;}
        }
        if(best)act(best,true);
      }
    }
  }
  let guard=0;
  while(!s.finished){
    if(++guard>players*(setting.rounds*2+EXPERIMENT.constructionCredits)+1)throw Error('turn loop');
    const result=chooseAction(view(s),setting.profiles[active(s)],{fast:setting.fast!==false});
    act(result.command);
  }
  const t=score(s),max=Math.max(...t.scores);
  for(const b of structures){
    const patches=s.surfaces.filter(q=>q.building===b.id);
    b.area=patches.reduce((a,q)=>a+q.area,0);
    b.ownerArea=patches.filter(q=>q.owner===b.owner&&q.density>=RULES.threshold).reduce((a,q)=>a+q.area,0);
    b.enemyArea=patches.filter(q=>q.owner!==null&&q.owner!==b.owner&&q.density>=RULES.threshold).reduce((a,q)=>a+q.area,0);
    b.shotsByPlayer=shotsByBuilding[b.id]??Array(players).fill(0);
    b.shots=b.shotsByPlayer.reduce((a,b)=>a+b,0);
  }
  return {variant:variant.name,setting,constructionCredits:EXPERIMENT.constructionCredits,creditsRemaining:s.players.map(p=>p.constructionCredits),diameter:s.config.radius*2,initialArea,counts,structures,highShots,paintCount,attackCount,firstContact,traps,trapArea,trapInk,trapStoredInk,trapRegionsTriggered,ghostPlacements,forced,perWeapon,coverage:1-t.neutral/t.total,scores:t.scores,winners:t.scores.map((v,i)=>Math.abs(v-max)<1e-7?i:-1).filter(i=>i>=0),turnHistory,ms:Date.now()-started};
}
function summarize(x){
  return {variant:x.variant,profiles:x.setting.profiles,rounds:x.setting.rounds,factor:x.setting.factor,opening:x.setting.opening,diameter:x.diameter,counts:x.counts,builds:x.structures.map(b=>[b.owner,b.kind,b.shots]),high:x.highShots,scores:x.scores.map(n=>+n.toFixed(2)),coverage:+x.coverage.toFixed(3),contact:x.firstContact,attacks:x.attackCount,paints:x.paintCount,traps:x.traps,trapArea:+x.trapArea.toFixed(2),trapInk:+x.trapInk.toFixed(2),ghosts:x.ghostPlacements.map(p=>[p.player,p.round,+p.area.toFixed(2)]),perWeapon:Object.fromEntries(Object.entries(x.perWeapon).map(([k,v])=>[k,{n:v.count,avgGain:+(v.areaGain/v.count).toFixed(2),avgInk:+(v.inkMass/v.count).toFixed(2)}])),ms:x.ms};
}

const selected={name:'disk-splash-65',experiment:{bombPattern:'disk',bombDownFraction:.65,bombGroundRadius:1.25,airLength:2.8,airWidth:1,airEmit:3.2,brushLength:3}};
const quick={rounds:10,factor:5,profiles:['balanced','balanced']};
const separate={name:'C-separate-credits',experiment:{...selected.experiment,constructionCredits:2}};
const comparison=[['balanced','balanced'],['builder','attack'],['attack','builder'],['expand','balanced'],['balanced','expand']].flatMap(profiles=>[{...selected,name:'A-shared-AP'},separate].map(v=>[v,{...quick,profiles}]));
const gunBoost={gunOriginOffset:.65,gunEmit:10,gunFan:.34,gunPitch:.10,gunHeightBonus:1};
const weaponVariants=[
  {name:'G1-T1',experiment:{...separate.experiment,...gunBoost,ghostRadius:1.35,ghostOwn:true,ghostMaxArea:5},rules:{gunRange:6.5,gunThreshold:1.2,ghostRange:3}},
  {name:'G1-T2',experiment:{...separate.experiment,...gunBoost,ghostRadius:1.7,ghostOwn:true,ghostMaxArea:8,ghostStoredDensity:1},rules:{gunRange:6.5,gunThreshold:1.2,ghostRange:3.5}},
  {name:'G1-T3-region',experiment:{...separate.experiment,...gunBoost,ghostRadius:1.7,ghostOwn:true,ghostMaxArea:8,ghostStoredDensity:.8,ghostBurstRegion:true},rules:{gunRange:6.5,gunThreshold:1.2,ghostRange:3.5}}
];
const weaponJobs=[...weaponVariants.map(v=>[v,quick]),...[[ 'builder','attack'],['attack','builder']].map(profiles=>[weaponVariants[2],{...quick,profiles}])];
const jobs=process.argv.includes('--weapons')?weaponJobs:process.argv.includes('--credits')?comparison:process.argv.includes('--full')?[
  ...[
    {name:'old-shapes-old-patterns',experiment:{shapes:'old',patterns:'legacy'}},
    {name:'new-shapes-old-patterns',experiment:{shapes:'new',patterns:'legacy'}},
    {name:'new-shapes-rays',experiment:{shapes:'new',patterns:'rays'}},
    {name:'downward-weighted-bomb',experiment:{bombDownBias:.45,airLength:2.5,airWidth:.85,airEmit:2.8,brushLength:3.25}},
    {name:'wide-weighted-bomb',experiment:{bombDownBias:.6,bombBurstHeight:.8,bombRayLength:1.9,airLength:2.5,airWidth:.85,airEmit:2.8,brushLength:3.25}},
    {name:'disk-splash-55',experiment:{...selected.experiment,bombDownFraction:.55,bombGroundRadius:1.2}},
    selected
  ].map(v=>[v,quick]),
  ...['ramp','canopy','basin','tunnel','tower'].map(kind=>[selected,{...quick,opening:{kind,seat:0,follow:'air'}}]),
  [selected,{rounds:9,factor:5,profiles:['balanced','attack','builder']}],
  ...[4,6].map(factor=>[selected,{...quick,factor}]),
  [selected,{rounds:8,factor:5,profiles:['balanced','attack','builder','expand']}],
  [{...selected,name:'disk-splash-65-standard'},{...quick,fast:false}]
]:[[selected,quick]];
const results=[];
for(const [variant,setting] of jobs){
  const result=runGame(variant,setting);results.push(result);console.error(JSON.stringify(summarize(result)));
}
console.log(JSON.stringify(results,null,2));
