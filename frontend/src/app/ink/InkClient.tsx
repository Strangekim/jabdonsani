'use client';

import { useEffect, useRef, useState } from 'react';
import InkBoard from './InkBoard';
import { BUILDINGS, WEAPONS, RULES, COLORS, createLocalGame, canLaunchBomb, bombRangeAt, gunRangeAt } from '@/lib/ink/engine.mjs';
import type { BuildingKind, Command, GamePort, GameView, Preview, Weapon } from '@/lib/ink/engine.mjs';
import { PROFILES } from '@/lib/ink/ai.mjs';
import type { Seat, AiProfile, AiResult } from '@/lib/ink/ai.mjs';
import styles from './Ink.module.css';

type Choice = {kind:'paint';weapon:Weapon} | {kind:'build';building:BuildingKind};
const weapons = Object.keys(WEAPONS) as Weapon[];
const buildings = Object.keys(BUILDINGS) as BuildingKind[];
const needsSource = (c:Choice) => c.kind==='paint' && (c.weapon==='brush'||c.weapon==='gun');
const fmt=(n:number)=>n.toFixed(1);
const defaultSeats:Seat[]=['human','balanced','attack','builder','expand','balanced','attack','builder'];
const profileKeys=Object.keys(PROFILES) as AiProfile[];
const seatLabel=(seat:Seat)=>seat==='human'?'사람':PROFILES[seat].label+' AI';
type WorkerReply = {ok:true;version:number;result:AiResult} | {ok:false;version:number;error:string};

function makeCommand(choice:Choice,target:string,source:string|null,arc:'low'|'high',rotation:number):Command {
  return choice.kind==='paint'
    ? {kind:'paint',weapon:choice.weapon,targetId:target,sourceId:source??undefined,arc}
    : {kind:'build',building:choice.building,targetId:target,rotation};
}

