import {ground,buildingSurfaces,BUILDINGS,footprint,geometryIndex,raycast,visible,surfacePath,add,sub,mul,dist,len,dot,lerp,unit} from './geometry.mjs';
export {BUILDINGS};
export const COLORS=['#2381df','#ed793b','#20a77c','#8c5ad4','#d0a321','#10a6b7','#db588a','#7786a0'];
export const WEAPONS={
 brush:{label:'붓',detail:'내 영토에서 표면을 따라 3유닛 · 폭 1',cost:1},
 gun:{label:'잉크 건',detail:'농도 2.5 이상인 내 표면 · 직선 사거리 5 + 높이 × 1.5',cost:1},
 bomb:{label:'잉크 폭탄',detail:'본진 또는 점유한 고지대 · 곡선 투척 · 반경 1.25',cost:1},
 air:{label:'공중 투하',detail:'상공에서 수직 투하 · 반경 0.85',cost:1},
 ghost:{label:'잠복 잉크',detail:'내 영토 주변의 중립 표면에 비공개 설치',cost:1}
};
export const RULES={actions:2,threshold:.5,gunThreshold:2.5,ghostUses:3,ink:9,brushRange:3,gunRange:5,bombRange:5.5,highBombRange:4.2,heightRangeFactor:1.5,bombMinHeight:.5,bombMinNormalY:.35,ghostRange:1.5,buildingUses:1};
const keys=Object.keys(BUILDINGS);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const round=n=>Math.round(n*1e6)/1e6;
const owned=p=>p.density>=RULES.threshold?p.owner:null;
export const gunRangeAt=p=>RULES.gunRange+Math.max(0,p?.center[1]??0)*RULES.heightRangeFactor;
export const bombRangeAt=(p,arc='low')=>(arc==='high'?RULES.highBombRange:RULES.bombRange)+Math.max(0,p?.center[1]??0)*RULES.heightRangeFactor;
export const isHighBombSurface=p=>p.building!==null&&p.center[1]>=RULES.bombMinHeight&&p.normal[1]>=RULES.bombMinNormalY;
export const canLaunchBomb=(p,pid)=>!!p&&isHighBombSurface(p)&&owned(p)===pid;
const fail=message=>({ok:false,message,affected:[],path:[],scores:[],buildSurfaces:[],covered:[]});
const check=(condition,message)=>{if(!condition)throw new Error(message);};
export function makeGame({players=4,rounds=8,factor=4}={}){
  check(Number.isInteger(players)&&players>=2&&players<=8,'2~8인만 지원합니다.');
  check(Number.isInteger(rounds)&&rounds>=players&&rounds%players===0&&rounds<=32,'라운드는 인원수의 배수여야 합니다.');
  check(Number.isFinite(factor)&&factor>=2&&factor<=6,'맵 면적 계수는 2~6입니다.');
  const radius=Math.round(Math.sqrt(players*rounds*2*factor/Math.PI)*10)/10;
  const surfaces=ground(radius);
  const ps=Array.from({length:players},(_,i)=>{
    const a=2*Math.PI*i/players-Math.PI/2,base=[radius*.7*Math.cos(a),0,radius*.7*Math.sin(a)];
    return {id:i,name:'P'+(i+1),color:COLORS[i],base,ghosts:RULES.ghostUses,builds:Object.fromEntries(keys.map(k=>[k,RULES.buildingUses]))};
  });
  for(const p of surfaces)for(const pl of ps)if(dist(p.center,pl.base)<=.95){p.owner=pl.id;p.density=3;}
  return {version:0,rulesVersion:1,config:{players,rounds,factor,radius},players:ps,surfaces,buildings:[],round:0,slot:0,ap:2,turn:0,finished:false,events:[]};
}
export const active=s=>(s.round+s.slot)%s.players.length;
export function score(s){
  const scores=s.players.map(()=>0);let neutral=0,total=0;
  for(const p of s.surfaces){total+=p.area;const o=owned(p);if(o===null)neutral+=p.area;else scores[o]+=p.area;}
  return {scores,neutral,total};
}
export function view(s,player=active(s)){
  return {version:s.version,config:{...s.config},players:s.players.map(p=>({...p,base:[...p.base],builds:{...p.builds}})),surfaces:s.surfaces.map(({traps,...p})=>({...p,ownTrap:!s.finished&&traps.includes(player),owner:p.owner,controller:owned(p)})),buildings:s.buildings.map(b=>({...b})),round:s.round,slot:s.slot,ap:s.ap,turn:s.turn,active:active(s),finished:s.finished,...score(s),events:s.events.slice(-15)};
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
function footprintPreview(s,c,target,pid){
  if(!keys.includes(c.building))return fail('건물 종류를 선택하세요.');
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
function paintPreview(s,c,pid,idx,target){
  if(!Object.hasOwn(WEAPONS,c.weapon))return fail('도색 도구를 선택하세요.');
  const source=idx.byId.get(c.sourceId);
  let deposits=[],path=[],message='';
  if(c.weapon==='ghost'){
    if(target.owner!==null||target.traps.includes(pid))return fail('아직 잉크가 없는 중립 표면에만 설치할 수 있습니다.');
    if(s.players[pid].ghosts<=0)return fail('잠복 잉크를 모두 사용했습니다.');
    if(!s.surfaces.some(p=>owned(p)===pid&&dist(p.center,target.center)<=RULES.ghostRange))return fail('내 영토에서 1.5유닛 이내에 설치하세요.');
    return {ok:true,message:'위치는 비공개이며 상대의 다음 도색에 한 번 반응합니다.',affected:[],path:[],scores:score(s).scores,buildSurfaces:[],covered:[],ghost:target.id};
  }
  if(c.weapon==='brush'){
    if(!source||owned(source)!==pid)return fail('붓의 시작점을 내 영토에서 선택하세요.');
    const trace=surfacePath(s.surfaces,source,target,RULES.brushRange);
    if(!trace)return fail('표면을 따라 3유닛 이내인 목표를 선택하세요.');
    path=trace.path.map(p=>add(p.center,mul(p.normal,.035)));
    deposits=distribute(trace.affected.map(p=>({p,weight:p.area})),9,3);
    message='연결된 표면을 따라 도색합니다.';
  } else if(c.weapon==='gun'){
    if(!source||owned(source)!==pid||source.density<RULES.gunThreshold)return fail('농도 2.5 이상인 내 표면을 발사점으로 선택하세요.');
    const origin=add(source.center,mul(source.normal,.12));
    const range=gunRangeAt(source);
    if(dist(origin,target.center)>range+.05)return fail('잉크 건의 사거리 '+range.toFixed(1)+'유닛을 초과했습니다.');
    const end=add(target.center,mul(unit(sub(target.center,origin)),.03));
    const hit=raycast(idx,origin,end);
    const center=hit?.point??target.center,normal=hit?.patch.normal??target.normal;
    path=[origin,center];
    const candidates=s.surfaces.filter(p=>dist(p.center,center)<=.56&&dot(p.normal,normal)>.15&&visible(idx,origin,p));
    deposits=distribute(candidates.map(p=>({p,weight:p.area*Math.max(.15,dot(p.normal,normal))})),9,Math.PI*.56*.56);
    message=hit&&hit.patch.id!==target.id?'가장 먼저 충돌한 표면을 도색합니다.':'직선 집중 도색입니다.';
  } else if(c.weapon==='bomb'){
    const high=c.arc==='high';
    if(c.sourceId!==undefined&&!canLaunchBomb(source,pid))return fail('농도 0.5 이상으로 점유한 고지대의 위쪽 표면에서만 투척할 수 있습니다.');
    const launch=source??null,base=launch?launch.center:s.players[pid].base,origin=add(base,[0,.35,0]),range=bombRangeAt(launch,c.arc);
    if(Math.hypot(target.center[0]-base[0],target.center[2]-base[2])>range+.05)return fail('선택한 발사점의 투척 사거리 '+range.toFixed(1)+'유닛을 초과했습니다.');
    const height=high?3.3:1.8;let hit=null;path=[origin];
    const end=add(target.center,mul(target.normal,-.025));
    for(let i=1;i<=28;i++){const t=i/28,next=add(lerp(origin,end,t),[0,4*height*t*(1-t),0]);hit=raycast(idx,path[path.length-1],next);path.push(hit?hit.point:next);if(hit)break;}
    const center=hit?.point??target.center,normal=hit?.patch.normal??target.normal,explosion=add(center,mul(normal,.06));
    const pairs=s.surfaces.filter(p=>dist(p.center,center)<=1.25&&visible(idx,explosion,p)).map(p=>({p,weight:p.area}));
    deposits=distribute(pairs,5,Math.PI*1.25*1.25);
    message=(launch?'고지대 투척 · ':'본진 투척 · ')+'충돌 지점 주변으로 잉크가 확산됩니다.';
  } else {
    const [x,,z]=target.center,origin=[x,8,z];const hit=raycast(idx,origin,[x,-.05,z]);
    if(!hit)return fail('투하할 표면을 찾지 못했습니다.');
    path=[origin,hit.point];
    const candidates=s.surfaces.filter(p=>Math.hypot(p.center[0]-x,p.center[2]-z)<=.85&&p.normal[1]>.06&&visible(idx,[p.center[0],8,p.center[2]],p));
    deposits=distribute(candidates.map(p=>({p,weight:p.area*p.normal[1]})),3,Math.PI*.85*.85);
    message='상공에서 보이는 표면에 수직으로 투하합니다.';
  }
  if(!deposits.length)return fail('도색되는 표면이 없습니다.');
  const scores=score(s).scores;
  const affected=deposits.map(d=>{const p=idx.byId.get(d.id),after=addInk(p,pid,d.amount),before=owned(p);if(before!==null)scores[before]-=p.area;if(after.controller!==null)scores[after.controller]+=p.area;return {...d,...after};});
  return {ok:true,message,affected,path,scores,buildSurfaces:[],covered:[]};
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
  const pid=active(s),next={...s,version:s.version+1,players:s.players.map(pl=>({...pl,builds:{...pl.builds}})),surfaces:s.surfaces.slice(),buildings:s.buildings.slice(),events:s.events.slice()};
  let triggered=0;
  if(c.kind==='build'){
    const covered=new Set(p.covered);
    next.surfaces=next.surfaces.filter(v=>!covered.has(v.id)).concat(p.buildSurfaces);
    next.buildings.push(p.building);next.players[pid].builds[c.building]--;
  } else if(c.kind==='paint'){
    if(c.weapon==='ghost'){
      next.players[pid].ghosts--;
      next.surfaces=next.surfaces.map(v=>v.id===p.ghost?{...v,traps:[...v.traps,pid]}:v);
    } else {
      const changes=new Map(p.affected.map(v=>[v.id,v]));
      next.surfaces=next.surfaces.map(v=>{
        const d=changes.get(v.id);if(!d)return v;
        const trap=v.traps.find(t=>t!==pid),owner=trap===undefined?pid:trap;
        if(trap!==undefined)triggered++;
        const {owner:o,density}=addInk(v,owner,d.amount);
        return {...v,owner:o,density,traps:trap===undefined?v.traps:v.traps.filter(t=>t!==trap)};
      });
    }
  }
  const label=c.kind==='pass'?'턴 종료':c.kind==='build'?BUILDINGS[c.building].label+' 건설':WEAPONS[c.weapon].label;
  next.events.push({id:next.version,player:pid,label,round:s.round+1,triggered});
  next.ap=c.kind==='pass'?0:s.ap-1;
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
