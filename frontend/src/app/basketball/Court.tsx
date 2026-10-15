import { ACTIONS } from '@/lib/basketball';
import type { ActionCommand, ActionDefinition, GameState, PlayerId, PlayerState } from '@/lib/basketball';
import styles from './BasketballClient.module.css';

/** SVG는 엔진 좌표를 그대로 투영한다. 점선은 입력 방향 참고선이며 결과 예측이 아니다. */
export function Court({ game, activeId, command, action, preview }: { game: GameState; activeId: PlayerId; command: ActionCommand; action?: ActionDefinition; preview: boolean }) {
    const { config, players, ball } = game;
    const scale = 34;
    const width = config.courtWidth * scale;
    const height = config.courtLength * scale;
    const x = (n: number) => 35 + n * scale;
    const y = (n: number) => 28 + n * scale;
    const hoopX = x(config.hoop.x), hoopY = y(config.hoop.y);
    const attacker = players.find(p => p.playerId === game.offenseId)!;
    const defender = players.find(p => p.playerId !== game.offenseId)!;
    const active = players.find(p => p.playerId === activeId)!;
    const gap = Math.hypot(attacker.position.x - defender.position.x, attacker.position.y - defender.position.y);
    const routeLength = command.direction ? Math.min(3, (action?.movementProfile ?? 0) * 3 * (command.speed ?? .7)) : 0;
    const dir = command.direction ?? { x: 0, y: -1 };
    const mag = Math.hypot(dir.x, dir.y) || 1;
    const dest = { x: Math.max(.3, Math.min(config.courtWidth - .3, active.position.x + dir.x / mag * routeLength)), y: Math.max(.3, Math.min(config.courtLength - .3, active.position.y + dir.y / mag * routeLength)) };
    return <svg className={styles.court} viewBox={`0 0 ${width + 70} ${height + 56}`} role="img" aria-label={`하프코트. 공격 ${attacker.name}, 수비 ${defender.name}. 선수 사이 ${gap.toFixed(1)}미터.`}>
        <defs>
            <linearGradient id="courtSurface" x2="0" y2="1"><stop stopColor="#1b3544" /><stop offset="1" stopColor="#182a3d" /></linearGradient>
            <pattern id="courtGrid" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M 34 0 L 0 0 0 34" fill="none" stroke="#6f8d9c" strokeWidth=".4" opacity=".1" /></pattern>
            <marker id="routeArrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="none" stroke="#fbbf24" strokeWidth="1.3" /></marker>
            <clipPath id="courtBounds"><rect x="35" y="28" width={width} height={height} /></clipPath>
            <radialGradient id="playerGlow"><stop stopColor="#fbbf24" stopOpacity=".1" /><stop offset="1" stopColor="#fbbf24" stopOpacity="0" /></radialGradient>
        </defs>
        <rect x="35" y="28" width={width} height={height} rx="2" fill="url(#courtSurface)" />
        <rect x="35" y="28" width={width} height={height} fill="url(#courtGrid)" />
        <g fill="none" stroke="#52707e" strokeWidth="1.2" opacity=".65">
            <rect x="35" y="28" width={width} height={height} />
            <path d={`M ${hoopX - 83} 28 V ${y(5.8)} H ${hoopX + 83} V 28`} />
            <circle cx={hoopX} cy={y(5.8)} r={61} />
            <circle cx={hoopX} cy={hoopY} r={config.arcRadius * scale} clipPath="url(#courtBounds)" />
            <path d={`M ${hoopX - 41} ${hoopY} A 41 41 0 0 0 ${hoopX + 41} ${hoopY}`} />
            <path d={`M ${hoopX - 62} ${y(config.courtLength)} A 62 62 0 0 1 ${hoopX + 62} ${y(config.courtLength)}`} />
        </g>
        <rect x={hoopX - 83} y="28" width="166" height={5.8 * scale} fill="#60a5fa" opacity=".035" />
        <text x={hoopX} y={y(10.9)} textAnchor="middle" fill="#587286" fontSize="10" letterSpacing="4" opacity=".65">EVENT TURN COURT</text>
        <text x={hoopX} y={y(11.45)} textAnchor="middle" fill="#536c80" fontSize="7" letterSpacing="2">READ THE SPACE. MAKE YOUR MOVE.</text>
        <g stroke="#f4c771" fill="none"><path d={`M ${hoopX - 23} ${hoopY - 12} H ${hoopX + 23}`} strokeWidth="3" /><path d={`M ${hoopX} ${hoopY - 12} V ${hoopY - 6}`} strokeWidth="2" /><circle cx={hoopX} cy={hoopY} r="7" strokeWidth="2" /></g>
        <text x="43" y={height + 48} fill="#526e84" fontSize="7">0 m</text><text x={width + 28} y={height + 48} textAnchor="end" fill="#526e84" fontSize="7">{config.courtWidth} m</text>
        <line x1={x(attacker.position.x)} y1={y(attacker.position.y)} x2={x(defender.position.x)} y2={y(defender.position.y)} stroke="#93a7bc" strokeWidth="1" strokeDasharray="2 4" opacity=".65" />
        <g transform={`translate(${x((attacker.position.x + defender.position.x) / 2) + 21}, ${y((attacker.position.y + defender.position.y) / 2)})`}><rect x="-2" y="-10" width="42" height="18" rx="4" fill="#0f1d30" /><text x="19" y="2" fill="#bed0e2" fontSize="8" textAnchor="middle">{gap.toFixed(1)} m</text></g>
        {preview && routeLength > 0 && <><circle cx={x(active.position.x)} cy={y(active.position.y)} r="75" fill="url(#playerGlow)" /><path d={`M ${x(active.position.x)} ${y(active.position.y)} L ${x(dest.x)} ${y(dest.y)}`} fill="none" stroke="#fbbf24" strokeWidth="1.8" strokeDasharray="5 5" markerEnd="url(#routeArrow)" opacity=".85" /><circle cx={x(dest.x)} cy={y(dest.y)} r="17" fill="none" stroke="#fbbf24" strokeDasharray="3 4" opacity=".4" /></>}
        {players.map(player => {
            const color = player.playerId === 'p1' ? '#fbbf24' : '#60a5fa';
            const face = player.facingDirection;
            return <g key={player.playerId} className={styles.courtPlayer} transform={`translate(${x(player.position.x)}, ${y(player.position.y)})`}>
                <circle r="23" fill={color} opacity=".08" /><circle r="16" fill="#0c1a2b" stroke={color} strokeWidth="2" />
                <line x1={face.x * 17} y1={face.y * 17} x2={face.x * 28} y2={face.y * 28} stroke={color} strokeWidth="3" strokeLinecap="round" />
                <text textAnchor="middle" y="4" fill={color} fontSize="10" fontWeight="800">{player.playerId === 'p1' ? '01' : '02'}</text>
                <rect x="-22" y="33" width="44" height="16" rx="4" fill="#0c1a2b" opacity=".85" /><text textAnchor="middle" y="44" fill="#c4d4e6" fontSize="8">{player.playerId === game.offenseId ? '공격' : '수비'}</text>
            </g>;
        })}
        <g transform={`translate(${x(ball.position.x) + (ball.ownerId ? 17 : 0)}, ${y(ball.position.y) + (ball.ownerId ? 7 : 0)})`}><circle r="6" fill="#fb923c" stroke="#ffc27b" strokeWidth="1" /><path d="M-5 -2 L5 2 M0 -6 Q-4 0 0 6 M-4 -4 Q2 -2 4 4" stroke="#a04d19" fill="none" strokeWidth=".7" /></g>
    </svg>;
}

