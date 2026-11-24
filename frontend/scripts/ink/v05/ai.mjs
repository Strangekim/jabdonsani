import { apply, preview, score, RULES, BUILDINGS, gunRangeAt, bombRangeAt, canLaunchBomb, isHighBombSurface, getBombControl, bombRadiusAt, EXPERIMENT, canBuildNow, ghostEligible } from './engine.mjs';

export const PROFILES = {
  balanced: { label: '균형형', gain: 1, attack: .8, reach: .75, building: .75, trap: .7, reinforce: .25 },
  expand: { label: '확장형', gain: 1.3, attack: .35, reach: .95, building: .55, trap: .35, reinforce: .18 },
  attack: { label: '공격형', gain: .85, attack: 1.6, reach: .85, building: .65, trap: .95, reinforce: .22 },
  builder: { label: '건축형', gain: .9, attack: .65, reach: 1.05, building: 1.35, trap: .65, reinforce: .3 }
};
const SIZE = 1.5;
const clamp = (v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const d2 = (a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
const flat2 = (a,b)=>(a[0]-b[0])**2+(a[2]-b[2])**2;
const owner = p=>p.density>=RULES.threshold?p.owner:null;
const keyOf = p=>p.map(v=>Math.floor(v/SIZE)).join(':');
const sortHigh = (a,b)=>b.rank-a.rank||a.key.localeCompare(b.key);
const cmdKey = c=>[c.kind,c.weapon,c.building,c.sourceId,c.targetId,c.arc,c.rotation,c.viaId].join(':');

export function fromPublicView(v) {
  // 상대의 잠복 잉크는 후보 생성과 모든 가상 행동에서 제외한다.
  return {
    version:v.version, rulesVersion:1, config:{...v.config}, players:v.players.map(p=>({...p,builds:{...p.builds}})),
    surfaces:v.surfaces.map(({ownTrap,controller,traps,...p})=>({...p,traps:ownTrap?[v.active]:[]})),
    buildings:v.buildings.map(b=>({...b})), ghostRegions:(v.ownGhostRegions??[]).map(g=>({...g,ids:[...g.ids]})), round:v.round, slot:v.slot, ap:v.ap, turn:v.turn, finished:v.finished,
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
  const representatives=[...reps.values()];
  const elevatedGun=representatives.filter(p=>owner(p)===pid&&p.center[1]>.1&&p.density>=RULES.gunThreshold);
  const controls=getBombControl(s.surfaces);
  const highBomb=representatives.filter(p=>canLaunchBomb(p,pid,controls));
  const seen=new Set(highBomb.map(p=>p.building));
  for(const p of s.surfaces)if(canLaunchBomb(p,pid,controls)&&!seen.has(p.building)){highBomb.push(p);seen.add(p.building);}
  return {byId,reps:representatives,nearby,pid,elevatedGun,highBomb,controls};
}
function contextAt(idx,p,base,profile) {
  const local=idx.nearby(p.center,RULES.bombRadius);
  let free=0,enemy=0,weak=0,mine=0;
  for(const q of local){
    const o=owner(q);
    if(o===null)free+=q.area;
    else if(o===idx.pid)mine+=q.area;
    else {enemy+=q.area;weak+=q.area/(1+q.density*.25);}
  }
  const near=idx.nearby(p.center,Math.max(5.05,RULES.gunRange+.05,RULES.ghostRange+1));
  let nearMine=Infinity,nearEnemy=Infinity,brush=null,gun=null,brushRank=-Infinity,gunRank=-Infinity;
  for(const q of near){
    const o=owner(q),d=Math.sqrt(d2(q.center,p.center));
    if(o===idx.pid){
      nearMine=Math.min(nearMine,d);
      if(d>.25&&d<=(EXPERIMENT.patterns==='rays'?EXPERIMENT.brushLength:RULES.brushRange)+.01){
        const rank= -Math.abs(d-(EXPERIMENT.patterns==='rays'?2.8:2.35))+q.center[1]*.07;
        if(rank>brushRank){brush=q;brushRank=rank;}
      }
      if(d>.12&&d<=gunRangeAt(q)&&q.density>=RULES.gunThreshold){
        const rank=EXPERIMENT.gunOriginOffset>.12?q.center[1]*.35-Math.abs(d-Math.min(3.8,gunRangeAt(q)*.7))*.28:q.center[1]*.55-d*.16;
        if(rank>gunRank){gun=q;gunRank=rank;}
      }
    }else if(o!==null)nearEnemy=Math.min(nearEnemy,d);
  }
  for(const q of idx.elevatedGun){
    const d=Math.sqrt(d2(q.center,p.center));
    if(d>.12&&d<=gunRangeAt(q)){
      const rank=EXPERIMENT.gunOriginOffset>.12?q.center[1]*.35-Math.abs(d-Math.min(3.8,gunRangeAt(q)*.7))*.28:q.center[1]*.55-d*.16;
      if(rank>gunRank){gun=q;gunRank=rank;}
    }
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
  const groups={brush:[],gun:[],bomb:[],highbomb:[],air:[],ghost:[],...Object.fromEntries(Object.keys(player.builds).map(k=>[k,[]]))};
  const add=(group,command,rank,center)=>{
    if(Number.isFinite(rank))groups[group].push({command,rank,center,key:cmdKey(command)});
  };
  const late=(s.round+1)/s.config.rounds;
  const buildAllowed=canBuildNow(s,pid);
  for(const p of idx.reps){
    const c=contextAt(idx,p,player.base,profile),o=owner(p),targetId=p.id;
    const targetValue=o===null?.65:o===pid?.05:profile.attack*.7;
    if(p.normal[1]>.06){
      const control=idx.controls.get(p.building);
      let roof=0;
      if(control&&control.controller!==pid){
        const local=idx.nearby(p.center,RULES.airRadius+1.2);
        roof=local.filter(q=>q.building===p.building&&isHighBombSurface(q)&&owner(q)!==pid&&flat2(q.center,p.center)<=RULES.airRadius**2).reduce((sum,q)=>sum+q.area,0);
        roof=Math.min(2.2,roof/Math.max(.1,control.total)*3);
      }
      const rotations=EXPERIMENT.patterns==='rays'?[0,1,2,3]:[0];
      for(const rotation of rotations){
        let bandValue=0;
        if(EXPERIMENT.patterns==='rays'){
          const angle=rotation*Math.PI/4,ca=Math.cos(angle),sa=Math.sin(angle);
          for(const q of idx.nearby(p.center,2.3)){
            if(q.normal[1]<.06||Math.abs(q.center[1]-p.center[1])>1.1)continue;
            const dx=q.center[0]-p.center[0],dz=q.center[2]-p.center[2];
            if(Math.abs(dx*ca+dz*sa)>EXPERIMENT.airLength/2||Math.abs(-dx*sa+dz*ca)>EXPERIMENT.airWidth/2)continue;
            const o=owner(q);bandValue+=q.area*(o===null?profile.gain:o===pid?-.2:profile.attack/(1+q.density*.2));
          }
        }
        add('air',{kind:'paint',weapon:'air',targetId,rotation},c.value*.6+bandValue+targetValue+(p.center[1]>.4?.65:0)+(c.nearMine>2.5?.3:0)+roof,p.center);
      }
    }
    if(c.baseDistance<=RULES.bombRange+.05)add('bomb',{kind:'paint',weapon:'bomb',targetId,arc:'low'},c.value+targetValue,p.center);
    if(s.buildings.length&&c.baseDistance<=RULES.highBombRange+.05)add('bomb',{kind:'paint',weapon:'bomb',targetId,arc:'high'},c.value+targetValue-.08,p.center);
    let highSource=null,highRank=-Infinity;
    for(const q of idx.highBomb){
      const distance=Math.sqrt(flat2(q.center,p.center));
      if(distance>bombRangeAt(q,'low')+.05||distance<.25)continue;
      const rank=q.center[1]*.3-distance*.05;
      if(rank>highRank){highRank=rank;highSource=q;}
    }
    if(highSource){
      add('highbomb',{kind:'paint',weapon:'bomb',sourceId:highSource.id,targetId,arc:'low'},c.value+targetValue+.15,p.center);
      if(Math.sqrt(flat2(highSource.center,p.center))<=bombRangeAt(highSource,'high')+.05)
        add('highbomb',{kind:'paint',weapon:'bomb',sourceId:highSource.id,targetId,arc:'high'},c.value+targetValue+.07,p.center);
    }
    if(c.brush)add('brush',{kind:'paint',weapon:'brush',sourceId:c.brush.id,targetId},c.value*.7+targetValue+c.access+(p.building?.55:0),p.center);
    if(c.gun)add('gun',{kind:'paint',weapon:'gun',sourceId:c.gun.id,targetId},targetValue+c.value*.45+(o!==null&&o!==pid?Math.min(3,p.density)*.45:0)+(p.center[1]>.4?.45:0),p.center);
    if(player.ghosts>0&&ghostEligible(p,pid)&&c.nearMine<=RULES.ghostRange&&c.nearEnemy<=(EXPERIMENT.ghostRadius>0?5:4)&&late<.9){
      let area=0;
      if(EXPERIMENT.ghostRadius>0)area=idx.nearby(p.center,EXPERIMENT.ghostRadius).filter(q=>q.building===p.building&&ghostEligible(q,pid)).reduce((sum,q)=>sum+q.area,0);
      add('ghost',{kind:'paint',weapon:'ghost',targetId},(5-c.nearEnemy)*.55+c.enemy*.2+Math.min(EXPERIMENT.ghostMaxArea,area)*.5+p.area+(p.building?.6:0),p.center);
    }
    if(p.building===null&&o!==null&&o!==pid)continue;
    if(!buildAllowed||p.building!==null||late>=.85||c.nearMine>4.8||c.baseDistance<1.1)continue;
    for(const kind of Object.keys(BUILDINGS)){
      if(!player.builds[kind])continue;
      if(Math.hypot(p.center[0],p.center[2])+BUILDINGS[kind].radius>s.config.radius-.02)continue;
      if(s.buildings.some(b=>Math.hypot(b.x-p.center[0],b.z-p.center[2])<BUILDINGS[kind].radius+BUILDINGS[b.kind].radius+.08))continue;
      const front=c.nearEnemy===Infinity?0:Math.max(0,1-Math.abs(c.nearEnemy-2.4)/3);
      const baseRank=2*c.access+front*.9+c.free*.12-c.mine*.32+Math.min(1,c.baseDistance*.18);
      const orientations=['wall','arch','ramp','canopy','tunnel'].includes(kind)?[0,1]:[0];
      for(const rotation of orientations)add(kind,{kind:'build',building:kind,targetId,rotation},baseRank,p.center);
    }
  }
  const quotas=small?{brush:5,gun:5,bomb:5,highbomb:4,air:6,ghost:EXPERIMENT.ghostRadius>0?5:2}:{brush:10,gun:10,bomb:10,highbomb:7,air:12,ghost:EXPERIMENT.ghostRadius>0?8:4};
  const selected=[];
  for(const [group,rows] of Object.entries(groups)){
    selected.push(...takeDiverse(rows,quotas[group]??(small?2:4),group==='ghost'?.7:group==='gun'?.85:1.2));
  }
  return {selected,idx};
}
function assess(s,p,c,idx,profile,baseScores) {
  const pid=idx.pid,remaining=s.config.rounds-s.round-1+(s.ap-1)*.5;
  const horizon=clamp(remaining/3,0,1);
  const own=p.scores[pid]-baseScores[pid];
  const base=s.players[pid].base;
  // 기존 본진과 확보된 고지대에서 닿지 않는 표면만 추가 거점 가치로 평가한다.
  const extension=(q,skipBuilding=null)=>{
    const range=bombRangeAt(q,'low'),binRadius=range;
    let benefit=0;
    for(const t of idx.nearby(q.center,binRadius+q.center[1])){
      if(t.building!==null||owner(t)===pid||flat2(t.center,q.center)>range*range)continue;
      if(flat2(t.center,base)<=RULES.bombRange**2)continue;
      if(idx.highBomb.some(b=>b.building!==skipBuilding&&flat2(t.center,b.center)<=bombRangeAt(b,'low')**2))continue;
      benefit+=t.area*(owner(t)===null?.65:1);
    }
    return Math.min(3.2,benefit*.045);
  };
  const opponentScores=baseScores.filter((_,i)=>i!==pid);
  const lead=Math.max(...opponentScores);
  let denial=0;
  for(let i=0;i<baseScores.length;i++)if(i!==pid)denial+=Math.max(0,baseScores[i]-p.scores[i])*(.7+.3*(lead?baseScores[i]/lead:0));
  let value=own*profile.gain+denial*profile.attack;
  if(c.kind==='build'){
    const b=p.building;
    let accessible=0,high=0,enemy=0,mine=0,top=null;
    for(const q of p.buildSurfaces){
      const nearby=idx.nearby(q.center,3);
      if(nearby.some(v=>owner(v)===pid))accessible+=q.area;
      if(isHighBombSurface(q)){high+=q.area;if(!top||q.center[1]>top.center[1])top=q;}
    }
    for(const q of idx.nearby([b.x,0,b.z],3)){
      if(owner(q)===pid)mine+=q.area;else if(owner(q)!==null)enemy+=q.area;
    }
    const upper=p.buildSurfaces.filter(isHighBombSurface);
    const roofReach=high?Math.max(0,...upper.map(q=>upper.filter(t=>flat2(t.center,q.center)<=RULES.airRadius**2).reduce((sum,t)=>sum+t.area,0)/high)):0;
    const captureChance=clamp((roofReach-.3)/.45,0,1);
    const extraArea=EXPERIMENT.patterns==='rays'?0:top?Math.PI*(bombRadiusAt(top)**2-RULES.bombRadius**2):0;
    const futureShots=Math.min(3,Math.max(0,remaining*2-1));
    const reachValue=top?extension(top)*.85:0;
    const risk=1/(1+enemy*.055);
    const investment=captureChance*risk*(reachValue+extraArea*futureShots*.65);
    // 차폐는 실제 남겨진 바닥 면적, 경사는 연결 가능한 표면을 기준으로 평가한다.
    const covered=new Set(p.covered);
    const nearbyGround=idx.nearby([b.x,0,b.z],BUILDINGS[b.kind].radius).filter(q=>q.building===null&&!covered.has(q.id)&&owner(q)===pid);
    const shade=nearbyGround.filter(q=>p.buildSurfaces.some(t=>t.normal[1]>.7&&t.center[1]>.7&&flat2(q.center,t.center)<.18)).reduce((sum,q)=>sum+q.area,0);
    const connected=p.buildSurfaces.filter(q=>q.normal[1]>.4&&q.center[1]<.6).reduce((sum,q)=>sum+q.area,0);
    const shapeValue=EXPERIMENT.shapes==='new'?Math.min(1.6,shade*.55)+Math.min(.8,connected*.25):0;
    const existing=idx.highBomb.some(q=>flat2(q.center,[b.x,0,b.z])<9)?1.8:0;
    return value+horizon*(profile.building*(investment+shapeValue+Math.min(1.1,accessible*.07))+profile.reach*Math.min(.7,high*.12)-existing-mine*.03)-.45;
  }
  if(c.weapon==='ghost'){
    if(EXPERIMENT.ghostRadius>0){
      let benefit=0,area=0,neutralArea=0,maxProb=0;
      for(const id of p.ghostIds){
        const q=idx.byId.get(id);if(!q)continue;
        let nearest=6;
        for(const t of idx.nearby(q.center,5))if(owner(t)!==null&&owner(t)!==pid)nearest=Math.min(nearest,Math.sqrt(d2(q.center,t.center)));
        const inBombRange=s.players.some(pl=>pl.id!==pid&&flat2(pl.base,q.center)<=RULES.bombRange**2);
        const onContestedRoof=q.building!==null&&idx.controls.get(q.building)?.controller!==pid&&isHighBombSurface(q);
        const prob=clamp(.1+Math.max(0,4-nearest)*.17+(inBombRange?.14:0)+(onContestedRoof?.12:0),.05,.9);
        const swing=owner(q)===pid?(profile.attack+profile.gain*.35)*Math.min(1,2/Math.max(1,q.density)):(profile.gain+profile.attack);
        const stored=EXPERIMENT.ghostStoredDensity;
        const reserve=stored>0?Math.min(1,stored/RULES.threshold)*(owner(q)===pid?.35:profile.gain*.65):0;
        benefit+=q.area*prob*(swing+reserve);
        area+=q.area;if(owner(q)!==pid)neutralArea+=q.area;maxProb=Math.max(maxProb,prob);
      }
      if(EXPERIMENT.ghostBurstRegion){
        const storedArea=neutralArea*Math.min(1,EXPERIMENT.ghostStoredDensity/RULES.threshold);
        const activation=clamp(maxProb+Math.min(.2,area*.035),0,.95);
        const defensive=(area-neutralArea)*.35;
        benefit+=activation*(storedArea*profile.gain*.75+defensive)-neutralArea*.08;
      }
      return horizon*profile.trap*benefit-.15;
    }
    const t=idx.byId.get(c.targetId);
    let enemy=0,nearest=5;
    for(const q of idx.nearby(t.center,4))if(owner(q)!==null&&owner(q)!==pid){enemy+=q.area;nearest=Math.min(nearest,Math.sqrt(d2(q.center,t.center)));}
    return horizon*profile.trap*(.12+(4-nearest)*.24+Math.min(.7,enemy*.05)+(t.building?.25:0))*Math.max(1,(p.ghostIds?.length??1)*.55);
  }
  let weaken=0,secure=0,reach=0,over=0;
  const touched=new Map();
  for(const a of p.affected){
    const old=idx.byId.get(a.id);
    if(!old)continue;
    const oldOwner=owner(old),after=a.controller;
    if(isHighBombSurface(old)){
      const control=idx.controls.get(old.building);
      if(!touched.has(old.building))touched.set(old.building,{total:control.total,areas:{...control.areas},before:control.controller,top:old});
      const t=touched.get(old.building);
      if(oldOwner!==null)t.areas[oldOwner]=(t.areas[oldOwner]??0)-old.area;
      if(after!==null)t.areas[after]=(t.areas[after]??0)+old.area;
      if(after===pid&&old.center[1]>t.top.center[1])t.top=old;
    }
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
  let launchGain=0;
  for(const t of touched.values()){
    const winner=Object.entries(t.areas).find(([,area])=>area>t.total*RULES.roofControl+1e-8);
    const after=winner?Number(winner[0]):null;
    if(after===pid&&t.before!==pid){
      const extra=EXPERIMENT.patterns==='rays'?0:Math.PI*(bombRadiusAt(t.top)**2-RULES.bombRadius**2);
      launchGain+=extension(t.top,t.top.building)+extra*.7;
    }
    if(t.before===pid&&after!==pid)launchGain-=2;
    if(t.before!==null&&t.before!==pid&&after!==t.before)launchGain+=profile.attack*1.25;
  }
  return value+weaken*.11*profile.attack+horizon*(profile.reach*(reach+launchGain)+secure*.14*profile.reinforce-over*.025);
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
  if(EXPERIMENT.constructionCredits&&canBuildNow(s)){
    // 동일한 도색 AP를 보유한 채 건설 여부를 비교한다. 건설권은 아껴둘 수 있다.
    const candidates=[],kinds=new Set();
    for(const row of rows){
      if(row.command.kind!=='build'||kinds.has(row.command.building))continue;
      candidates.push(row);kinds.add(row.command.building);
      if(candidates.length>=(options.fast?3:5))break;
    }
    const paints=rows.filter(r=>r.command.kind!=='build');
    const baseline=paints[0];
    if(!baseline)return {command:{kind:'pass'},evaluated,value:0,planned:[]};
    let baselineValue=baseline.value,basePlan=[baseline.command];
    if(!options.fast){
      const next=apply(s,baseline.command,s.version),ranked=rank(next,profile,true);
      evaluated+=ranked.count;
      const second=ranked.rows[0];if(second){baselineValue+=second.value*.9;basePlan.push(second.command);}
    }
    let best={command:baseline.command,value:baselineValue,planned:basePlan};
    for(const row of candidates){
      const built=apply(s,row.command,s.version),ranked=rank(built,profile,true);
      evaluated+=ranked.count;
      const firstPaint=ranked.rows.find(r=>r.command.kind!=='build');if(!firstPaint)continue;
      let immediate=firstPaint.value,plan=[row.command,firstPaint.command];
      if(!options.fast){
        const after=apply(built,firstPaint.command,built.version),second=rank(after,profile,true);
        evaluated+=second.count;
        if(second.rows[0]){immediate+=second.rows[0].value*.9;plan.push(second.rows[0].command);}
      }
      const remaining=s.config.rounds-s.round;
      const opportunityCost=(s.players[(s.round+s.slot)%s.players.length].constructionCredits===1?1.35:1.0)*Math.min(1,remaining/4);
      const value=immediate+.65*row.value-opportunityCost;
      if(value>best.value+1e-9)best={command:row.command,value,planned:plan};
    }
    return {...best,evaluated};
  }
  if(s.ap===1||options.fast)return {command:rows[0].command,evaluated,value:rows[0].value,planned:[rows[0].command]};
  // 2 AP의 첫 행동이 두 번째 행동의 선택지를 바꾸는 경우를 비교한다.
  const beam=rows.slice(0,3);
  const buildKinds=new Set();
  for(const row of rows){if(row.command.kind!=='build'||buildKinds.has(row.command.building))continue;buildKinds.add(row.command.building);if(!beam.includes(row))beam.push(row);if(buildKinds.size>=2)break;}
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
