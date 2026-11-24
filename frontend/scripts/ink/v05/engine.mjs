import {ground,buildingSurfaces,BUILDINGS,footprint,geometryIndex,raycast,visible,surfacePath,add,sub,mul,dist,len,dot,lerp,unit,cross} from './geometry.mjs';
export {BUILDINGS};
export const COLORS=['#2381df','#ed793b','#20a77c','#8c5ad4','#d0a321','#10a6b7','#db588a','#7786a0'];
export const WEAPONS={
 brush:{label:'붓',detail:'내 영토에서 표면을 따라 3유닛 · 폭 1',cost:1},
 gun:{label:'잉크 건',detail:'농도 2.5 이상인 내 표면 · 직선 사거리 5 + 높이 × 1.8 · 반경 0.65',cost:1},
 bomb:{label:'잉크 폭탄',detail:'본진 또는 상부 과반 점유 거점 · 높은 곳일수록 사거리와 도색 반경 증가',cost:1},
 air:{label:'공중 투하',detail:'상공에서 수직 투하 · 반경 0.95',cost:1},
 ghost:{label:'잠복 잉크',detail:'내 영토 주변의 중립 표면에 비공개 설치',cost:1}
};
export const RULES={actions:2,threshold:.5,gunThreshold:2.5,ghostUses:3,ink:9,brushRange:3,gunRange:5,bombRange:4.3,highBombRange:3.3,heightRangeFactor:1.8,bombMinHeight:.5,bombMinNormalY:.35,roofControl:.5,bombRadius:1.15,bombInk:5,highBombInk:5.7,heightRadiusFactor:.11,maxHeightRadiusBonus:.33,gunRadius:.65,gunInk:7,airRadius:.95,airInk:3.5,ghostRange:1.5,buildingUses:1};
export const EXPERIMENT={shapes:'new',patterns:'rays',bombEmit:9,bombBurstHeight:.55,bombRayLength:1.65,bombDownBias:0,bombPattern:'sphere',bombDownFraction:.55,bombGroundRadius:1.2,gunEmit:7,gunFan:.23,gunPitch:.035,airEmit:3.5,airLength:3,airWidth:1.1,brushLength:3.5,ghostRadius:0,roofMajority:true,constructionCredits:0,gunOriginOffset:.12,gunHeightBonus:1.8,ghostOwn:false,ghostMaxArea:Infinity,ghostStoredDensity:0,ghostBurstRegion:false};
const keys=()=>EXPERIMENT.shapes==='new'?['ramp','canopy','basin','tunnel','tower']:['dome','tower','wall','arch'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const round=n=>Math.round(n*1e6)/1e6;
const owned=p=>p.density>=RULES.threshold?p.owner:null;
export const gunRangeAt=p=>RULES.gunRange+Math.max(0,p?.center[1]??0)*EXPERIMENT.gunHeightBonus;
export const bombRangeAt=(p,arc='low')=>(arc==='high'?RULES.highBombRange:RULES.bombRange)+Math.max(0,p?.center[1]??0)*RULES.heightRangeFactor;
export const isHighBombSurface=p=>p.building!==null&&p.center[1]>=RULES.bombMinHeight&&p.normal[1]>=RULES.bombMinNormalY;
export const bombRadiusAt=p=>RULES.bombRadius+(p?Math.min(RULES.maxHeightRadiusBonus,Math.max(0,p.center[1])*RULES.heightRadiusFactor):0);
export function getBombControl(surfaces){
  const controls=new Map();
  for(const p of surfaces)if(isHighBombSurface(p)){
    let c=controls.get(p.building);
    if(!c){c={total:0,areas:{},controller:null};controls.set(p.building,c);}
    c.total+=p.area;
    const pid=owned(p);
    if(pid!==null)c.areas[pid]=(c.areas[pid]??0)+p.area;
  }
  for(const c of controls.values()){
    const winner=Object.entries(c.areas).find(([,area])=>area>c.total*RULES.roofControl+1e-8);
    if(winner)c.controller=Number(winner[0]);
  }
  return controls;
}
export const canLaunchBomb=(p,pid,controls)=>!!p&&isHighBombSurface(p)&&owned(p)===pid&&(!EXPERIMENT.roofMajority||controls?.get(p.building)?.controller===pid);
const fail=message=>({ok:false,message,affected:[],path:[],scores:[],buildSurfaces:[],covered:[]});
const check=(condition,message)=>{if(!condition)throw new Error(message);};
export function makeGame({players=4,rounds=8,factor=5}={}){
  check(Number.isInteger(players)&&players>=2&&players<=8,'2~8인만 지원합니다.');
  check(Number.isInteger(rounds)&&rounds>=players&&rounds%players===0&&rounds<=32,'라운드는 인원수의 배수여야 합니다.');
  check(Number.isFinite(factor)&&factor>=2&&factor<=6,'맵 면적 계수는 2~6입니다.');
  const radius=Math.round(Math.sqrt(players*rounds*2*factor/Math.PI)*10)/10;
  const surfaces=ground(radius);
  const ps=Array.from({length:players},(_,i)=>{
    const a=2*Math.PI*i/players-Math.PI/2,base=[radius*.7*Math.cos(a),0,radius*.7*Math.sin(a)];
    return {id:i,name:'P'+(i+1),color:COLORS[i],base,ghosts:RULES.ghostUses,constructionCredits:EXPERIMENT.constructionCredits,lastBuildTurn:-1,builds:Object.fromEntries(keys().map(k=>[k,RULES.buildingUses]))};
  });
  for(const p of surfaces)for(const pl of ps)if(dist(p.center,pl.base)<=.95){p.owner=pl.id;p.density=3;}
  return {version:0,rulesVersion:1,config:{players,rounds,factor,radius},players:ps,surfaces,buildings:[],ghostRegions:[],round:0,slot:0,ap:2,turn:0,finished:false,events:[]};
}
export const active=s=>(s.round+s.slot)%s.players.length;
export function score(s){
  const scores=s.players.map(()=>0);let neutral=0,total=0;
  for(const p of s.surfaces){total+=p.area;const o=owned(p);if(o===null)neutral+=p.area;else scores[o]+=p.area;}
  return {scores,neutral,total};
}
export function view(s,player=active(s)){
  return {version:s.version,config:{...s.config},players:s.players.map(p=>({...p,base:[...p.base],builds:{...p.builds}})),surfaces:s.surfaces.map(({traps,...p})=>({...p,ownTrap:!s.finished&&traps.includes(player),owner:p.owner,controller:owned(p)})),buildings:s.buildings.map(b=>({...b})),ownGhostRegions:s.finished?[]:(s.ghostRegions??[]).filter(g=>g.player===player).map(g=>({...g,ids:[...g.ids]})),round:s.round,slot:s.slot,ap:s.ap,turn:s.turn,active:active(s),finished:s.finished,...score(s),events:s.events.slice(-15)};
}
function addInk(p,player,amount){
  let owner=p.owner,density=p.density;
  if(owner===null||owner===player){owner=player;density+=amount;}
  else if(density>amount)density-=amount;
  else if(amount>density){owner=player;density=amount-density;}
  else{owner=null;density=0;}
  density=round(density);if(density<=0){owner=null;density=0;}
  return {owner,density,controller:density>=RULES.threshold?owner:null};
}
function distribute(pairs,budget,nominal=0){
  const sum=pairs.reduce((s,p)=>s+p.weight,0),denom=Math.max(sum,nominal);
  if(denom<=0)return [];
  return pairs.map(({p,weight})=>({id:p.id,amount:round(budget*weight/denom/p.area)})).filter(p=>p.amount>0);
}
export function canBuildNow(s,pid=active(s)){
  if(!EXPERIMENT.constructionCredits)return s.ap>0;
  return s.ap===RULES.actions&&s.players[pid].constructionCredits>0&&s.players[pid].lastBuildTurn!==s.turn;
}
function footprintPreview(s,c,target,pid){
  if(!canBuildNow(s,pid))return fail('별도 건설권이 남아 있고 이번 턴 도색 전이며 아직 건설하지 않았을 때만 설치할 수 있습니다.');
  if(!keys().includes(c.building))return fail('건물 종류를 선택하세요.');
  if(!s.players[pid].builds[c.building])return fail('이 건물은 이미 사용했습니다.');
  if(target.building!==null)return fail('건물은 지면에만 설치합니다.');
  const rotation=(Number(c.rotation)||0)*Math.PI/2;
  const b={id:'structure-'+s.version,kind:c.building,x:target.center[0],z:target.center[2],rotation};
  if(Math.hypot(b.x,b.z)+BUILDINGS[b.kind].radius>s.config.radius-.02)return fail('맵 경계를 벗어납니다.');
  if(s.buildings.some(a=>Math.hypot(a.x-b.x,a.z-b.z)<BUILDINGS[a.kind].radius+BUILDINGS[b.kind].radius+.08))return fail('기존 건물과 겹치거나 너무 가깝습니다.');
  if(s.players.some(pl=>footprint(b,pl.base,false)))return fail('고정 본진 위에는 건설할 수 없습니다.');
  const covered=s.surfaces.filter(p=>p.building===null&&footprint(b,p.center));
  if(!covered.length||covered.some(p=>owned(p)!==null&&owned(p)!==pid))return fail('상대 영토 위에는 건설할 수 없습니다. 중립 또는 자신의 영토를 선택하세요.');
  const buildSurfaces=buildingSurfaces(b);
  const scores=score(s).scores;for(const p of covered)if(owned(p)===pid)scores[pid]-=p.area;
  return {ok:true,message:'중립 또는 내 영토에 건설합니다. 가려진 잉크는 소멸하고 새 표면은 중립입니다.',affected:[],path:[],scores,buildSurfaces,covered:covered.map(p=>p.id),building:b};
}
function rayDeposits(idx, rays, budget){
  const mass=new Map(),weight=rays.reduce((sum,r)=>sum+(r[2]??1),0);
  let hitCount=0;
  for(const [origin,end,rayWeight=1] of rays){
    const hit=raycast(idx,origin,end);
    if(!hit)continue;
    hitCount++;
    const p=hit.patch;
    mass.set(p.id,(mass.get(p.id)??0)+budget*rayWeight/weight);
  }
  return {deposits:[...mass].map(([id,m])=>({id,amount:round(m/idx.byId.get(id).area)})),hitCount,rays:rays.length,emitted:budget};
}
function fanRays(origin,target,range){
  const forward=unit(sub(target,origin));
  const right=unit(Math.abs(forward[1])>.99?[1,0,0]:cross(forward,[0,1,0]));
  const up=unit(cross(right,forward));
  const rays=[];
  for(let j=0;j<5;j++)for(let i=0;i<21;i++){
    const yaw=(i/20*2-1)*EXPERIMENT.gunFan,pitch=(j/4*2-1)*EXPERIMENT.gunPitch;
    const dir=unit(add(forward,add(mul(right,Math.tan(yaw)),mul(up,Math.tan(pitch)))));
    rays.push([origin,add(origin,mul(dir,range+.05))]);
  }
  return rays;
}
function sphereRays(origin,length){
  const rays=[],count=240;
  if(EXPERIMENT.bombPattern==='disk'){
    const lower=Math.round(count*EXPERIMENT.bombDownFraction);
    for(let i=0;i<lower;i++){
      const r=EXPERIMENT.bombGroundRadius*Math.sqrt((i+.5)/lower),a=i*Math.PI*(3-Math.sqrt(5));
      const dir=unit([r*Math.cos(a),-EXPERIMENT.bombBurstHeight,r*Math.sin(a)]);
      rays.push([origin,add(origin,mul(dir,length))]);
    }
    for(let i=0;i<count-lower;i++){
      const y=(i+.5)/(count-lower),r=Math.sqrt(1-y*y),a=i*Math.PI*(3-Math.sqrt(5));
      rays.push([origin,add(origin,mul([r*Math.cos(a),y,r*Math.sin(a)],length))]);
    }
    return rays;
  }
  for(let i=0;i<count;i++){
    const y=1-2*(i+.5)/count,r=Math.sqrt(1-y*y),a=i*Math.PI*(3-Math.sqrt(5));
    const dir=[r*Math.cos(a),y,r*Math.sin(a)];
    rays.push([origin,add(origin,mul(dir,length)),1+(y<0?EXPERIMENT.bombDownBias:-EXPERIMENT.bombDownBias)]);
  }
  return rays;
}
function bandRays(target,rotation){
  const a=rotation*Math.PI/4,c=Math.cos(a),s=Math.sin(a),rays=[];
  for(let i=0;i<18;i++)for(let j=0;j<7;j++){
    const u=((i+.5)/18-.5)*EXPERIMENT.airLength,v=((j+.5)/7-.5)*EXPERIMENT.airWidth;
    const x=target[0]+u*c-v*s,z=target[2]+u*s+v*c;
    rays.push([[x,8,z],[x,-.05,z]]);
  }
  return rays;
}
export function ghostEligible(p,pid){
  return !p.traps.includes(pid)&&(p.owner===null||(EXPERIMENT.ghostOwn&&owned(p)===pid));
}
function paintPreview(s,c,pid,idx,target){
  if(!Object.hasOwn(WEAPONS,c.weapon))return fail('도색 도구를 선택하세요.');
  const source=idx.byId.get(c.sourceId);
  let deposits=[],path=[],message='',rayStats=null;
  if(c.weapon==='ghost'){
    if(!ghostEligible(target,pid))return fail(EXPERIMENT.ghostOwn?'미설치 중립 또는 내 영토를 선택하세요.':'아직 잉크가 없는 중립 표면에만 설치할 수 있습니다.');
    if(s.players[pid].ghosts<=0)return fail('잠복 잉크를 모두 사용했습니다.');
    if(!s.surfaces.some(p=>owned(p)===pid&&dist(p.center,target.center)<=RULES.ghostRange))return fail('내 영토에서 '+RULES.ghostRange+'유닛 이내에 설치하세요.');
    const eligible=s.surfaces.filter(p=>ghostEligible(p,pid)&&p.building===target.building&&dist(p.center,target.center)<=EXPERIMENT.ghostRadius+1e-7&&dot(p.normal,target.normal)>.15).sort((a,b)=>dist(a.center,target.center)-dist(b.center,target.center)||a.id.localeCompare(b.id));
    const ghostIds=[];let ghostArea=0;
    for(const p of eligible){
      if(ghostArea+p.area>EXPERIMENT.ghostMaxArea+1e-8)continue;
      ghostArea+=p.area;ghostIds.push(p.id);
    }
    if(!ghostIds.length)return fail('설치할 수 있는 표면이 없습니다.');
    return {ok:true,message:'위치는 비공개이며 상대의 다음 도색에 한 번 반응합니다.',affected:[],path:[],scores:score(s).scores,buildSurfaces:[],covered:[],ghost:target.id,ghostIds,ghostArea};
  }
  if(c.weapon==='brush'){
    if(!source||owned(source)!==pid)return fail('붓의 시작점을 내 영토에서 선택하세요.');
    const max=EXPERIMENT.patterns==='rays'?EXPERIMENT.brushLength:RULES.brushRange;
    const waypoint=c.viaId?idx.byId.get(c.viaId):null;
    if(c.viaId&&!waypoint)return fail('경유점을 찾을 수 없습니다.');
    let trace;
    if(waypoint&&EXPERIMENT.patterns==='rays'){
      const first=surfacePath(s.surfaces,source,waypoint,max);
      const second=first&&surfacePath(s.surfaces,waypoint,target,max-first.length+1e-8);
      if(first&&second)trace={path:[...first.path,...second.path.slice(1)],affected:[...new Map([...first.affected,...second.affected].map(p=>[p.id,p])).values()],length:first.length+second.length};
    }else trace=surfacePath(s.surfaces,source,target,max);
    if(!trace)return fail('표면 경로가 길이 제한을 초과했습니다.');
    path=trace.path.map(p=>add(p.center,mul(p.normal,.035)));
    deposits=distribute(trace.affected.map(p=>({p,weight:p.area})),9,EXPERIMENT.patterns==='rays'?max:3);
    message='연결된 표면을 따라 도색합니다.';
  } else if(c.weapon==='gun'){
    if(!source||owned(source)!==pid||source.density<RULES.gunThreshold)return fail('농도 '+RULES.gunThreshold+' 이상인 내 표면을 발사점으로 선택하세요.');
    const origin=add(source.center,mul(source.normal,EXPERIMENT.patterns==='rays'?EXPERIMENT.gunOriginOffset:.12));
    const range=gunRangeAt(source);
    if(dist(origin,target.center)>range+.05)return fail('잉크 건의 사거리 '+range.toFixed(1)+'유닛을 초과했습니다.');
    const end=add(target.center,mul(unit(sub(target.center,origin)),.03));
    const hit=raycast(idx,origin,end);
    const center=hit?.point??target.center,normal=hit?.patch.normal??target.normal;
    path=[origin,center];
    if(EXPERIMENT.patterns==='rays'){
      const result=rayDeposits(idx,fanRays(origin,target.center,range),EXPERIMENT.gunEmit);
      deposits=result.deposits;rayStats=result;
      message='부채꼴로 분사하고 각 광선의 최초 충돌 표면을 도색합니다.';
    }else{
      const candidates=s.surfaces.filter(p=>dist(p.center,center)<=RULES.gunRadius&&dot(p.normal,normal)>.15&&visible(idx,origin,p));
      deposits=distribute(candidates.map(p=>({p,weight:p.area*Math.max(.15,dot(p.normal,normal))})),RULES.gunInk,Math.PI*RULES.gunRadius**2);
      message='직선 집중 도색입니다.';
    }
  } else if(c.weapon==='bomb'){
    const high=c.arc==='high';
    if(c.sourceId!==undefined&&!canLaunchBomb(source,pid,getBombControl(s.surfaces)))return fail('건물 상부 면적의 절반을 초과해 점유한 플레이어만 자기 색 상부에서 투척할 수 있습니다.');
    const launch=source??null,base=launch?launch.center:s.players[pid].base,origin=add(base,[0,.35,0]),range=bombRangeAt(launch,c.arc);
    if(Math.hypot(target.center[0]-base[0],target.center[2]-base[2])>range+.05)return fail('선택한 발사점의 투척 사거리 '+range.toFixed(1)+'유닛을 초과했습니다.');
    const height=high?3.3:1.8;let hit=null;path=[origin];
    const end=add(target.center,mul(target.normal,-.025));
    for(let i=1;i<=28;i++){const t=i/28,next=add(lerp(origin,end,t),[0,4*height*t*(1-t),0]);hit=raycast(idx,path[path.length-1],next);path.push(hit?hit.point:next);if(hit)break;}
    const center=hit?.point??target.center,normal=hit?.patch.normal??target.normal,explosion=add(center,mul(normal,.06));
    if(EXPERIMENT.patterns==='rays'){
      const burst=add(center,mul(normal,EXPERIMENT.bombBurstHeight));
      // 충돌 표면 바로 앞에서 구형 방사. 입자별 첫 충돌만 인정한다.
      const obstruction=raycast(idx,explosion,burst);
      const actual=obstruction?lerp(explosion,obstruction.point,.85):burst;
      const result=rayDeposits(idx,sphereRays(actual,EXPERIMENT.bombRayLength),EXPERIMENT.bombEmit);
      deposits=result.deposits;rayStats=result;
    }else{
      const blastRadius=bombRadiusAt(launch);
      const pairs=s.surfaces.filter(p=>dist(p.center,center)<=blastRadius&&visible(idx,explosion,p)).map(p=>({p,weight:p.area}));
      deposits=distribute(pairs,launch?RULES.highBombInk:RULES.bombInk,Math.PI*blastRadius**2);
    }
    message=(launch?'고지대 투척 · ':'본진 투척 · ')+'충돌 지점 주변으로 잉크가 확산됩니다.';
  } else {
    const [x,,z]=target.center,origin=[x,8,z];const hit=raycast(idx,origin,[x,-.05,z]);
    if(!hit)return fail('투하할 표면을 찾지 못했습니다.');
    path=[origin,hit.point];
    if(EXPERIMENT.patterns==='rays'){
      const rotation=Number.isInteger(c.rotation)?((c.rotation%4)+4)%4:0;
      const result=rayDeposits(idx,bandRays(target.center,rotation),EXPERIMENT.airEmit);
      deposits=result.deposits;rayStats=result;
      message='선택한 방향으로 직사각형 띠를 수직 투하합니다.';
    }else{
      const candidates=s.surfaces.filter(p=>Math.hypot(p.center[0]-x,p.center[2]-z)<=RULES.airRadius&&p.normal[1]>.06&&visible(idx,[p.center[0],8,p.center[2]],p));
      deposits=distribute(candidates.map(p=>({p,weight:p.area*p.normal[1]})),RULES.airInk,Math.PI*RULES.airRadius**2);
      message='상공에서 보이는 표면에 수직으로 투하합니다.';
    }
  }
  if(!deposits.length)return fail('도색되는 표면이 없습니다.');
  const scores=score(s).scores;
  const affected=deposits.map(d=>{const p=idx.byId.get(d.id),after=addInk(p,pid,d.amount),before=owned(p);if(before!==null)scores[before]-=p.area;if(after.controller!==null)scores[after.controller]+=p.area;return {...d,...after};});
  return {ok:true,message,affected,path,scores,buildSurfaces:[],covered:[],rayStats:rayStats?{hitCount:rayStats.hitCount,rays:rayStats.rays,emitted:rayStats.emitted}:null};
}
export function preview(s,c){
  if(s.finished)return fail('경기가 종료되었습니다.');
  if(c.kind==='pass')return {ok:true,message:'남은 행동력을 포기합니다.',affected:[],path:[],scores:score(s).scores,buildSurfaces:[],covered:[]};
  if(s.ap<=0)return fail('행동력이 없습니다.');
  const idx=geometryIndex(s),p=idx.byId.get(c.targetId),pid=active(s);
  if(!p)return fail('목표 표면을 선택하세요.');
  if(c.kind==='build')return footprintPreview(s,c,p,pid);
  if(c.kind==='paint')return paintPreview(s,c,pid,idx,p);
  return fail('지원하지 않는 행동입니다.');
}
export function apply(s,c,expectedVersion=s.version){
  check(expectedVersion===s.version,'게임 상태가 변경되었습니다.');
  const p=preview(s,c);check(p.ok,p.message);
  const pid=active(s),next={...s,version:s.version+1,players:s.players.map(pl=>({...pl,builds:{...pl.builds}})),surfaces:s.surfaces.slice(),buildings:s.buildings.slice(),ghostRegions:(s.ghostRegions??[]).slice(),events:s.events.slice()};
  let triggered=0,trapArea=0,trapInk=0,trapStoredInk=0,trapRegionsTriggered=0;
  if(c.kind==='build'){
    const covered=new Set(p.covered);
    next.surfaces=next.surfaces.filter(v=>!covered.has(v.id)).concat(p.buildSurfaces);
    next.ghostRegions=next.ghostRegions.map(g=>({...g,ids:g.ids.filter(id=>!covered.has(id))})).filter(g=>g.ids.length);
    next.buildings.push(p.building);next.players[pid].builds[c.building]--;
    if(EXPERIMENT.constructionCredits){next.players[pid].constructionCredits--;next.players[pid].lastBuildTurn=s.turn;}
  } else if(c.kind==='paint'){
    if(c.weapon==='ghost'){
      next.players[pid].ghosts--;
      next.surfaces=next.surfaces.map(v=>p.ghostIds.includes(v.id)?{...v,traps:[...v.traps,pid]}:v);
      if(EXPERIMENT.ghostBurstRegion)next.ghostRegions.push({id:'ghost-'+s.version,player:pid,ids:[...p.ghostIds]});
    } else {
      const changes=new Map(p.affected.map(v=>[v.id,v]));
      if(EXPERIMENT.ghostBurstRegion){
        const groups=s.ghostRegions??[],index=new Map(),fired=new Set(),redirect=new Map();
        for(const g of groups)for(const id of g.ids)index.set(g.player+':'+id,g);
        for(const v of s.surfaces){
          const d=changes.get(v.id);if(!d)continue;
          const trap=v.traps.find(t=>t!==pid);
          if(trap===undefined)continue;
          const g=index.get(trap+':'+v.id);
          if(g){fired.add(g.id);redirect.set(v.id,trap);triggered++;trapArea+=v.area;trapInk+=d.amount*v.area;}
        }
        const released=new Map();
        for(const g of groups)if(fired.has(g.id)){
          trapRegionsTriggered++;
          for(const id of g.ids){if(!released.has(id))released.set(id,[]);released.get(id).push(g.player);}
        }
        next.surfaces=next.surfaces.map(v=>{
          const d=changes.get(v.id),owners=released.get(v.id)??[];
          if(!d&&!owners.length)return v;
          let q={...v};
          if(d){const result=addInk(q,redirect.get(v.id)??pid,d.amount);q={...q,owner:result.owner,density:result.density};}
          for(const player of owners){
            const result=addInk(q,player,EXPERIMENT.ghostStoredDensity);q={...q,owner:result.owner,density:result.density,traps:q.traps.filter(t=>t!==player)};
            trapStoredInk+=EXPERIMENT.ghostStoredDensity*q.area;
          }
          return q;
        });
        next.ghostRegions=groups.filter(g=>!fired.has(g.id));
      }else{
        next.surfaces=next.surfaces.map(v=>{
          const d=changes.get(v.id);if(!d)return v;
          const trap=v.traps.find(t=>t!==pid),owner=trap===undefined?pid:trap;
          if(trap!==undefined){triggered++;trapArea+=v.area;trapInk+=d.amount*v.area;trapStoredInk+=EXPERIMENT.ghostStoredDensity*v.area;}
          const {owner:o,density}=addInk(v,owner,d.amount+(trap===undefined?0:EXPERIMENT.ghostStoredDensity));
          return {...v,owner:o,density,traps:trap===undefined?v.traps:v.traps.filter(t=>t!==trap)};
        });
      }
    }
  }
  const label=c.kind==='pass'?'턴 종료':c.kind==='build'?BUILDINGS[c.building].label+' 건설':WEAPONS[c.weapon].label;
  next.events.push({id:next.version,player:pid,label,round:s.round+1,triggered,trapArea,trapInk,trapStoredInk,trapRegionsTriggered});
  next.ap=c.kind==='pass'?0:c.kind==='build'&&EXPERIMENT.constructionCredits?s.ap:s.ap-1;
  if(next.ap===0){
    next.turn++;next.slot++;
    if(next.slot===s.players.length){next.slot=0;next.round++;}
    if(next.round>=next.config.rounds){next.finished=true;next.ap=0;}
    else next.ap=RULES.actions;
  }
  return next;
}
export function createLocalGame(config){
  let state=makeGame(config);
  return {
    getView:()=>view(state),
    preview:command=>preview(state,command),
    dispatch:(command,version)=>{state=apply(state,command,version);return view(state);}
  };
}
