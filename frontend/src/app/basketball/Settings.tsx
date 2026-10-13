'use client';

import { useEffect, useRef, useState } from 'react';
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, DEFAULT_ATTRIBUTES, PLAYER_PRESETS, type Attributes, type Difficulty, type GameConfig, type GameState, type PlayerSetup } from '@/lib/basketball';
import styles from './BasketballClient.module.css';

/** 설정은 새 경기 생성에만 전달한다. 진행 중인 선수 상태를 직접 수정하지 않는다. */
export default function Settings({ game, difficulty, onClose, onApply }: { game: GameState; difficulty: Difficulty; onClose: () => void; onApply: (config: GameConfig, seed: number, players: [PlayerSetup, PlayerSetup], difficulty: Difficulty) => void }) {
    const [config, setConfig] = useState(game.config);
    const [seed, setSeed] = useState(game.seed);
    const [level, setLevel] = useState(difficulty);
    const [names, setNames] = useState([game.players[0].name, game.players[1].name]);
    const [attributes, setAttributes] = useState<[Attributes, Attributes]>([{ ...DEFAULT_ATTRIBUTES, ...game.initialPlayers[0].attributes }, { ...DEFAULT_ATTRIBUTES, ...game.initialPlayers[1].attributes }]);
    const [hands, setHands] = useState<[PlayerSetup['dominantHand'], PlayerSetup['dominantHand']]>([game.initialPlayers[0].dominantHand ?? 'right', game.initialPlayers[1].dominantHand ?? 'right']);
    const [error, setError] = useState('');
    const modal = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        modal.current?.querySelector<HTMLElement>('button')?.focus();
        const listener = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
            if (event.key !== 'Tab') return;
            const nodes = Array.from(modal.current?.querySelectorAll<HTMLElement>('button, input, select, summary') ?? []).filter(node => node.getClientRects().length > 0);
            const first = nodes[0], last = nodes[nodes.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        };
        document.addEventListener('keydown', listener);
        return () => { document.removeEventListener('keydown', listener); previous?.focus(); };
    }, [onClose]);
    const rules: { key: keyof GameConfig; label: string; min: number; max: number; step?: number }[] = [
        { key: 'targetScore', label: '승리 점수', min: 1, max: 100 }, { key: 'shotClock', label: '공격 제한시간 (초)', min: 3, max: 60 }, { key: 'winBy', label: '필요 점수 차', min: 1, max: 5 }, { key: 'maxScore', label: '최대 득점 상한', min: 1, max: 200 }, { key: 'tickDuration', label: '시뮬레이션 틱 (초)', min: .02, max: .2, step: .01 }, { key: 'maxPossessions', label: '최대 포제션', min: 10, max: 1000 }, { key: 'offensiveReboundClock', label: '공격 리바운드 시계 (초)', min: 1, max: 24 }, { key: 'foulLimit', label: '자유투 적용 파울 수', min: 1, max: 10 },
    ];
    const apply = () => {
        try {
            if (!Number.isSafeInteger(seed) || seed < 0 || seed > 4294967295) throw new Error('시드는 0~4,294,967,295 사이의 정수로 입력해 주세요.');
            onApply(config, seed, [{ name: names[0].trim() || '플레이어 1', attributes: attributes[0], dominantHand: hands[0] }, { name: names[1].trim() || '플레이어 2', attributes: attributes[1], dominantHand: hands[1] }], level);
        } catch (e) { setError(e instanceof Error ? e.message : '설정을 확인해 주세요.'); }
    };
    return <div className={styles.modalBackdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className={styles.modal} ref={modal} role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className={styles.modalHeader}><div><h2 id="settings-title">나만의 매치 설정</h2><p>적용하면 현재 경기가 초기화됩니다. 먼저 리플레이를 저장할 수 있어요.</p></div><button onClick={onClose} aria-label="설정 닫기">×</button></div>
        <div className={styles.modalBody}>{error && <p className={styles.notice} role="alert">{error}</p>}<h3 className={styles.settingsTitle}>규칙과 재현성</h3><div className={styles.settingsGrid}>
            <label className={styles.settingField}>난수 시드<input type="number" min="0" max="4294967295" step="1" value={seed} onChange={e => setSeed(Number(e.target.value))} /></label>
            <label className={styles.settingField}>AI 판단 난도<select className={styles.select} value={level} onChange={e => setLevel(e.target.value as Difficulty)}><option value="easy">입문 · 다양한 시도</option><option value="normal">보통 · 균형 잡힌 판단</option><option value="hard">숙련 · 효율적인 판단</option></select></label>
            {rules.map(rule => <label className={styles.settingField} key={rule.key}>{rule.label}<input type="number" min={rule.min} max={rule.max} step={rule.step ?? 1} value={config[rule.key] as number} onChange={e => setConfig({ ...config, [rule.key]: Number(e.target.value) })} /></label>)}
        </div><h3 className={styles.settingsTitle}>선수 프로필 · 각 능력치 0~100</h3><div className={styles.profileGrid}>{([0, 1] as const).map(index => <section className={styles.profile} key={index}><h3>{index === 0 ? '🟡 플레이어 1' : '🔵 플레이어 2'}</h3>
            <label className={styles.settingField}>선수 이름<input value={names[index]} maxLength={16} onChange={e => setNames(names.map((name, i) => i === index ? e.target.value : name))} /></label>
            <label className={styles.settingField} style={{ marginTop: 11 }}>프로필 적용<select className={styles.select} value={PLAYER_PRESETS.find(preset => ATTRIBUTE_KEYS.every(key => preset.attributes[key] === attributes[index][key]))?.id ?? 'custom'} onChange={e => { const preset = PLAYER_PRESETS.find(p => p.id === e.target.value); if (preset) setAttributes(previous => index === 0 ? [{ ...preset.attributes }, previous[1]] : [previous[0], { ...preset.attributes }]); }}><option value="custom" disabled>직접 설정</option>{PLAYER_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name} · {p.description}</option>)}</select></label>
            <label className={styles.settingField} style={{ marginTop: 11 }}>주로 쓰는 손<select className={styles.select} value={hands[index]} onChange={e => setHands(previous => index === 0 ? [e.target.value as 'left' | 'right', previous[1]] : [previous[0], e.target.value as 'left' | 'right'])}><option value="right">오른손</option><option value="left">왼손</option></select></label>
            <details><summary>능력치 30개 직접 조정</summary><div className={styles.attributeList}>{ATTRIBUTE_KEYS.map(key => <label className={styles.attribute} key={key}><span title={key}>{ATTRIBUTE_LABELS[key]}</span><input type="range" min="0" max="100" value={attributes[index][key]} onChange={e => setAttributes(previous => index === 0 ? [{ ...previous[0], [key]: Number(e.target.value) }, previous[1]] : [previous[0], { ...previous[1], [key]: Number(e.target.value) }])} /><b>{attributes[index][key]}</b></label>)}</div></details>
        </section>)}</div><p className={styles.diagnostic}>기본 드리블 한도는 이 게임의 특별 규칙인 3행동입니다. 난도는 AI의 판단만 바꾸며 능력치나 성공률 보너스를 주지 않습니다.</p></div>
        <div className={styles.modalFooter}><button className={styles.button} onClick={onClose}>취소</button><button className={styles.primaryButton} onClick={apply}>설정 적용 · 새 경기</button></div>
    </div></div>;
}
