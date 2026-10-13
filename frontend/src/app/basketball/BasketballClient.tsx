'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { ACTIONS, ACTION_LIST, ATTRIBUTE_LABELS, cancelQueue, commandDribbleCost, chooseAIAction, createGame, exportReplay, getObservation, queueActions, replayGame, runAIDecision, submitAction, submitQueuedAction, validateAction, type ActionCommand, type ActionDefinition, type ActionId, type Difficulty, type GameEvent, type PlayerId, type ReplayData, type Vec2 } from '@/lib/basketball';
import type { StatisticsReport } from '@/lib/basketball/statistics';
import { Court, PlayerCard } from './Court';
import Settings from './Settings';
import styles from './BasketballClient.module.css';

type Mode = 'offense' | 'defense' | 'hotseat' | 'auto';
type IconName = 'ball' | 'settings' | 'restart' | 'play' | 'pause' | 'shield' | 'people' | 'chart' | 'lock' | 'arrow' | 'download' | 'upload' | 'trophy' | 'clock';
const MODES: { id: Mode; title: string; subtitle: string; icon: IconName }[] = [
    { id: 'offense', title: '공격으로 시작', subtitle: '플레이어 1 vs AI', icon: 'ball' },
    { id: 'defense', title: '수비로 시작', subtitle: 'AI vs 플레이어 2', icon: 'shield' },
    { id: 'hotseat', title: '로컬 2인 대전', subtitle: '선택은 비밀, 결과는 동시', icon: 'people' },
    { id: 'auto', title: 'AI 자동 대전', subtitle: '관전하고 분석하기', icon: 'chart' },
];
const CATEGORIES: Record<ActionDefinition['category'], string> = { dribble: '드리블', movement: '이동', footwork: '풋워크', shot: '슛', defense: '수비', recovery: '회복', ball: '볼 경합' };
const DIRECTIONS: { label: string; symbol: string; value: Vec2 }[] = [
    { label: '왼쪽 앞', symbol: '↖', value: { x: -1, y: -1 } }, { label: '골대 방향', symbol: '↑', value: { x: 0, y: -1 } }, { label: '오른쪽 앞', symbol: '↗', value: { x: 1, y: -1 } },
    { label: '왼쪽', symbol: '←', value: { x: -1, y: 0 } }, { label: '행동 기본 방향', symbol: '·', value: { x: 0, y: 0 } }, { label: '오른쪽', symbol: '→', value: { x: 1, y: 0 } },
    { label: '왼쪽 뒤', symbol: '↙', value: { x: -1, y: 1 } }, { label: '뒤쪽', symbol: '↓', value: { x: 0, y: 1 } }, { label: '오른쪽 뒤', symbol: '↘', value: { x: 1, y: 1 } },
];
const other = (id: PlayerId): PlayerId => id === 'p1' ? 'p2' : 'p1';
const percent = (value: number | null) => value === null ? '—' : `${(value * 100).toFixed(1)}%`;
function Icon({ name }: { name: IconName }) {
    const paths: Record<IconName, ReactNode> = {
        ball: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3v18M5.6 5.6c7 2 7 10.8 0 12.8M18.4 5.6c-7 2-7 10.8 0 12.8" /></>,
        settings: <><path d="M4 7h16M4 17h16" /><circle cx="8" cy="7" r="3" /><circle cx="16" cy="17" r="3" /></>,
        restart: <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" />, play: <path d="m8 4 12 8-12 8z" />, pause: <path d="M8 4v16M16 4v16" />,
        shield: <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6" />,
        people: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v2" /></>,
        chart: <path d="M4 3v17h17M8 15v-4M13 15V6M18 15v-7" />,
        lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" /></>,
        arrow: <path d="M4 12h16M14 6l6 6-6 6" />, download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />, upload: <path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5" />,
        trophy: <path d="M7 3h10v7a5 5 0 0 1-10 0zM7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 15v5M7 21h10" />,
        clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    };
    return <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function downloadJson(value: unknown, filename: string) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function EventDetails({ event }: { event: GameEvent }) {
    if (!event.data) return null;
    return <div className={styles.eventDetail}>{Object.entries(event.data).filter(([, value]) => typeof value !== 'object').slice(0, 7).map(([key, value]) => <span key={key}>{key}: {typeof value === 'number' ? (/probability|chance|rate/i.test(key) ? percent(value) : Number(value.toFixed(3))) : String(value)}</span>)}</div>;
}

/** UI는 명령을 전달하고 공개 상태를 그릴 뿐 결과를 계산하거나 엔진 상태를 수정하지 않는다. */
export default function BasketballClient() {
    const [game, setGame] = useState(() => createGame({}, 20261013, [{ name: '플레이어 1' }, { name: '플레이어 2' }]));
    const [mode, setMode] = useState<Mode>('offense');
    const [difficulty, setDifficulty] = useState<Difficulty>('normal');
    const [hotseatPlayer, setHotseatPlayer] = useState<PlayerId>('p1');
    const [handoff, setHandoff] = useState(false);
    const [selected, setSelected] = useState<ActionId>('NormalDribble');
    const [category, setCategory] = useState<ActionDefinition['category']>('dribble');
    const [selectionDecision, setSelectionDecision] = useState(-1);
    const [draftQueue, setDraftQueue] = useState<ActionCommand[]>([]);
    const [direction, setDirection] = useState(4);
    const [speed, setSpeed] = useState(.7);
    const [hand, setHand] = useState<'left' | 'right'>(() => game.players[0].ballHand);
    const [prediction, setPrediction] = useState(1);
    const [gap, setGap] = useState(1.4);
    const [release, setRelease] = useState(0);
    const [message, setMessage] = useState('');
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [autoRunning, setAutoRunning] = useState(false);
    const [replayAt, setReplayAt] = useState<number | null>(null);
    const [replayPlaying, setReplayPlaying] = useState(false);
    const [statistics, setStatistics] = useState<StatisticsReport | null>(null);
    const [statsProgress, setStatsProgress] = useState<number | null>(null);
    const [statsError, setStatsError] = useState('');
    const worker = useRef<Worker | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const activeId: PlayerId = mode === 'defense' ? 'p2' : mode === 'hotseat' ? hotseatPlayer : 'p1';
    const observation = getObservation(game, activeId);
    const isOffense = game.offenseId === activeId;
    const roleActions = ACTION_LIST.filter(action => action.role === 'both' || action.role === (isOffense ? 'offense' : 'defense') || observation.legalActions.some(legal => legal.id === action.id));
    const categoryOrder: ActionDefinition['category'][] = isOffense ? ['dribble', 'shot', 'footwork', 'movement', 'recovery', 'ball', 'defense'] : ['defense', 'recovery', 'movement', 'ball'];
    const categories = categoryOrder.filter(value => roleActions.some(action => action.category === value));
    const continuing = observation.legalActions.find(action => action.id === 'ContinueAction');
    const defaultContinue = continuing && selectionDecision !== game.decisionId;
    const activeCategory = defaultContinue ? continuing.category : categories.includes(category) ? category : categories[0];
    const filteredActions = roleActions.filter(action => action.category === activeCategory);
    const picked = (defaultContinue ? continuing : undefined) ?? filteredActions.find(action => action.id === selected) ?? filteredActions.find(action => observation.legalActions.some(legal => legal.id === action.id)) ?? filteredActions[0];
    const command: ActionCommand = picked.id === 'ContinueAction' ? { actionId: picked.id } : { actionId: picked.id, direction: direction === 4 ? undefined : DIRECTIONS[direction].value, speed, hand: isOffense ? hand : undefined, anticipatedDirection: !isOffense ? DIRECTIONS[prediction].value : undefined, desiredGap: !isOffense ? gap : undefined, releaseTiming: picked.category === 'shot' ? release : undefined };
    const validateChoice = (candidate: ActionCommand) => {
        if (!draftQueue.length) return validateAction(game, activeId, candidate);
        const planned = queueActions(game, activeId, [...draftQueue, candidate]);
        return { valid: !planned.error, error: planned.error };
    };
    const validation = validateChoice(command);
    const replayData = useMemo(() => exportReplay(game), [game]);
    const displayGame = useMemo(() => replayAt === null ? game : replayGame({ ...replayData, operations: undefined, decisions: replayData.decisions.slice(0, replayAt) }), [game, replayAt, replayData]);
    const attacker = displayGame.players.find(player => player.playerId === displayGame.offenseId)!;
    const distance = Math.hypot(displayGame.players[0].position.x - displayGame.players[1].position.x, displayGame.players[0].position.y - displayGame.players[1].position.y);
    const isReplay = replayAt !== null;
    const replayIsPlaying = replayPlaying && replayAt !== null && replayAt < replayData.decisions.length;
    const events = displayGame.events.filter(event => !['movement', 'action_end', 'decision_point'].includes(event.type)).slice(-24).reverse();
    const closeSettings = useCallback(() => setSettingsOpen(false), []);
    useEffect(() => {
        if (!autoRunning || mode !== 'auto' || isReplay || game.status === 'finished') return;
        const timer = setInterval(() => setGame(current => current.status === 'playing' ? runAIDecision(current, difficulty) : current), 700);
        return () => clearInterval(timer);
    }, [autoRunning, mode, difficulty, isReplay, game.status]);
    useEffect(() => {
        if (!replayPlaying || replayAt === null || replayAt >= replayData.decisions.length) return;
        const timer = setInterval(() => setReplayAt(current => Math.min((current ?? 0) + 1, replayData.decisions.length)), 650);
        return () => clearInterval(timer);
    }, [replayPlaying, replayAt, replayData.decisions.length]);
    useEffect(() => () => worker.current?.terminate(), []);
    // 규칙이나 선수가 바뀌면 이전 설정으로 계산한 통계와 늦게 도착하는 결과를 폐기한다.
    const invalidateStatistics = () => {
        worker.current?.terminate(); worker.current = null;
        setStatistics(null); setStatsProgress(null); setStatsError('');
    };
    const resetControls = (nextState = game, nextPlayerId: PlayerId = activeId) => { setSelected('NormalDribble'); setCategory('dribble'); setDirection(4); setSpeed(.7); setHand(nextState.players[nextPlayerId === 'p1' ? 0 : 1].ballHand); setPrediction(1); setGap(1.4); setRelease(0); setSelectionDecision(-1); setDraftQueue([]); };
    const startGame = (nextMode = mode, config = game.config, seed = game.seed, players = game.initialPlayers) => {
        const next = createGame({ ...config, initialOffenseId: 'p1' }, seed, players);
        invalidateStatistics();
        setGame(next); setMode(nextMode); setAutoRunning(false); setReplayAt(null); setReplayPlaying(false); setMessage(''); setHotseatPlayer('p1'); setHandoff(nextMode === 'hotseat'); resetControls(next, nextMode === 'defense' ? 'p2' : 'p1');
    };
    const changeMode = (nextMode: Mode) => {
        if (nextMode === mode) return;
        if (game.history.length > 0 && !window.confirm('모드를 바꾸면 진행 중인 경기가 초기화됩니다. 새 경기를 시작할까요?')) return;
        startGame(nextMode);
    };
    const restart = () => {
        if (game.history.length > 0 && !window.confirm('같은 시드와 설정으로 새 경기를 시작할까요? 저장하지 않은 리플레이는 사라집니다.')) return;
        startGame();
    };
    const submit = () => {
        setMessage('');
        try {
            // 새 예약은 순서대로 제출하며 선택된 마지막 행동을 중복 실행하지 않는다.
            let prepared = game;
            if (draftQueue.length > 0) {
                const result = queueActions(prepared, activeId, draftQueue);
                if (result.error) { setMessage(result.error); return; }
                prepared = result.state;
            }
            if (mode === 'hotseat') {
                const result = draftQueue.length ? submitQueuedAction(prepared, activeId, game.decisionId) : submitAction(prepared, activeId, game.decisionId, command);
                if (result.error) { setMessage(result.error); return; }
                setGame(result.state);
                const nextId: PlayerId = result.state.submissions.p1 ? 'p2' : 'p1';
                setHotseatPlayer(nextId); setHandoff(result.state.status === 'playing'); resetControls(result.state, nextId); return;
            }
            // 상대 AI는 제출 전의 공개 관찰만으로 선택한다.
            const aiId = other(activeId);
            const aiCommand = chooseAIAction(getObservation(game, aiId), difficulty);
            let next = prepared;
            if (!observation.ownSubmitted) {
                const result = draftQueue.length ? submitQueuedAction(next, activeId, next.decisionId) : submitAction(next, activeId, next.decisionId, command);
                if (result.error) { setMessage(result.error); return; }
                next = result.state;
            }
            if (next.decisionId === game.decisionId && !next.submissions[aiId]) {
                const result = submitAction(next, aiId, next.decisionId, aiCommand);
                if (result.error) { setMessage(result.error); return; }
                next = result.state;
            }
            setGame(next); setDraftQueue([]); if (next.offenseId !== game.offenseId) resetControls(next, activeId);
        } catch (error) { setMessage(error instanceof Error ? error.message : '명령을 처리할 수 없습니다.'); }
    };
    const addQueue = () => {
        const planned = [...draftQueue, command];
        const result = queueActions(game, activeId, planned);
        if (result.error) setMessage(result.error); else { setDraftQueue(planned); setMessage(''); }
    };
    const clearQueue = () => { setDraftQueue([]); const result = cancelQueue(game, activeId); setGame(result.state); setMessage(result.error ?? ''); };
    const importReplay = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
        setAutoRunning(false); setReplayPlaying(false);
        try {
            if (file.size > 5_000_000) throw new Error('리플레이 파일은 5MB 이하만 읽을 수 있습니다.');
            const parsed: ReplayData = JSON.parse(await file.text());
            if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.decisions) || parsed.decisions.length > 5000) throw new Error('지원하지 않는 리플레이입니다. 버전 1, 최대 5,000개 결정점을 지원합니다.');
            const restored = replayGame(parsed);
            invalidateStatistics();
            setGame(restored); setReplayAt(0); setMode('auto'); setHandoff(false); setMessage('리플레이를 검증하고 불러왔습니다. 타임라인으로 각 결정점을 재생하세요.');
        } catch (error) { setMessage(error instanceof Error ? error.message : '리플레이 파일을 읽을 수 없습니다.'); }
    };
    const runStatistics = () => {
        invalidateStatistics(); setStatsProgress(0);
        try {
            const current = new Worker(new URL('./statistics.worker.ts', import.meta.url)); worker.current = current;
            current.onmessage = (event: MessageEvent<{ done?: boolean; progress?: number; report?: StatisticsReport; error?: string }>) => {
                if (worker.current !== current) return;
                if (event.data.error) { setStatsError(event.data.error); setStatsProgress(null); current.terminate(); worker.current = null; return; }
                if (event.data.report) setStatistics(event.data.report);
                setStatsProgress(event.data.done ? null : event.data.progress ?? 0);
                if (event.data.done) { current.terminate(); worker.current = null; }
            };
            current.onerror = () => { if (worker.current !== current) return; setStatsError('통계 작업을 실행할 수 없습니다. 새로고침 후 다시 시도해 주세요.'); setStatsProgress(null); current.terminate(); worker.current = null; };
            current.postMessage({ seed: game.seed, possessions: 10000, games: 100, difficulty, players: game.initialPlayers, config: game.config });
        } catch (error) { setStatsError(error instanceof Error ? error.message : '통계 작업 시작 실패'); setStatsProgress(null); }
    };
    const cancelStatistics = () => { worker.current?.terminate(); worker.current = null; setStatsProgress(null); setStatsError('검증을 중지했습니다. 표시된 결과는 중지 시점까지의 표본입니다.'); };
    const chooseCategory = (value: ActionDefinition['category']) => { setCategory(value); setSelectionDecision(game.decisionId); setSelected(roleActions.find(a => a.category === value && observation.legalActions.some(l => l.id === a.id))?.id ?? roleActions.find(a => a.category === value)!.id); };
    return <main className={styles.page}>
        <header className={styles.hero}><div><div className={styles.eyebrow}><span className={styles.dot} /> 1 ON 1 · TURN-BASED BASKETBALL</div><h1>한 수 앞의 농구</h1><p>세 번의 드리블. 공간을 읽고, 다음 한 수를 선택하세요.</p></div><div className={styles.heroActions}><button className={styles.button} onClick={() => { setAutoRunning(false); setSettingsOpen(true); }}><Icon name="settings" />경기 설정</button><button className={styles.button} onClick={restart}><Icon name="restart" />다시 시작</button></div></header>
        <div className={styles.modeBar} aria-label="대전 모드">{MODES.map(item => <button key={item.id} className={`${styles.modeButton} ${mode === item.id ? styles.modeActive : ''}`} aria-pressed={mode === item.id} onClick={() => changeMode(item.id)}><Icon name={item.icon} /><span><strong>{item.title}</strong><small>{item.subtitle}</small></span></button>)}</div>
        {message && <p className={styles.notice} role="status">{message}</p>}
        <div className={styles.mainGrid}><div className={styles.courtColumn}>
            <section className={styles.arena} aria-label="농구 코트와 스코어">
                <div className={styles.scoreboard}><div className={styles.scoreSide}><i className={styles.playerDot} /><div><div className={styles.scoreName}>{displayGame.players[0].name}</div><div className={styles.scoreRole}>{mode === 'offense' ? 'YOU' : mode === 'hotseat' ? 'PLAYER 01' : 'AI'} · {displayGame.offenseId === 'p1' ? '공격' : '수비'}</div></div><strong className={styles.scoreNumber}>{displayGame.score.p1}</strong></div><div className={styles.scoreCenter}><b>HALF COURT</b>{displayGame.config.targetScore}점 선승</div><div className={styles.scoreSide}><strong className={styles.scoreNumber}>{displayGame.score.p2}</strong><div><div className={styles.scoreName}>{displayGame.players[1].name}</div><div className={styles.scoreRole}>{mode === 'defense' ? 'YOU' : mode === 'hotseat' ? 'PLAYER 02' : 'AI'} · {displayGame.offenseId === 'p2' ? '공격' : '수비'}</div></div><i className={`${styles.playerDot} ${styles.blueDot}`} /></div></div>
                <div className={styles.courtHeader}><span className={styles.live}><i />{isReplay ? 'REPLAY' : displayGame.status === 'finished' ? 'FINAL' : 'DECISION POINT'} {displayGame.decisionId}</span><span>포제션 {displayGame.possession} · 경기 {displayGame.time.toFixed(1)}초</span></div>
                <Court game={displayGame} activeId={activeId} command={command} action={picked} preview={!isReplay && !handoff && mode !== 'auto' && game.status === 'playing' && !observation.ownSubmitted} />
                <div className={styles.courtFoot}><div className={styles.courtMetric}><span>SHOT CLOCK</span><strong className={displayGame.shotClock <= 3 ? styles.clockLow : ''}>{displayGame.shotClock.toFixed(1)}<small>초</small></strong></div><div className={styles.courtMetric}><span>남은 드리블 {Math.max(0, displayGame.config.maxDribbles - attacker.dribblesUsed)} / {displayGame.config.maxDribbles}</span><div className={styles.dribbleDots}>{Array.from({ length: displayGame.config.maxDribbles }, (_, n) => n).map(n => <i key={n} className={`${styles.dribbleDot} ${n < attacker.dribblesUsed ? styles.dribbleUsed : ''}`} />)}</div></div><div className={styles.courtMetric}><span>수비 간격</span><strong>{distance.toFixed(1)}<small>m</small></strong></div></div>
                <div className={styles.legend}><span><i className={styles.playerDot} />플레이어 1</span><span><i className={`${styles.playerDot} ${styles.blueDot}`} />플레이어 2</span><span><i className={styles.dash} />입력 방향 참고선</span></div>
            </section>
            <div className={styles.playerCards}>{displayGame.players.map(player => <PlayerCard key={player.playerId} player={player} offense={displayGame.offenseId === player.playerId} />)}</div>
            <section className={styles.card}><div className={styles.cardHead}><h2><Icon name="clock" />리플레이 타임라인</h2><span>{game.history.length}개 결정점</span></div><div className={styles.timeline}><button className={styles.button} aria-label={replayIsPlaying ? '리플레이 일시 정지' : '리플레이 재생'} disabled={game.history.length === 0} onClick={() => { setAutoRunning(false); if (replayAt === null || replayAt >= game.history.length) setReplayAt(0); setReplayPlaying(!replayIsPlaying); }}><Icon name={replayIsPlaying ? 'pause' : 'play'} /></button><div className={styles.timelineTrack}><input aria-label="리플레이 결정점" type="range" min="0" max={Math.max(1, game.history.length)} value={replayAt ?? game.history.length} disabled={game.history.length === 0} onChange={e => { setAutoRunning(false); setReplayPlaying(false); setReplayAt(Number(e.target.value)); }} /><div><span>체크볼</span><span>{isReplay ? `${replayAt} / ${game.history.length}` : '현재 경기'}</span></div></div>{isReplay && <button className={styles.button} onClick={() => { setReplayAt(null); setReplayPlaying(false); }}>현재</button>}</div><div className={styles.replayActions}><button className={styles.button} onClick={() => downloadJson(mode === 'hotseat' && game.status === 'playing' ? { ...exportReplay(game), operations: undefined } : exportReplay(game), `basketball-replay-${game.seed}.json`)}><Icon name="download" />JSON 저장</button><button className={styles.button} onClick={() => fileInput.current?.click()}><Icon name="upload" />불러오기</button><input className={styles.hiddenInput} ref={fileInput} type="file" accept="application/json,.json" aria-label="리플레이 JSON 파일" onChange={importReplay} /><span>SEED {game.seed}</span></div></section>
        </div><div className={styles.controlColumn}>
            <section className={styles.card}><div className={styles.cardHead}><h2><Icon name={isOffense ? 'ball' : 'shield'} />{mode === 'auto' ? '벤치에서 관전하기' : '다음 행동 선택'}</h2><span>양측 확정 후 동시 실행</span></div>
                {isReplay ? <div className={styles.autoPanel}><Icon name="clock" /><h3>다시 보는 한 수</h3><p>시드와 실제 명령 기록으로 재현한 경기입니다.<br />현재 경기로 돌아가면 계속 플레이할 수 있어요.</p><button className={styles.primaryButton} onClick={() => { setReplayAt(null); setReplayPlaying(false); }}>현재 경기로 돌아가기</button></div>
                    : game.status === 'finished' ? <div className={styles.finished}><Icon name="trophy" /><h3>{game.winner ? `${game.players.find(p => p.playerId === game.winner)!.name} 승리!` : '경기 종료'}</h3><p>{game.score.p1} : {game.score.p2} · {game.possession} 포제션<br />리플레이를 저장하고 다른 전략으로 도전해 보세요.</p><button className={styles.amberButton} onClick={restart}>한 경기 더</button></div>
                    : handoff && mode === 'hotseat' ? <div className={styles.handoff}><Icon name="lock" /><h3>{game.players.find(p => p.playerId === hotseatPlayer)!.name} 차례</h3><p>이전 선택은 숨겨졌습니다.<br />다음 플레이어에게 화면을 넘긴 뒤 눌러 주세요.</p><button className={styles.primaryButton} onClick={() => setHandoff(false)}>준비됐어요 · 내 선택 보기</button></div>
                    : mode === 'auto' ? <div className={styles.autoPanel}><Icon name="chart" /><h3>두 AI의 수 싸움</h3><p>같은 능력치, 같은 규칙, 공개된 정보만으로<br />공격과 수비가 독립적으로 판단합니다.</p><div className={styles.autoButtons}><button className={styles.primaryButton} onClick={() => setAutoRunning(!autoRunning)}><Icon name={autoRunning ? 'pause' : 'play'} />{autoRunning ? '일시 정지' : '자동 대전 시작'}</button><button className={styles.button} disabled={autoRunning} onClick={() => setGame(runAIDecision(game, difficulty))}>한 턴</button></div></div>
                    : <div className={styles.controls}><div className={styles.turnInfo}><Icon name={isOffense ? 'ball' : 'shield'} /><div><strong>{observation.players.find(p => p.playerId === activeId)!.name} · {isOffense ? '공격' : '수비'} 차례</strong><small>{observation.ownSubmitted ? '예약한 명령이 잠겼습니다. 상대 선택 후 실행됩니다.' : `${game.decisionReason} · 상대의 다음 선택은 비공개`}</small></div></div>
                        {!observation.ownSubmitted && <><div className={styles.sectionLabel}>01. 어떤 플레이를 할까요?<small>상태에 맞는 행동만 선택 가능</small></div><div className={styles.categories}>{categories.map(value => <button key={value} className={`${styles.category} ${activeCategory === value ? styles.categoryActive : ''}`} aria-pressed={activeCategory === value} onClick={() => chooseCategory(value)}>{CATEGORIES[value]}</button>)}</div><div className={styles.actionGrid}>{filteredActions.map(action => { const candidate = { ...command, actionId: action.id }; const legal = validateChoice(candidate); const cost = commandDribbleCost(candidate, game, activeId); return <button key={action.id} className={`${styles.action} ${picked.id === action.id ? styles.actionSelected : ''}`} disabled={!legal.valid} title={legal.valid ? action.description : legal.error} aria-pressed={picked.id === action.id} onClick={() => { setSelected(action.id); setSelectionDecision(game.decisionId); }}><strong>{action.name}</strong><small>{action.duration.toFixed(2)}초 · {cost ? `드리블 −${cost}` : `기본 체력 −${action.staminaCost}`} </small></button>; })}</div><p className={styles.actionDescription}>{picked.description}<br />주요 능력: {picked.primaryAttributes.map(key => ATTRIBUTE_LABELS[key]).join(' · ')}</p>
                            {picked.id === 'ContinueAction' ? <p className={styles.notice}>진행 중인 행동의 방향·속도·타이밍을 그대로 이어갑니다. 새 선택은 허용된 중단 시점에 할 수 있어요.</p> : <><div className={styles.controlRow}><div><div className={styles.sectionLabel}>02. 이동 방향<small>{direction === 4 ? '기본' : DIRECTIONS[direction].symbol}</small></div><div className={styles.directionGrid}>{DIRECTIONS.map((item, index) => <button key={item.label} className={`${styles.direction} ${direction === index ? styles.directionActive : ''}`} aria-label={item.label} title={item.label} aria-pressed={direction === index} onClick={() => setDirection(index)}>{item.symbol}</button>)}</div></div><div className={styles.fields}><label><span className={styles.sectionLabel}>목표 속도<small>{Math.round(speed * 100)}%</small></span><input aria-label="목표 속도" type="range" min="0" max="1" step=".05" value={speed} onChange={e => setSpeed(Number(e.target.value))} /></label>{isOffense && <div><div className={styles.sectionLabel}>공을 다루는 손</div><div className={styles.inlineChoices}><button className={hand === 'left' ? styles.choiceActive : ''} aria-pressed={hand === 'left'} onClick={() => setHand('left')}>왼손</button><button className={hand === 'right' ? styles.choiceActive : ''} aria-pressed={hand === 'right'} onClick={() => setHand('right')}>오른손</button></div></div>}</div></div>
                            {!isOffense && <div className={styles.defenseControls}><label className={styles.settingField}>예상 돌파 방향<select className={styles.select} value={prediction} onChange={e => setPrediction(Number(e.target.value))}>{DIRECTIONS.map((item, index) => <option key={item.label} value={index}>{item.symbol} {item.label}</option>)}</select></label><label className={styles.settingField}>유지 간격 · {gap.toFixed(1)}m<input aria-label="수비 유지 간격" type="range" min=".5" max="4" step=".1" value={gap} onChange={e => setGap(Number(e.target.value))} /></label></div>}
                            {picked.category === 'shot' && <div className={styles.fields} style={{ marginTop: 16 }}><label>릴리스 타이밍 · {release === 0 ? '정박' : release < 0 ? '빠르게' : '늦게'}<input aria-label="슛 릴리스 타이밍" type="range" min="-1" max="1" step=".1" value={release} onChange={e => setRelease(Number(e.target.value))} /></label></div>}</>}
                        </>}
                        <div className={styles.queue}><div className={styles.sectionLabel}>예약 행동 <small>{observation.ownQueue.length + draftQueue.length} / {game.config.maxQueueLength}</small>{(observation.ownQueue.length > 0 || draftQueue.length > 0) && <button className={styles.textButton} onClick={clearQueue}>예약 취소</button>}</div>{(observation.ownQueue.length > 0 || draftQueue.length > 0) ? <div className={styles.queueItems}>{[...observation.ownQueue, ...draftQueue].map((item, index) => <span className={styles.queueItem} key={index}>{index + 1}. {ACTIONS[item.actionId].name}</span>)}</div> : <p className={styles.queueEmpty}>선택을 예약에 추가하면 목록 순서대로 제출합니다. 상황이 바뀌면 다시 검증해요.</p>}<div className={styles.submitRow}><button className={styles.button} disabled={!validation.valid || observation.ownSubmitted || picked.id === 'ContinueAction'} onClick={addQueue}>+ 예약에 추가</button><button className={styles.primaryButton} disabled={!observation.ownSubmitted && !draftQueue.length && !validation.valid} onClick={submit}>{observation.ownSubmitted ? '예약 명령 진행' : draftQueue.length ? `예약 ${draftQueue.length}개 제출` : mode === 'hotseat' ? '선택 잠그기' : '명령 제출'}<Icon name="arrow" /></button></div>{!validation.valid && !observation.ownSubmitted && <p className={styles.diagnostic} role="status">{validation.error}</p>}</div>
                    </div>}
            </section>
            <section className={styles.card}><div className={styles.cardHead}><h2>플레이 로그</h2><span>판정 근거 · 확률 공개</span></div><div className={styles.logList} aria-label="경기 이벤트 기록">{events.length ? events.map(event => <div className={styles.logItem} key={event.id}><time className={styles.logTime}>{event.time.toFixed(1)}s</time><div><p className={`${styles.logText} ${['score', 'steal', 'block', 'game_over'].includes(event.type) ? styles.logImportant : ''}`}>{event.message}</p><EventDetails event={event} /></div></div>) : <p className={styles.emptyLog}>첫 번째 플레이를 선택해 주세요.</p>}</div></section>
        </div></div>
        <div className={styles.bottomGrid}><section className={styles.card}><div className={styles.cardHead}><h2>처음이라면, 이것만 기억하세요</h2><span>PLAYBOOK</span></div><div className={styles.help}>
            {[
                ['한 번의 공격, 세 개의 드리블 행동', '3회 제한은 이 게임만의 특별 규칙입니다. 공이 튀는 횟수가 아니라 일반 드리블, 크로스오버 같은 행동 한 단위를 셉니다. 예약과 복합 기술도 각각 계산하며, 라이브 드리블 중 걷기·스프린트도 한 단위를 사용해요.'],
                ['상대의 선택을 읽고, 동시에 움직이세요', '공격과 수비가 모두 확정해야 시간이 흐릅니다. 수비도 방향·간격·예측·스틸·컨테스트를 직접 선택해요. 점선은 입력 방향 참고선이며 실제 이동은 두 선수의 위치와 상태에 따라 달라집니다.'],
                ['공을 잡은 다음에는 풋워크가 중요해요', '개더, 볼 보호, 슛 페이크로 드리블을 끝내면 다시 시작할 수 없습니다. 허용된 스텝과 피벗을 활용하세요. 정상 소유권 전환 후 역할이 바뀌고 드리블 횟수가 초기화됩니다.'],
                ['같은 시드와 명령은 같은 결과를 만듭니다', '리플레이 JSON에는 설정과 실제 명령이 저장됩니다. 로컬 대전 중에는 완료된 선택만 저장해 비밀을 지킵니다. 로컬 2인은 한 화면을 번갈아 사용하며 온라인 멀티플레이는 제공하지 않습니다. 게임과 통계는 브라우저 안에서만 실행됩니다.'],
            ].map(([title, description], index) => <div className={styles.helpItem} key={title}><span className={styles.helpNumber}>0{index + 1}</span><div><strong>{title}</strong><p>{description}</p></div></div>)}
        </div></section><section className={styles.card}><div className={styles.cardHead}><h2><Icon name="chart" />시뮬레이션 랩</h2><span>LOCAL · SEEDED</span></div><div className={styles.statsBody}><p>현재 규칙과 선수 능력치로 최소 10,000포제션 · 100경기를 자동 검증합니다. 별도 작업 스레드에서 계산하므로 플레이를 계속할 수 있어요.</p><div className={styles.statsGrid}>{[
            ['검증 포제션', statistics ? statistics.completedPossessions.toLocaleString() : '—'], ['평균 공격 시간', statistics ? `${statistics.averagePossessionSeconds.toFixed(1)}s` : '—'], ['슛 성공률', statistics ? percent(statistics.shooting.rate) : '—'], ['평균 드리블', statistics ? statistics.averageDribbles.toFixed(2) : '—'], ['턴오버 비율', statistics ? percent(statistics.turnoverRate) : '—'], ['스틸 성공률', statistics ? percent(statistics.steals.rate) : '—'],
        ].map(([label, value]) => <div className={styles.statBox} key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
            {statsProgress !== null ? <><div className={styles.progress} role="progressbar" aria-label="통계 검증 진행" aria-valuenow={Math.round(statsProgress * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${statsProgress * 100}%` }} /></div><div className={styles.statsProgress}>검증 중 · {(statsProgress * 100).toFixed(1)}% <button className={styles.textButton} onClick={cancelStatistics}>중지</button></div></> : <div className={styles.replayActions} style={{ padding: 0 }}><button className={styles.button} onClick={runStatistics}><Icon name="play" />10,000포제션 검증</button>{statistics && <button className={styles.button} onClick={() => downloadJson(statistics, `basketball-statistics-${statistics.seed}.json`)}><Icon name="download" />전체 통계 저장</button>}</div>}
            {statsError && <p className={styles.diagnostic} role="alert">{statsError}</p>}
            {statistics && <><p className={styles.diagnostic}>{statistics.completedGames}경기 · 블록 {percent(statistics.blocks.rate)} · 돌파 {percent(statistics.breakthrough.rate)} · 평균 결정점 {statistics.averageDecisionPoints.toFixed(1)} · 파울/공격 {statistics.foulsPerPossession.toFixed(2)} · 평균 경기 {statistics.averageGameSeconds.toFixed(1)}초 · 체력 소모/공격 {statistics.averageStaminaSpent.both.toFixed(1)}</p><details className={styles.diagnostic}><summary>기술별 성공률 · 능력치별 승률 · 조합별 분석</summary><pre>{JSON.stringify({ techniques: statistics.techniques, playerWins: statistics.playerWins, attributeWinRates: statistics.attributeWinRates, ratingCombinations: statistics.ratingCombinations, actionCombinations: statistics.actionCombinations, anomalies: statistics.anomalies }, null, 2)}</pre></details>{statistics.anomalies.length > 0 && <p className={styles.diagnostic}>분포 점검: {statistics.anomalies.join(' · ')}</p>}</>}
        </div></section></div>
        <footer className={styles.footer}>{displayGame.config.targetScore}점 선승 · {displayGame.config.shotClock}초 · 최대 3드리블 · 기본 틱 {displayGame.config.tickDuration}초 · 이벤트 경계 세분화 · MICRO-TURN BASKETBALL</footer>
        {settingsOpen && <Settings game={game} difficulty={difficulty} onClose={closeSettings} onApply={(config, seed, players, level) => { startGame(mode, config, seed, players); setDifficulty(level); setSettingsOpen(false); }} />}
    </main>;
}
