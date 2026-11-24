import test from 'node:test';
import assert from 'node:assert/strict';
import { makeGame, active, apply, preview, view, score, BUILDINGS, bombRangeAt, gunRangeAt, canLaunchBomb, getBombControl, isHighBombSurface, bombRadiusAt, RULES } from '../../src/lib/ink/engine.mjs';
const nearest=(surfaces,point)=>surfaces.reduce((a,b)=>Math.hypot(...b.center.map((x,i)=>x-point[i]))<Math.hypot(...a.center.map((x,i)=>x-point[i]))?b:a);
const game=()=>makeGame({players:4,rounds:8,factor:4});
test('2~8인 순환 선턴과 고정 라운드',()=>{
  for(let n=2;n<=8;n++){
    let s=makeGame({players:n,rounds:n*2,factor:4});const order=[];
    while(!s.finished){order.push(active(s));s=apply(s,{kind:'pass'});}
    assert.equal(s.turn,n*n*2);
    for(let position=0;position<n;position++)for(let p=0;p<n;p++)assert.equal(order.filter((v,i)=>i%n===position&&v===p).length,2);
  }
  assert.throws(()=>makeGame({players:4,rounds:7,factor:4}));
});
test('다섯 도구, 행동력, 버전, 결정론적 결과',()=>{
  const s=game(),source=s.surfaces.find(p=>p.owner===0),target=nearest(s.surfaces.filter(p=>p.owner===null),source.center);
  for(const weapon of ['brush','gun','bomb','air','ghost']){
    const c={kind:'paint',weapon,sourceId:weapon==='brush'||weapon==='gun'?source.id:undefined,targetId:target.id};
    const p=preview(s,c);assert.ok(p.ok,p.message);
    assert.deepEqual(p,preview(s,c));
    const a=apply(s,c),b=apply(s,c);assert.deepEqual(a,b);assert.equal(a.ap,1);assert.equal(a.version,1);
    const used=p.affected.reduce((sum,d)=>sum+d.amount*s.surfaces.find(x=>x.id===d.id).area,0);
    assert.ok(used<9.001);
    assert.throws(()=>apply(a,c,0),/변경/);
  }
  const c={kind:'paint',weapon:'air',targetId:target.id};
  const a=apply(apply(s,c),c);assert.equal(a.ap,2);assert.equal(active(a),1);assert.equal(a.turn,1);
});
test('잠복 잉크의 위치와 미리보기 비공개, 발동과 소멸',()=>{
  let s=game();const own=s.surfaces.find(p=>p.owner===0),t=nearest(s.surfaces.filter(p=>p.owner===null),own.center);
  s=apply(s,{kind:'paint',weapon:'ghost',targetId:t.id});
  assert.equal(s.players[0].ghosts,2);
  assert.ok(view(s,0).surfaces.find(p=>p.id===t.id).ownTrap);
  assert.equal(view(s,1).surfaces.find(p=>p.id===t.id).ownTrap,false);
  assert.ok(!('traps' in view(s,1).surfaces.find(p=>p.id===t.id)));
  s=apply(s,{kind:'pass'});
  const c={kind:'paint',weapon:'air',targetId:t.id};
  const clean={...s,surfaces:s.surfaces.map(p=>({...p,traps:[]}))};
  assert.deepEqual(preview(s,c),preview(clean,c));
  s=apply(s,c);assert.equal(s.events.at(-1).triggered,1);
  assert.equal(s.surfaces.find(p=>p.id===t.id).owner,0);
  assert.equal(s.surfaces.find(p=>p.id===t.id).traps.length,0);
});
test('건물 네 종류의 표면적, 건설 제한 및 공중 투하',()=>{
  const initial=game(),center=nearest(initial.surfaces,[0,0,0]);
  for(const building of Object.keys(BUILDINGS)){
    const c={kind:'build',building,targetId:center.id,rotation:0};
    const neutral=preview(initial,c);assert.ok(neutral.ok,neutral.message);
    const neutralBuilt=apply(initial,c);
    assert.deepEqual(neutral.scores,score(initial).scores);
    assert.deepEqual(score(neutralBuilt).scores,score(initial).scores);
    assert.equal(neutralBuilt.ap,1);
    assert.ok(neutralBuilt.surfaces.filter(p=>p.building).every(p=>p.owner===null));
    const covered=new Set(neutral.covered);
    const first=neutral.covered[0];
    const mixed={...initial,surfaces:initial.surfaces.map(p=>p.id===first?{...p,owner:0,density:3}:p)};
    const mixedPreview=preview(mixed,c);assert.ok(mixedPreview.ok);
    const mixedBuilt=apply(mixed,c);
    assert.ok(Math.abs(mixedPreview.scores[0]-score(mixedBuilt).scores[0])<1e-8);
    assert.ok(Math.abs(score(mixedBuilt).scores[0]-score(initial).scores[0])<1e-8);
    const enemy={...mixed,surfaces:mixed.surfaces.map(p=>p.id===first?{...p,owner:1,density:3}:p)};
    assert.equal(preview(enemy,c).ok,false);
    assert.throws(()=>apply(enemy,c),/상대 영토/);
    const belowThreshold={...initial,surfaces:initial.surfaces.map(p=>covered.has(p.id)?{...p,owner:1,density:.25}:p)};
    assert.ok(preview(belowThreshold,c).ok);
    assert.deepEqual(preview(belowThreshold,c).scores,score(initial).scores);
    const s={...initial,surfaces:initial.surfaces.map(p=>({...p,owner:0,density:3}))};
    const p=preview(s,c);assert.ok(p.ok,p.message);assert.ok(p.covered.length);
    const a=apply(s,c);assert.equal(a.buildings.length,1);assert.equal(a.players[0].builds[building],0);
    assert.ok(a.surfaces.filter(p=>p.building).every(p=>p.owner===null));
    assert.ok(score(a).total>score(s).total);
    assert.equal(preview(a,c).ok,false);
    const top=a.surfaces.filter(p=>p.building).sort((x,y)=>y.center[1]-x.center[1])[0];
    assert.ok(preview(a,{kind:'paint',weapon:'air',targetId:top.id}).ok);
  }
});
test('최종 점수는 전체 노출 표면적과 일치한다',()=>{
  let s=game();const c={kind:'paint',weapon:'air',targetId:s.surfaces.find(p=>p.owner===null).id};
  s=apply(s,c);const r=score(s);
  assert.ok(Math.abs(r.total-r.neutral-r.scores.reduce((a,b)=>a+b,0))<1e-5);
});

