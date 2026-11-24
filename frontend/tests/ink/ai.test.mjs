import test from 'node:test';
import assert from 'node:assert/strict';
import { makeGame, active, apply, preview, view, score } from '../../src/lib/ink/engine.mjs';
import { chooseAction, fromPublicView, PROFILES } from '../../src/lib/ink/ai.mjs';

test('모든 AI 성향이 현재 엔진에서 유효한 행동을 선택한다',()=>{
  const state=makeGame({players:4,rounds:8,factor:4});
  for(const profile of Object.keys(PROFILES)){
    const result=chooseAction(view(state),profile,{fast:true});
    assert.notEqual(result.command.kind,'pass');
    assert.ok(result.evaluated>0);
    assert.ok(preview(state,result.command).ok);
  }
});

test('AI는 상대의 숨겨진 함정을 추측하거나 미리보기에서 읽지 않는다',()=>{
  const s=makeGame({players:2,rounds:4,factor:3});
  const neutral=s.surfaces.find(p=>p.owner===null);
  const trapped={...s,surfaces:s.surfaces.map(p=>p.id===neutral.id?{...p,traps:[1]}:p)};
  const plain=view(s),hidden=view(trapped);
  assert.deepEqual(plain,hidden);
  assert.deepEqual(chooseAction(plain,'attack',{fast:true}),chooseAction(hidden,'attack',{fast:true}));
  const own={...s,surfaces:s.surfaces.map(p=>p.id===neutral.id?{...p,traps:[0,1]}:p)};
  assert.deepEqual(fromPublicView(view(own)).surfaces.find(p=>p.id===neutral.id).traps,[0]);
});

test('2 AP 탐색은 결정론적이며 계획은 같은 턴에 합법적이다',()=>{
  const s=makeGame({players:2,rounds:4,factor:4});
  const a=chooseAction(view(s),'balanced');
  assert.deepEqual(a,chooseAction(view(s),'balanced'));
  assert.equal(a.planned.length,2);
  assert.deepEqual(a.command,a.planned[0]);
  const first=apply(s,a.command);
  assert.equal(active(first),active(s));
  assert.equal(first.ap,1);
  assert.ok(preview(first,a.planned[1]).ok);
});

test('건축형과 공격형 AI의 경기가 끝까지 진행되며 기존 규칙을 준수한다',()=>{
  let s=makeGame({players:2,rounds:4,factor:4});
  let builds=0,paints=0;
  for(let i=0;!s.finished&&i<16;i++){
    const pid=active(s);
    const result=chooseAction(view(s),pid===0?'builder':'attack');
    assert.ok(preview(s,result.command).ok);
    if(result.command.kind==='build')builds++;
    if(result.command.kind==='paint')paints++;
    const prior=s.version;
    s=apply(s,result.command,prior);
    assert.equal(s.version,prior+1);
  }
  assert.equal(s.finished,true);
  assert.equal(s.turn,8);
  assert.ok(builds>0,'건축형 AI가 건설을 선택해야 한다');
  assert.ok(paints>0);
  const totals=score(s);
  assert.ok(Math.abs(totals.total-totals.neutral-totals.scores.reduce((a,b)=>a+b,0))<1e-5);
  assert.deepEqual(chooseAction(view(s)).command,{kind:'pass'});
});

test('8인 경기의 빠른 탐색에서도 유효한 행동을 반환한다',()=>{
  const s=makeGame({players:8,rounds:8,factor:4});
  const result=chooseAction(view(s),'expand',{fast:true});
  assert.ok(preview(s,result.command).ok);
  assert.ok(result.evaluated<=25);
});
