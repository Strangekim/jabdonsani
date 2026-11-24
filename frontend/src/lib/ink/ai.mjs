import { apply, preview, score, RULES, BUILDINGS } from './engine.mjs';

export const PROFILES = {
  balanced: { label: '균형형', gain: 1, attack: .8, reach: .75, building: .35, trap: .7, reinforce: .25 },
  expand: { label: '확장형', gain: 1.3, attack: .35, reach: .95, building: .15, trap: .35, reinforce: .18 },
  attack: { label: '공격형', gain: .85, attack: 1.6, reach: .85, building: .2, trap: .95, reinforce: .22 },
  builder: { label: '건축형', gain: .9, attack: .65, reach: 1.05, building: 3.0, trap: .65, reinforce: .3 }
};
const SIZE = 1.5;
const clamp = (v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const d2 = (a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
const flat2 = (a,b)=>(a[0]-b[0])**2+(a[2]-b[2])**2;
const owner = p=>p.density>=RULES.threshold?p.owner:null;
const keyOf = p=>p.map(v=>Math.floor(v/SIZE)).join(':');
const sortHigh = (a,b)=>b.rank-a.rank||a.key.localeCompare(b.key);
const cmdKey = c=>[c.kind,c.weapon,c.building,c.sourceId,c.targetId,c.arc,c.rotation].join(':');

export function fromPublicView(v) {
  // 상대의 잠복 잉크는 후보 생성과 모든 가상 행동에서 제외한다.
  return {
    version:v.version, rulesVersion:1, config:{...v.config}, players:v.players.map(p=>({...p,builds:{...p.builds}})),
    surfaces:v.surfaces.map(({ownTrap,controller,traps,...p})=>({...p,traps:ownTrap?[v.active]:[]})),
    buildings:v.buildings.map(b=>({...b})), round:v.round, slot:v.slot, ap:v.ap, turn:v.turn, finished:v.finished,
    events:[]
  };
}
function makeIndex(s,pid) {
  const bins=new Map(), byId=new Map(), reps=new Map();
  const put=(k,p)=>{if(!bins.has(k))bins.set(k,[]);bins.get(k).push(p);};
  for(const p of s.surfaces){
    put(keyOf(p.center),p);byId.set(p.id,p);
    const k=keyOf(p.center)+':'+(owner(p)??'n')+':'+(p.building??'g')+':'+(p.normal[1]>.4?'top':p.normal[0]>.4?'e':p.normal[0]<-.4?'w':p.normal[2]>.4?'s':'n');
    const old=reps.get(k);
    if(!old||p.area>old.area+1e-8)reps.set(k,p);
  }
  const nearby=(point,r)=>{
    const range=Math.ceil(r/SIZE),[a,b,c]=point.map(v=>Math.floor(v/SIZE)),out=[];
    for(let x=a-range;x<=a+range;x++)for(let y=b-range;y<=b+range;y++)for(let z=c-range;z<=c+range;z++){
      for(const p of bins.get(x+':'+y+':'+z)||[])if(d2(p.center,point)<=r*r+1e-8)out.push(p);
    }
    return out;
  };
  return {byId,reps:[...reps.values()],nearby,pid};
}
function contextAt(idx,p,base,profile) {
  const local=idx.nearby(p.center,1.25);
  let free=0,enemy=0,weak=0,mine=0;
  for(const q of local){
    const o=owner(q);
    if(o===null)free+=q.area;
    else if(o===idx.pid)mine+=q.area;
    else {enemy+=q.area;weak+=q.area/(1+q.density*.25);}
  }
  const near=idx.nearby(p.center,5.05);
  let nearMine=Infinity,nearEnemy=Infinity,brush=null,gun=null,brushRank=-Infinity,gunRank=-Infinity;
  for(const q of near){
    const o=owner(q),d=Math.sqrt(d2(q.center,p.center));
    if(o===idx.pid){
      nearMine=Math.min(nearMine,d);
      if(d>.25&&d<=RULES.brushRange+.01){
        const rank= -Math.abs(d-2.35)+q.center[1]*.07;
        if(rank>brushRank){brush=q;brushRank=rank;}
      }
      if(d>.12&&d<=RULES.gunRange&&q.density>=RULES.gunThreshold){
        const rank=q.center[1]*.55-d*.16;
        if(rank>gunRank){gun=q;gunRank=rank;}
      }
    }else if(o!==null)nearEnemy=Math.min(nearEnemy,d);
  }
  const value=free*profile.gain+weak*profile.attack+enemy*.12-mine*.22;
  const access=nearMine===Infinity?.25:1/(1+nearMine*.25);
  return {p,free,enemy,weak,mine,nearMine,nearEnemy,brush,gun,value,access,baseDistance:Math.sqrt(flat2(base,p.center))};
}
function takeDiverse(rows,count,radius) {
  const out=[],used=new Set(),sorted=rows.sort(sortHigh);
  for(const row of sorted){
    if(used.has(row.key)||out.some(q=>d2(q.center,row.center)<radius*radius))continue;
    out.push(row);used.add(row.key);if(out.length>=count)return out;
  }
  for(const row of sorted){
    if(used.has(row.key))continue;out.push(row);used.add(row.key);
    if(out.length>=count)break;
  }
  return out;
}
function candidateRows(s,profile,small=false) {
  const pid=(s.round+s.slot)%s.players.length,player=s.players[pid],idx=makeIndex(s,pid);
  const groups={brush:[],gun:[],bomb:[],air:[],ghost:[],dome:[],tower:[],wall:[],arch:[]};
  const add=(group,command,rank,center)=>{
    if(Number.isFinite(rank))groups[group].push({command,rank,center,key:cmdKey(command)});
  };
  const late=(s.round+1)/s.config.rounds;
  for(const p of idx.reps){
    const c=contextAt(idx,p,player.base,profile),o=owner(p),targetId=p.id;
    const targetValue=o===null?.65:o===pid?.05:profile.attack*.7;
    if(p.normal[1]>.06)add('air',{kind:'paint',weapon:'air',targetId},c.value+targetValue+(p.center[1]>.4?.65:0)+(c.nearMine>2.5?.3:0),p.center);
    if(c.baseDistance<=RULES.bombRange+.05)add('bomb',{kind:'paint',weapon:'bomb',targetId,arc:'low'},c.value+targetValue,p.center);
    if(s.buildings.length&&c.baseDistance<=RULES.highBombRange+.05)add('bomb',{kind:'paint',weapon:'bomb',targetId,arc:'high'},c.value+targetValue-.08,p.center);
    if(c.brush)add('brush',{kind:'paint',weapon:'brush',sourceId:c.brush.id,targetId},c.value*.7+targetValue+c.access+(p.building?.55:0),p.center);
    if(c.gun)add('gun',{kind:'paint',weapon:'gun',sourceId:c.gun.id,targetId},targetValue+c.value*.45+(o!==null&&o!==pid?Math.min(3,p.density)*.45:0)+(p.center[1]>.4?.45:0),p.center);
    if(player.ghosts>0&&p.owner===null&&!p.traps.includes(pid)&&c.nearMine<=RULES.ghostRange&&c.nearEnemy<=4&&late<.9){
      add('ghost',{kind:'paint',weapon:'ghost',targetId},(4-c.nearEnemy)*.55+c.enemy*.2+p.area+(p.building?.6:0),p.center);
    }
    if(p.building===null&&o!==null&&o!==pid)continue;
    if(p.building!==null||late>=.85||c.nearMine>4.1||c.baseDistance<1.1)continue;
    for(const kind of Object.keys(BUILDINGS)){
      if(!player.builds[kind])continue;
      if(Math.hypot(p.center[0],p.center[2])+BUILDINGS[kind].radius>s.config.radius-.02)continue;
      if(s.buildings.some(b=>Math.hypot(b.x-p.center[0],b.z-p.center[2])<BUILDINGS[kind].radius+BUILDINGS[b.kind].radius+.08))continue;
      const front=c.nearEnemy===Infinity?0:Math.max(0,1-Math.abs(c.nearEnemy-2.4)/3);
      const baseRank=2*c.access+front*.9+c.free*.12-c.mine*.32+(c.baseDistance<4.2?.55:0);
      const orientations=(kind==='wall'||kind==='arch')?[0,1]:[0];
      for(const rotation of orientations)add(kind,{kind:'build',building:kind,targetId,rotation},baseRank,p.center);
    }
  }
  const quotas=small?{brush:5,gun:4,bomb:5,air:5,ghost:2,dome:1,tower:1,wall:1,arch:1}:{brush:10,gun:8,bomb:10,air:10,ghost:4,dome:3,tower:3,wall:4,arch:4};
  const selected=[];
  for(const [group,rows] of Object.entries(groups)){
    selected.push(...takeDiverse(rows,quotas[group],group==='ghost'?.7:group==='gun'?.85:1.2));
  }
  return {selected,idx};
}
function assess(s,p,c,idx,profile,baseScores) {
  const pid=idx.pid,remaining=s.config.rounds-s.round-1+(s.ap-1)*.5;
  const horizon=clamp(remaining/3,0,1);
  const own=p.scores[pid]-baseScores[pid];
  const opponentScores=baseScores.filter((_,i)=>i!==pid);
  const lead=Math.max(...opponentScores);
  let denial=0;
  for(let i=0;i<baseScores.length;i++)if(i!==pid)denial+=Math.max(0,baseScores[i]-p.scores[i])*(.7+.3*(lead?baseScores[i]/lead:0));
  let value=own*profile.gain+denial*profile.attack;
  if(c.kind==='build'){
    const b=p.building;
    let accessible=0,high=0,enemy=0,mine=0;
    for(const q of p.buildSurfaces){
      const nearby=idx.nearby(q.center,3);
      if(nearby.some(v=>owner(v)===pid))accessible+=q.area;
      if(q.normal[1]>.35&&q.center[1]>1)high+=q.area;
    }
    for(const q of idx.nearby([b.x,0,b.z],3)){
      if(owner(q)===pid)mine+=q.area;else if(owner(q)!==null)enemy+=q.area;
    }
    const potential=Math.min(2.5,accessible*.11+high*.32)+Math.min(1.0,enemy*.09);
    return value+horizon*(profile.building*(.8+potential)+profile.reach*high*.14-mine*.03)-.25;
  }
  if(c.weapon==='ghost'){
    const t=idx.byId.get(c.targetId);
    let enemy=0,nearest=5;
    for(const q of idx.nearby(t.center,4))if(owner(q)!==null&&owner(q)!==pid){enemy+=q.area;nearest=Math.min(nearest,Math.sqrt(d2(q.center,t.center)));}
    return horizon*profile.trap*(.12+(4-nearest)*.24+Math.min(.7,enemy*.05)+(t.building?.25:0));
  }
  let weaken=0,secure=0,reach=0,over=0;
  for(const a of p.affected){
    const old=idx.byId.get(a.id);
    if(!old)continue;
    const oldOwner=owner(old),after=a.controller;
    if(old.owner!==null&&old.owner!==pid)weaken+=Math.min(old.density,a.amount)*old.area;
    if(after===pid){
      const oldStrength=oldOwner===pid?Math.min(3.5,old.density):0;
      secure+=Math.max(0,Math.min(3.5,a.density)-oldStrength)*old.area;
      if(oldOwner!==pid){
        const frontier=idx.nearby(old.center,1.5).some(q=>owner(q)!==pid);
        if(frontier)reach+=old.area*(.25+(old.center[1]>.3?.55:0));
      }
      if(a.density>=RULES.gunThreshold&&(oldOwner!==pid||old.density<RULES.gunThreshold))reach+=old.area*(.5+old.center[1]*.18);
      over+=Math.max(0,a.density-Math.max(5,oldOwner===pid?old.density:0))*old.area;
    }
  }
  return value+weaken*.11*profile.attack+horizon*(profile.reach*reach+secure*.14*profile.reinforce-over*.025);
}
function rank(s,profile,small=false){
  const {selected,idx}=candidateRows(s,profile,small);
  const baseScores=score(s).scores,rows=[];
  for(const row of selected){
    const result=preview(s,row.command);if(!result.ok)continue;
    const value=assess(s,result,row.command,idx,profile,baseScores);
    rows.push({...row,value});
  }
  rows.sort((a,b)=>b.value-a.value||a.key.localeCompare(b.key));
  return {rows,count:selected.length};
}
export function chooseAction(publicView,style='balanced',options={}){
  const profile=PROFILES[style]??PROFILES.balanced;
  const s=fromPublicView(publicView);
  if(s.finished||s.ap<=0)return {command:{kind:'pass'},evaluated:0,value:0,planned:[]};
  const first=rank(s,profile,Boolean(options.fast)),rows=first.rows;
  let evaluated=first.count;
  if(!rows.length)return {command:{kind:'pass'},evaluated,value:0,planned:[]};
  if(s.ap===1||options.fast)return {command:rows[0].command,evaluated,value:rows[0].value,planned:[rows[0].command]};
  // 2 AP의 첫 행동이 두 번째 행동의 선택지를 바꾸는 경우를 비교한다.
  const beam=rows.slice(0,3);
  const build=rows.find(r=>r.command.kind==='build');
  if(build&&!beam.includes(build))beam.push(build);
  let best=null;
  for(const r of beam){
    const next=apply(s,r.command,s.version),second=rank(next,profile,true);
    evaluated+=second.count;
    const follow=second.rows[0];
    const value=r.value+(follow?Math.max(0,follow.value)*.9:0);
    if(!best||value>best.value+1e-9)best={command:r.command,value,planned:follow?[r.command,follow.command]:[r.command]};
  }
  return {...best,evaluated};
}
