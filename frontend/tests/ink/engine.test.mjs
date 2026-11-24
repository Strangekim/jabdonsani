import test from 'node:test';
import assert from 'node:assert/strict';
import { makeGame, active, apply, preview, view, score, BUILDINGS } from '../../src/lib/ink/engine.mjs';
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
    const c={kind:'paint',weapon,sourceId:source.id,targetId:target.id};
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