export default function InkClient() {
  const port=useRef<GamePort|null>(null);
  const [players,setPlayers]=useState(4);
  const [cycles,setCycles]=useState(2);
  const [factor,setFactor]=useState(4);
  const [view,setView]=useState<GameView|null>(null);
  const [choice,setChoice]=useState<Choice>({kind:'paint',weapon:'brush'});
  const [source,setSource]=useState<string|null>(null);
  const [target,setTarget]=useState<string|null>(null);
  const [arc,setArc]=useState<'low'|'high'>('low');
  const [bombOrigin,setBombOrigin]=useState<'base'|'high'>('base');
  const [rotation,setRotation]=useState(0);
  const [preview,setPreview]=useState<Preview|null>(null);
  const [message,setMessage]=useState('');
  const [handoff,setHandoff]=useState(true);
  const [match,setMatch]=useState(0);
  const [seats,setSeats]=useState<Seat[]>(defaultSeats);
  const [fast,setFast]=useState(false);
  const [paused,setPaused]=useState(false);
  const [aiError,setAiError]=useState('');
  const [aiEvaluated,setAiEvaluated]=useState<number|null>(null);
  const [retry,setRetry]=useState(0);
  const currentSeat:Seat=view?seats[view.active]:'human';
  const isAI=!!view&&!view.finished&&currentSeat!=='human';
  const humanCount=seats.slice(0,players).filter(p=>p==='human').length;
  const blocked=handoff||isAI;

  useEffect(()=>{
    if(!view||view.finished||currentSeat==='human'||paused)return;
    const game=port.current;
    if(!game)return;
    let cancelled=false,delay:ReturnType<typeof setTimeout>|undefined;
    let worker:Worker|undefined;
    const onFailure=(error:string)=>{
      if(cancelled||port.current!==game)return;
      setAiError(error);setPreview(null);setSource(null);setTarget(null);
    };
    try{
      worker=new Worker(new URL('../../lib/ink/ai.worker.mjs',import.meta.url),{type:'module'});
      worker.onmessage=(event:MessageEvent<WorkerReply>)=>{
        const data=event.data;
        if(cancelled||port.current!==game||data.version!==view.version)return;
        worker?.terminate();
        if(!data.ok){onFailure(data.error);return;}
        const command=data.result.command;
        const p=game.preview(command);
        if(!p.ok){onFailure(p.message);return;}
        setAiEvaluated(data.result.evaluated);
        const secret=command.kind==='paint'&&command.weapon==='ghost';
        setPreview(secret?null:p);
        setTarget(command.kind==='pass'||secret?null:command.targetId);
        setSource(command.kind==='paint'&&!secret?command.sourceId??null:null);
        setMessage(command.kind==='pass'?'AI 턴 종료':command.kind==='build'?BUILDINGS[command.building].label+' 건설 준비':WEAPONS[command.weapon].label+' 사용 준비');
        delay=setTimeout(()=>{
          if(cancelled||port.current!==game)return;
          try{
            const next=game.dispatch(command,view.version);
            setSource(null);setTarget(null);setPreview(null);setAiError('');
            const changed=next.turn!==view.turn;
            setHandoff(changed&&!next.finished&&seats[next.active]==='human'&&humanCount>1);
            const event=next.events[next.events.length-1];
            setMessage(event?.triggered?'잠복 잉크 '+event.triggered+'개 발동!':'');
            setView(next);
          }catch(e){onFailure(e instanceof Error?e.message:'AI 행동 실패');}
        },fast?90:450);
      };
      worker.onerror=()=>onFailure('AI 계산 모듈을 실행하지 못했습니다.');
      worker.onmessageerror=()=>onFailure('AI 계산 결과를 읽지 못했습니다.');
      worker.postMessage({view,profile:currentSeat,fast});
    }catch(e){onFailure(e instanceof Error?e.message:'AI를 실행하지 못했습니다.');}
    return ()=>{cancelled=true;worker?.terminate();if(delay!==undefined)clearTimeout(delay);};
  },[view,currentSeat,paused,fast,retry,seats,humanCount]);

  const clearSelection=()=>{setSource(null);setTarget(null);setPreview(null);setMessage('');};
  const start=()=>{
    try {
      const game=createLocalGame({players,rounds:players*cycles,factor});
      port.current=game;setView(game.getView());setMatch(m=>m+1);setHandoff(seats[0]==='human'&&humanCount>1);clearSelection();setPaused(false);setAiError('');setAiEvaluated(null);
      setChoice({kind:'paint',weapon:'brush'});setArc('low');setBombOrigin('base');setRotation(0);
    } catch(e) {setMessage(e instanceof Error?e.message:'경기를 만들지 못했습니다.');}
  };
  const select=(c:Choice)=>{setChoice(c);setBombOrigin('base');clearSelection();};
  const requestPreview=(id:string,src=source,nextArc=arc,nextRotation=rotation)=>{
    if(!port.current)return;
    setTarget(id);setPreview(port.current.preview(makeCommand(choice,id,src,nextArc,nextRotation)));setMessage('');
  };
  const pick=(id:string)=>{
    if(!view||view.finished||blocked)return;
    const highBomb=choice.kind==='paint'&&choice.weapon==='bomb'&&bombOrigin==='high';
    if((needsSource(choice)||highBomb)&&!source){
      const p=view.surfaces.find(s=>s.id===id);
      if(!p||p.controller!==view.active){setMessage('내 색으로 칠해진 표면을 시작점으로 선택하세요.');return;}
      if(highBomb&&!canLaunchBomb(p,view.active)){setMessage('높이 0.5 이상이고 위쪽을 향한 내 건물 표면을 선택하세요.');return;}
      if(choice.kind==='paint'&&choice.weapon==='gun'&&p.density<RULES.gunThreshold){setMessage('잉크 건의 발사점은 농도 2.5 이상이어야 합니다.');return;}
      setSource(id);setTarget(null);setPreview(null);setMessage('');return;
    }
    requestPreview(id);
  };
  const submit=(command:Command)=>{
    if(!view||!port.current||blocked||view.finished)return;
    try{
      const next=port.current.dispatch(command,view.version);
      setView(next);clearSelection();
      if(next.turn!==view.turn&&!next.finished)setHandoff(seats[next.active]==='human'&&humanCount>1);
      const event=next.events[next.events.length-1];
      if(event?.triggered)setMessage('잠복 잉크 '+event.triggered+'개 발동!');
    }catch(e){setMessage(e instanceof Error?e.message:'행동에 실패했습니다.');}
  };
  const reset=()=>{
    if(view&&!view.finished&&!window.confirm('진행 중인 경기를 종료할까요?'))return;
    setView(null);port.current=null;clearSelection();setHandoff(true);setPaused(false);setAiError('');setAiEvaluated(null);
  };

  const togglePause=()=>{clearSelection();setAiError('');setPaused(p=>!p);};
  const retryAI=()=>{clearSelection();setAiError('');setPaused(false);setRetry(r=>r+1);};
  const skipAI=()=>{
    if(!view||!isAI||(!paused&&!aiError)||!port.current)return;
    try{
      const next=port.current.dispatch({kind:'pass'},view.version);
      clearSelection();setAiError('');setView(next);
      setHandoff(!next.finished&&seats[next.active]==='human'&&humanCount>1);
    }catch(e){setAiError(e instanceof Error?e.message:'턴 종료 실패');}
  };

  if(!view){
    const rounds=players*cycles,area=players*rounds*2*factor,diameter=2*Math.sqrt(area/Math.PI);
    return <main className={styles.lobby}>
      <div className={styles.hero}><div className={styles.eyebrow}>ABSTRACT STRATEGY / PROTOTYPE 0.3</div>
        <h1>INK<span>.</span></h1><p>색으로 공간을 점령하고, 건축으로 전장을 바꾸는 입체 영토 전략 게임.</p>
        <div className={styles.colorStripe}><i/><i/><i/><i/></div>
      </div>
      <section className={styles.setup}>
        <div><div className={styles.eyebrow}>LOCAL MATCH</div><h2>새 경기</h2><p>사람과 AI를 자유롭게 배치하는 로컬 대전입니다.</p></div>
        <label>플레이 인원<select value={players} onChange={e=>{setPlayers(Number(e.target.value));setCycles(2);}}>{Array.from({length:7},(_,i)=>i+2).map(n=><option key={n} value={n}>{n}인</option>)}</select></label>
        <label>선턴 순환 횟수<select value={cycles} onChange={e=>setCycles(Number(e.target.value))}>{[1,2,3,4].filter(n=>n*players<=32).map(n=><option key={n} value={n}>{n}회 · {n*players}라운드</option>)}</select></label>
        <label>맵 밀도<select value={factor} onChange={e=>setFactor(Number(e.target.value))}><option value={3}>밀집 · 계수 3</option><option value={4}>표준 · 계수 4</option><option value={5}>넓음 · 계수 5</option></select></label>
        <div className={styles.seatSetup}>
          <div className={styles.sectionLabel}>플레이어 구성 <span>사람 {humanCount} · AI {players-humanCount}</span></div>
          <div className={styles.presets}>
            <button className={styles.secondary} onClick={()=>setSeats([...defaultSeats])}>혼자 대전</button>
            <button className={styles.secondary} onClick={()=>setSeats(Array<Seat>(8).fill('human'))}>전원 사람</button>
            <button className={styles.secondary} onClick={()=>setSeats(Array.from({length:8},(_,i)=>profileKeys[i%profileKeys.length]))}>전원 AI</button>
          </div>
          {seats.slice(0,players).map((seat,i)=><label key={i} className={styles.seatRow}><span><i style={{background:COLORS[i]}}/>P{i+1}</span><select value={seat} onChange={e=>setSeats(old=>old.map((v,j)=>j===i?e.target.value as Seat:v))}><option value="human">사람</option>{profileKeys.map(p=><option key={p} value={p}>{seatLabel(p)}</option>)}</select></label>)}
          {humanCount<players&&<label className={styles.fastOption}><input type="checkbox" checked={fast} onChange={e=>setFast(e.target.checked)}/> 빠른 AI (한 행동만 탐색)</label>}
        </div>
        <div className={styles.metrics}><div><small>맵 지름</small><strong>{fmt(diameter)}</strong></div><div><small>라운드</small><strong>{rounds}</strong></div><div><small>개인 행동력</small><strong>{rounds*2}</strong></div></div>
        {message&&<p className={styles.warning}>{message}</p>}
        <button className={styles.primary} onClick={start}>경기 시작 <span>→</span></button>
      </section>
      <section className={styles.intro}><h2>두 번의 행동, 하나의 목표.</h2><p>매 턴 2개의 행동력을 자유롭게 사용합니다. 잉크는 회수할 수 없고, 서로 다른 색은 상쇄됩니다. 건물은 새로운 표면을 만들며, 마지막 라운드에 가장 넓은 표면을 지배한 사람이 승리합니다.</p><p>선턴은 매 라운드 순환합니다. 잠복 잉크의 위치를 제외한 정보는 모두 공개됩니다.</p><small>v0.3 · AI는 공개 정보 기반 휴리스틱 탐색을 사용합니다. 수치와 표면 계산은 밸런스 검증용입니다.</small></section>
    </main>;
  }

  const current=view.players[view.active];
  const turnOrder=Array.from({length:view.players.length},(_,i)=>view.players[(view.round+i)%view.players.length]);
  const best=Math.max(...view.scores);
  const winners=view.players.filter(p=>Math.abs(view.scores[p.id]-best)<1e-6);
  const chosenLabel=choice.kind==='paint'?WEAPONS[choice.weapon].label:BUILDINGS[choice.building].label;
  const chosenDetail=choice.kind==='paint'?WEAPONS[choice.weapon].detail:BUILDINGS[choice.building].detail;
  const activePreview=handoff||view.finished?null:preview;
  const bombSelected=choice.kind==='paint'&&choice.weapon==='bomb';
  const highBombSelected=bombSelected&&bombOrigin==='high';
  const availableHighSources=view.surfaces.filter(p=>canLaunchBomb(p,view.active));
  const sourceSurface=view.surfaces.find(p=>p.id===source);
  const gunSelected=choice.kind==='paint'&&choice.weapon==='gun';
  const instruction=!source&&highBombSelected?'점유한 건물의 위쪽 표면을 발사점으로 선택하세요.':needsSource(choice)&&!source?'내 영토에서 발사 시작점을 선택하세요.':'보드에서 목표 표면을 선택하세요.';
  const selectedRange=bombSelected?bombRangeAt(highBombSelected?sourceSurface:null,arc):gunSelected&&sourceSurface?gunRangeAt(sourceSurface):null;
  const targetSurface=view.surfaces.find(p=>p.id===target);
  const targetAfter=activePreview?.ok?activePreview.affected.find(p=>p.id===target):undefined;
  const preciseDensity=(n:number)=>String(Number(n.toFixed(6)));

  return <main className={styles.game}>
    <header className={styles.gameHeader}>
      <div><div className={styles.eyebrow}>INK / LOCAL MATCH</div><h1>{view.finished?'경기 종료':'ROUND '+(view.round+1)} <small>/ {view.config.rounds}</small></h1></div>
      <div className={styles.order} aria-label="이번 라운드 순서">{turnOrder.map(p=><span key={p.id} className={p.id===view.active&&!view.finished?styles.orderActive:''} style={{color:p.color}}>{p.name}{seats[p.id]!=='human'?' · AI':''}</span>)}</div>
      <div className={styles.headerButtons}>{humanCount<players&&!view.finished&&<button className={styles.secondary} onClick={togglePause}>{paused?'AI 재개':'AI 일시정지'}</button>}<button className={styles.secondary} onClick={reset}>새 경기</button></div>
    </header>
    <div className={styles.scorePanel}>
      {view.players.map(p=><div className={styles.score} key={p.id} style={{borderColor:p.id===view.active&&!view.finished?p.color:undefined}}>
        <div><i style={{background:p.color}}/>{p.name}{seats[p.id]!=='human'?' · AI':''}{!view.finished&&p.id===view.active&&<small>행동 중</small>}</div>
        <strong style={{color:p.color}}>{fmt(view.scores[p.id])}<small> 면적</small></strong><span className={styles.seatCaption}>{seatLabel(seats[p.id])}</span>
        {activePreview?.ok&&<span className={styles.delta}>{activePreview.scores[p.id]-view.scores[p.id]>=0?'+':''}{fmt(activePreview.scores[p.id]-view.scores[p.id])} 예상</span>}
      </div>)}
      <div className={styles.score}><div>중립</div><strong>{fmt(view.neutral)}</strong><small>총 {fmt(view.total)}</small></div>
    </div>
    <div className={styles.scoreBar}>{view.players.map(p=><span key={p.id} style={{width:(view.scores[p.id]/view.total*100)+'%',background:p.color}}/>)}</div>
    <div className={styles.gameLayout}>
      <section className={styles.boardWrap}>
        <InkBoard key={match} view={view} preview={activePreview} source={handoff?null:source} target={handoff?null:target} hidden={handoff||view.finished} showTraps={!isAI} onPick={pick}/>
        {handoff&&!view.finished&&<div className={styles.curtain}><div className={styles.handoff}>
          <span className={styles.playerDot} style={{background:current.color}}/>
          <div className={styles.eyebrow}>PLAYER HANDOFF</div><h2>{current.name} 차례</h2><p>이전 플레이어는 화면에서 물러나 주세요. 잠복 잉크의 위치는 현재 플레이어에게만 표시됩니다.</p>
          <button className={styles.primary} onClick={()=>setHandoff(false)}>내 턴 시작</button>
        </div></div>}
        {view.finished&&<div className={styles.resultBanner}><div className={styles.eyebrow}>MATCH RESULT</div><h2>{winners.length>1?'공동 1위 · '+winners.map(p=>p.name).join(', '):winners[0].name+' 승리'}</h2><p>최종 소유 면적 {fmt(best)}</p><button className={styles.secondary} onClick={reset}>다시 플레이</button></div>}
      </section>
      <aside className={styles.panel}>
        <div className={styles.panelHead}><div><div className={styles.eyebrow}>ACTION POINTS</div><h2 style={{color:current.color}}>{view.finished?'종료':current.name+'의 턴'}</h2></div><div className={styles.ap}>{[0,1].map(i=><i key={i} style={{background:i<view.ap&&!view.finished?current.color:undefined}}/>)}</div></div>
        {isAI&&<div className={styles.aiStatus}>
          <div className={styles.eyebrow}>AI / {seatLabel(currentSeat)}</div>
          <strong role="status">{aiError?'AI 실행 오류':paused?'AI 일시정지':message||'AI가 행동을 계산하고 있습니다…'}</strong>
          {aiEvaluated!==null&&<small>최근 평가 후보 {aiEvaluated}개</small>}
          {aiError&&<p className={styles.warning}>{aiError}</p>}
          <div className={styles.aiButtons}><button className={styles.secondary} onClick={togglePause}>{paused?'재개':'일시정지'}</button>{aiError&&<button className={styles.secondary} onClick={retryAI}>재시도</button>}{(paused||aiError)&&<button className={styles.secondary} onClick={skipAI}>AI 턴 넘기기</button>}</div>
        </div>}
        <div className={styles.sectionLabel}>도색 <span>1 AP</span></div>
        <div className={styles.tools}>{weapons.map(w=><button key={w} disabled={blocked||view.finished||(w==='ghost'&&current.ghosts===0)} className={choice.kind==='paint'&&choice.weapon===w?styles.selected:''} onClick={()=>select({kind:'paint',weapon:w})}><strong>{WEAPONS[w].label}</strong><small>{w==='ghost'?'남은 '+current.ghosts+'회':w==='brush'?'표면 추종':w==='gun'?'직선 집중':w==='bomb'?'곡선 투척':'수직 투하'}</small></button>)}</div>
        <div className={styles.sectionLabel}>건설 <span>1 AP</span></div>
        <div className={styles.tools}>{buildings.map(b=><button key={b} disabled={blocked||view.finished||current.builds[b]===0} className={choice.kind==='build'&&choice.building===b?styles.selected:''} onClick={()=>select({kind:'build',building:b})}><strong>{BUILDINGS[b].label}</strong><small>남은 {current.builds[b]}개</small></button>)}</div>
        {!view.finished&&!isAI&&<div className={styles.selection}>
          <h3>{chosenLabel}</h3><p>{chosenDetail}</p>{choice.kind==='build'&&<p>중립 및 내 영토에 설치 가능 · 상대 영토는 불가 · 새 표면은 중립</p>}
          {bombSelected&&<>
            <label>발사 위치<select disabled={blocked} value={bombOrigin} onChange={e=>{setBombOrigin(e.target.value as 'base'|'high');clearSelection();}}><option value="base">본진에서 투척</option><option value="high" disabled={availableHighSources.length===0}>점유한 고지대에서 투척 ({availableHighSources.length}개 표면)</option></select></label>
            {availableHighSources.length===0&&<p>건물의 위쪽 표면을 농도 0.5 이상으로 칠하면 고지대 투척을 사용할 수 있습니다.</p>}
            <label>궤적<select disabled={blocked} value={arc} onChange={e=>{const next=e.target.value as 'low'|'high';setArc(next);if(target)requestPreview(target,source,next);}}><option value="low">낮은 투척 · 사거리 {fmt(bombRangeAt(highBombSelected?sourceSurface:null,'low'))}</option><option value="high">높은 투척 · 사거리 {fmt(bombRangeAt(highBombSelected?sourceSurface:null,'high'))}</option></select></label>
          </>}
          {selectedRange!==null&&(!highBombSelected||sourceSurface)&&<p className={styles.target}>현재 사거리 <strong>{fmt(selectedRange)}</strong>{sourceSurface?' · 발사 높이 '+fmt(sourceSurface.center[1]):' · 본진'}</p>}
          {choice.kind==='build'&&<label>회전<select disabled={blocked} value={rotation} onChange={e=>{const n=Number(e.target.value);setRotation(n);if(target)requestPreview(target,source,arc,n);}}>{[0,1,2,3].map(n=><option key={n} value={n}>{n*90}°</option>)}</select></label>}
          <p className={styles.instruction}>{instruction}</p>
          {source&&<button className={styles.textButton} onClick={clearSelection}>발사점 다시 선택</button>}
          {targetSurface&&<p className={styles.target}>목표: {targetSurface.building?'건물 표면':'지면'} · 농도 <strong>{preciseDensity(targetSurface.density)}{targetAfter?' → '+preciseDensity(targetAfter.density):''}</strong></p>}
          {activePreview&&<p className={activePreview.ok?styles.previewText:styles.warning}>{activePreview.message}</p>}
          {message&&!handoff&&<p role="status" className={styles.warning}>{message}</p>}
          <button className={styles.primary} disabled={blocked||!target||!activePreview?.ok} onClick={()=>{if(target)submit(makeCommand(choice,target,source,arc,rotation));}}>행동 확정 <span>1 AP</span></button>
          <button className={styles.secondary} disabled={blocked} onClick={()=>submit({kind:'pass'})}>남은 행동 포기 / 턴 종료</button>
        </div>}
        <div className={styles.log}><div className={styles.sectionLabel}>최근 행동</div>{view.events.length===0?<p>아직 행동 기록이 없습니다.</p>:view.events.slice(-5).reverse().map(e=><div key={e.id}><span style={{color:view.players[e.player].color}}>{view.players[e.player].name}</span><span>{e.label}{e.triggered?' · 잠복 발동 '+e.triggered:''}</span><small>R{e.round}</small></div>)}</div>
      </aside>
    </div>
    <div className={styles.footnote}>표면의 숫자는 잉크 농도(소수 첫째 자리 기준) · 미리보기에서는 도색 후 농도 · 표면적 기준 득점 · 최소 농도 0.5 · 노출 표면만 집계 · 보라색 외곽선은 내 잠복 잉크 · 미리보기는 숨겨진 잉크를 제외한 공개 정보로 계산합니다. 건물은 중립 또는 내 영토인 지면에만 건설할 수 있습니다. 상대 영토, 본진 및 기존 건물과 겹칠 수 없습니다. 고지대 투척은 내 색의 위쪽 표면에서 가능하며, 잉크 건과 폭탄의 사거리는 발사점 높이 × 1.5만큼 증가합니다.</div>
  </main>;
}