/** 선수 자원은 상대에게 공개된 엔진 값만 보여 준다. */
export function PlayerCard({ player, offense }: { player: PlayerState; offense: boolean }) {
    const meters = [{ name: '체력', value: player.stamina, color: '#34b88a' }, { name: '폭발력', value: player.burstEnergy, color: '#f5b333' }, { name: '균형', value: player.bodyBalance, color: '#699bed' }, { name: '피로', value: player.fatigue, color: '#b39adf' }];
    return <section className={styles.playerCard} aria-label={`${player.name} 선수 상태`}>
        <div className={styles.playerHeading}><strong><i className={`${styles.playerDot} ${player.playerId === 'p2' ? styles.blueDot : ''}`} />{player.name}</strong><span className={`${styles.roleBadge} ${!offense ? styles.defenseBadge : ''}`}>{offense ? '공격' : '수비'}</span></div>
        {meters.map(m => <div className={styles.meterRow} key={m.name}><span>{m.name}</span><div className={styles.meter} role="meter" aria-label={`${player.name} ${m.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(m.value)}><i style={{ width: `${Math.max(0, Math.min(100, m.value))}%`, background: m.color }} /></div><b>{Math.round(m.value)}</b></div>)}
        <div className={styles.playerMeta}>{offense ? `${player.ballHand === 'left' ? '왼손' : '오른손'} · ${player.forcedPickup ? '압박으로 공을 잡음 · 다시 드리블 불가' : player.dribbleState === 'ended' ? '드리블 종료' : player.dribbleState === 'live' ? '라이브 드리블' : '드리블 시작 가능'} · ${player.gatheredSteps}/2 스텝` : `${player.defensiveStance === 'low' ? '낮은 자세' : player.defensiveStance === 'airborne' ? '점프 중' : '기본 자세'} · 반응 ${player.reactionDelay.toFixed(2)}초`}<br />이동 {Math.hypot(player.velocity.x, player.velocity.y).toFixed(1)} m/s · 파울 {player.fouls}회{player.actionState && <><br />최근 행동: {ACTIONS[player.actionState].name}</>}</div>
    </section>;
}