test('고지대의 점유권과 높이가 폭탄 및 잉크 건 사거리를 결정한다',()=>{
  const initial=makeGame({players:2,rounds:8,factor:4});
  const center=nearest(initial.surfaces,[0,0,0]);
  let s=apply(initial,{kind:'build',building:'tower',targetId:center.id,rotation:0});
  const roof=s.surfaces.find(p=>p.building&&p.center[1]===2.5&&p.normal[1]>.9);
  const ground=s.surfaces.find(p=>p.building===null&&p.owner===0);
  const target=s.surfaces.filter(p=>p.building===null&&Math.hypot(p.center[0]-initial.players[0].base[0],p.center[2]-initial.players[0].base[2])>5.55&&Math.hypot(p.center[0]-roof.center[0],p.center[2]-roof.center[2])<9).sort((a,b)=>b.center[2]-a.center[2])[0];
  assert.ok(roof&&target&&ground);
  const bomb={kind:'paint',weapon:'bomb',sourceId:roof.id,targetId:target.id,arc:'low'};
  assert.equal(preview(s,bomb).ok,false);
  assert.equal(preview(s,{...bomb,sourceId:undefined}).ok,false);
  assert.equal(preview(s,{...bomb,sourceId:ground.id}).ok,false);
  assert.equal(preview(s,{...bomb,sourceId:'missing'}).ok,false);
  const air={kind:'paint',weapon:'air',targetId:roof.id};
  s=apply(s,air);
  s={...s,round:2,slot:0,ap:2};
  const ownedRoof=s.surfaces.find(p=>p.id===roof.id);
  assert.ok(canLaunchBomb(ownedRoof,0,getBombControl(s.surfaces)));
  assert.equal(bombRangeAt(ownedRoof,'low'),8.8);
  assert.equal(bombRangeAt(ownedRoof,'high'),7.8);
  assert.equal(gunRangeAt(ownedRoof),9.5);
  assert.ok(Math.abs(bombRadiusAt(ownedRoof)-1.425)<1e-9);
  const p=preview(s,bomb);
  assert.ok(p.ok,p.message);
  assert.equal(p.path[0][1],2.85);
  assert.ok(p.affected.length>0);
  assert.ok(p.affected.reduce((sum,d)=>sum+d.amount*s.surfaces.find(q=>q.id===d.id).area,0)<=RULES.highBombInk+.001);
  const changed=apply(s,bomb);
  assert.equal(changed.ap,1);
  const partial={...s,surfaces:s.surfaces.map(q=>q.id===roof.id?{...q,owner:1,density:3}:q)};
  assert.equal(getBombControl(partial.surfaces).get(roof.building).controller,0);
  assert.equal(preview({...partial,slot:1},bomb).ok,false);
  const stolen={...s,surfaces:s.surfaces.map(q=>q.building===roof.building&&isHighBombSurface(q)?{...q,owner:1,density:3}:q)};
  assert.equal(preview(stolen,bomb).ok,false);
  const enemyTurn={...stolen,slot:1};
  assert.ok(preview(enemyTurn,bomb).ok);
  const fortified={...s,surfaces:s.surfaces.map(q=>q.id===roof.id?{...q,owner:0,density:3}:q)};
  const far=s.surfaces.filter(q=>q.building===null&&Math.hypot(...q.center.map((v,i)=>v-(roof.center[i]+(i===1?.12:0))))>5.1&&Math.hypot(...q.center.map((v,i)=>v-(roof.center[i]+(i===1?.12:0))))<9.5).sort((a,b)=>b.center[2]-a.center[2])[0];
  assert.ok(far);
  const gun={kind:'paint',weapon:'gun',sourceId:roof.id,targetId:far.id};
  assert.ok(preview(fortified,gun).ok);
  assert.equal(gunRangeAt(ground),5);
});

test('다인전에서도 상부 점유권은 정확히 과반을 초과해야 한다',()=>{
  const patch={building:'test',center:[0,1,0],normal:[0,1,0],density:1,area:1};
  const a={...patch,owner:0},b={...patch,owner:1},c={...patch,owner:2};
  assert.equal(getBombControl([a,b]).get('test').controller,null);
  assert.equal(getBombControl([a,b,c]).get('test').controller,null);
  const control=getBombControl([a,{...a,area:2},b,c]);
  assert.equal(control.get('test').controller,0);
  assert.equal(canLaunchBomb(b,1,control),false);
  assert.ok(canLaunchBomb(a,0,control));
});
