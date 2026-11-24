import { makeGame, active, apply, preview, view, score, RULES, BUILDINGS, isHighBombSurface } from '../../src/lib/ink/engine.mjs';
import { chooseAction } from '../../src/lib/ink/ai.mjs';

const nearest=(items,point)=>items.reduce((a,b)=>Math.hypot(...b.center.map((x,i)=>x-point[i]))<Math.hypot(...a.center.map((x,i)=>x-point[i]))?b:a);
function experiment(variants,settings){
 const results=[];
 for(const variant of variants){
  Object.assign(RULES,variant.rules||{});
  for(const [key,val] of Object.entries(variant.shapes||{}))Object.assign(BUILDINGS[key],val);
  for(const setting of settings){
   let s=makeGame({players:setting.profiles.length,rounds:setting.rounds,factor:setting.factor??4});
   const counts=s.players.map(()=>({})),usedHigh=s.players.map(()=>0),buildings=[],profiles=setting.profiles;
   const start=Date.now();
   let attacks=0,paintCount=0,firstContact=null,forced=0,invalid=0;
   const act=(command)=>{
    const p=active(s),prior=s,pr=preview(s,command);
    if(!pr.ok){invalid++;throw Error(pr.message);}
    const kind=command.kind==='build'?command.building:command.kind==='paint'?command.weapon:'pass';
    counts[p][kind]=(counts[p][kind]??0)+1;
    if(command.kind==='build')buildings.push({owner:p,kind:command.building,round:s.round+1,id:pr.building.id});
    if(command.kind==='paint'&&command.weapon!=='ghost'){
     paintCount++;
     if(pr.affected.some(d=>{const q=prior.surfaces.find(t=>t.id===d.id);return q&&q.owner!==null&&q.owner!==p&&q.density>=RULES.threshold;})){
       attacks++;if(firstContact===null)firstContact=s.round+1;
     }
     if(command.weapon==='bomb'&&command.sourceId){usedHigh[p]++;const q=prior.surfaces.find(t=>t.id===command.sourceId);const b=buildings.find(b=>b.id===q?.building);if(b)b.shots=(b.shots??0)+1;}
    }
    s=apply(s,command);
   };
   if(setting.opening){
    const pid=setting.opening.seat??0,kind=setting.opening.kind;
    while(active(s)!==pid&&s.round===0){const r=chooseAction(view(s),profiles[active(s)],{fast:true});act(r.command);}
    if(active(s)===pid&&s.round===0){
     const base=s.players[pid].base;
     const point=setting.opening.point??[base[0]*.22,0,base[2]*.22];
     const pool=s.surfaces.filter(p=>p.building===null).sort((a,b)=>Math.hypot(...a.center.map((x,i)=>x-point[i]))-Math.hypot(...b.center.map((x,i)=>x-point[i])));
     const c=pool.map(q=>({kind:'build',building:kind,targetId:q.id,rotation:setting.opening.rotation??0})).find(c=>preview(s,c).ok);
     if(c){
      act(c);forced++;
      const b=s.buildings.at(-1);const roofs=s.surfaces.filter(p=>p.building===b.id&&isHighBombSurface(p)).sort((a,b)=>b.center[1]-a.center[1]);
      if(roofs.length&&active(s)===pid){
       const air={kind:'paint',weapon:'air',targetId:roofs[0].id};
       if(preview(s,air).ok){act(air);forced++;}
      }
     }
    }
   }
   while(!s.finished){
    const p=active(s),res=chooseAction(view(s),profiles[p],{fast:setting.fast!==false});
    act(res.command);
   }
   const scores=score(s);const max=Math.max(...scores.scores);const winners=scores.scores.map((v,i)=>Math.abs(v-max)<1e-8?i:-1).filter(i=>i>=0);
   for(const b of buildings){
    const surfaces=s.surfaces.filter(q=>q.building===b.id);
    b.area=surfaces.reduce((a,q)=>a+q.area,0);
    b.ownedArea=surfaces.filter(q=>q.owner===b.owner&&q.density>=RULES.threshold).reduce((a,q)=>a+q.area,0);
    b.enemyArea=surfaces.filter(q=>q.owner!==null&&q.owner!==b.owner&&q.density>=RULES.threshold).reduce((a,q)=>a+q.area,0);
   }
   results.push({variant:variant.name,setting,counts,usedHigh,buildings,scores:scores.scores,coverage:1-scores.neutral/scores.total,attacks,paintCount,firstContact,winners,forced,invalid,ms:Date.now()-start});
  }
 }
 return results;
}

const full=process.argv.includes('--full');
const settings=full?[
  {rounds:8,profiles:['balanced','balanced'],fast:false},
  {rounds:8,profiles:['builder','attack']},
  {rounds:8,profiles:['attack','builder']},
  {rounds:6,profiles:['balanced','attack','builder']},
  {rounds:8,profiles:['balanced','attack','builder','expand']},
  ...Object.keys(BUILDINGS).flatMap(kind=>[0,1].map(seat=>({rounds:8,profiles:['balanced','balanced'],opening:{kind,seat}})))
]:[{rounds:4,profiles:['balanced','balanced']},{rounds:4,profiles:['builder','attack']},{rounds:4,profiles:['attack','builder']}];
const result=experiment([{name:'v0.4',rules:{}}],settings);
console.log(JSON.stringify({rules:RULES,buildings:BUILDINGS,gameCount:result.length,results:result},null,2));
