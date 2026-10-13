import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BasketballClient from '@/app/basketball/BasketballClient';
import { ACTIONS, chooseAIAction, getObservation, replayGame, submitAction, type ActionCommand, type ActionId, type GameState, type ReplayData } from '@/lib/basketball';

const SEED = 20261013;
const categoryNames = { dribble: '드리블', movement: '이동', footwork: '풋워크', shot: '슛', defense: '수비', recovery: '회복', ball: '볼 경합' };
let downloaded: Blob | undefined;

beforeEach(() => {
  downloaded = undefined;
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { downloaded = blob as Blob; return 'blob:basketball-test'; });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

function clickButton(name: string | RegExp) {
  const button = screen.getByRole('button', { name });
  expect(button).toBeEnabled();
  button.focus();
  fireEvent.click(button);
  return button;
}

function selectAction(id: ActionId) {
  const action = ACTIONS[id];
  clickButton(categoryNames[action.category]);
  clickButton(new RegExp(`^${action.name} `));
}

function timeText() { return screen.getByText(/포제션 \d+ · 경기 [\d.]+초/).textContent; }
function decisionText() { return screen.getByText(/^(DECISION POINT|REPLAY|FINAL) \d+$/).textContent; }
function log() { return screen.getByLabelText('경기 이벤트 기록'); }
function submit() { clickButton(/^(명령 제출|예약 명령 진행|예약 \d+개 제출|선택 잠그기)$/); }
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}
async function exportedReplay(): Promise<ReplayData> {
  clickButton('JSON 저장');
  expect(downloaded).toBeInstanceOf(Blob);
  return JSON.parse(await readBlob(downloaded!));
}
function command(actionId: ActionId, offense: boolean, hand: 'left' | 'right'): ActionCommand {
  if (actionId === 'ContinueAction') return { actionId };
  return {
    actionId, speed: .7,
    ...(offense ? { hand } : { anticipatedDirection: { x: 0, y: -1 }, desiredGap: 1.4 }),
    ...(ACTIONS[actionId].category === 'shot' ? { releaseTiming: 0 } : {}),
  };
}
function resolveHumanDefense(game: GameState, actionId: ActionId): GameState {
  const ai = chooseAIAction(getObservation(game, 'p1'), 'normal');
  const human = submitAction(game, 'p2', game.decisionId, command(actionId, game.offenseId === 'p2', game.players[1].ballHand));
  expect(human.error).toBeUndefined();
  const result = submitAction(human.state, 'p1', game.decisionId, ai);
  expect(result.error).toBeUndefined();
  return result.state;
}

/** 경기 결과와 확률은 모의 구현하지 않고 실제 엔진의 리플레이로 검증한다. */
describe('BasketballClient: 실제 엔진 연결과 상호작용', () => {
  it('기본 공격 모드에서 공개 상태와 합법 행동을 표시하고 양측 명령을 한 번에 실행한다', async () => {
    render(<BasketballClient />);
    expect(screen.getByRole('heading', { name: '한 수 앞의 농구', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /공격으로 시작/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: /하프코트. 공격 플레이어 1, 수비 플레이어 2/ })).toHaveAttribute('viewBox');
    expect(screen.getByText('플레이어 1 · 공격 차례')).toBeInTheDocument();
    expect(screen.getByText('남은 드리블 3 / 3')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: '리플레이 결정점' })).toBeDisabled();
    submit();
    const replay = await exportedReplay();
    expect(replay.decisions).toHaveLength(1);
    expect(replay.decisions[0].commands.p1.actionId).toBe('NormalDribble');
    expect(replay.decisions[0].commands.p2.actionId).toBeDefined();
    const restored = replayGame(replay);
    expect(restored.time).toBeGreaterThan(0);
    expect(timeText()).toBe(`포제션 ${restored.possession} · 경기 ${restored.time.toFixed(1)}초`);
    expect(restored.players[0].dribblesUsed).toBe(1);
  });

  it('로컬 2인 모드에서 첫 제출은 시간을 멈추고 선택과 경로를 가린다', async () => {
    const { container } = render(<BasketballClient />);
    clickButton(/로컬 2인 대전/);
    expect(screen.getByRole('heading', { name: '플레이어 1 차례' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '선택 잠그기' })).not.toBeInTheDocument();
    clickButton('준비됐어요 · 내 선택 보기');
    selectAction('Crossover');
    clickButton('왼쪽 앞');
    expect(container.querySelector('[marker-end="url(#routeArrow)"]')).toBeInTheDocument();
    const beforeTime = timeText();
    const beforeDecision = decisionText();
    const beforeLog = log().textContent;
    submit();
    expect(timeText()).toBe(beforeTime);
    expect(decisionText()).toBe(beforeDecision);
    expect(log().textContent).toBe(beforeLog);
    expect(screen.getByRole('heading', { name: '플레이어 2 차례' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^크로스오버 / })).not.toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: '목표 속도' })).not.toBeInTheDocument();
    expect(container.querySelector('[marker-end="url(#routeArrow)"]')).not.toBeInTheDocument();
    const concealed = await exportedReplay();
    expect(concealed.decisions).toHaveLength(0);
    expect(concealed.operations).toBeUndefined();
    expect(JSON.stringify(concealed)).not.toContain('Crossover');
    clickButton('준비됐어요 · 내 선택 보기');
    expect(screen.getByText('플레이어 2 · 수비 차례')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '예상 돌파 방향' })).toHaveValue('1');
    expect(screen.getByRole('slider', { name: '수비 유지 간격' })).toHaveValue('1.4');
    expect(screen.queryByRole('button', { name: '왼손' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: '예상 돌파 방향' }), { target: { value: '5' } });
    fireEvent.change(screen.getByRole('slider', { name: '수비 유지 간격' }), { target: { value: '2.5' } });
    fireEvent.change(screen.getByRole('slider', { name: '목표 속도' }), { target: { value: '0.5' } });
    submit();
    const resolved = await exportedReplay();
    expect(resolved.decisions).toHaveLength(1);
    expect(resolved.decisions[0].commands.p1.actionId).toBe('Crossover');
    expect(resolved.decisions[0].commands.p1.direction).toEqual({ x: -1, y: -1 });
    expect(resolved.decisions[0].commands.p2).toMatchObject({ actionId: 'HoldPosition', anticipatedDirection: { x: 1, y: 0 }, desiredGap: 2.5, speed: .5 });
    expect(resolved.decisions[0].commands.p2.hand).toBeUndefined();
    expect(timeText()).not.toBe(beforeTime);
  });

  it('수비로 시작해 실제 명령만으로 역할 전환과 경기 종료까지 진행한다', async () => {
    render(<BasketballClient />);
    clickButton(/수비로 시작/);
    expect(screen.getByText('플레이어 2 · 수비 차례')).toBeInTheDocument();
    clickButton('경기 설정');
    fireEvent.change(screen.getByLabelText('승리 점수'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('최대 득점 상한'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('최대 포제션'), { target: { value: '10' } });
    fireEvent.change(screen.getAllByLabelText('주로 쓰는 손')[1], { target: { value: 'left' } });
    clickButton('설정 적용 · 새 경기');
    let game = replayGame(await exportedReplay());
    let roleChanged = false;
    let decisions = 0;
    while (game.status === 'playing' && decisions < 400) {
      const legal = getObservation(game, 'p2').legalActions.map(action => action.id);
      const priorities: ActionId[] = ['ContinueAction', 'Rebound', 'RecoverBall', 'HoldPosition', 'JumpShot', 'RecoverBalance'];
      const action = priorities.find(id => legal.includes(id)) ?? legal[0];
      expect(action).toBeDefined();
      selectAction(action);
      if (game.offenseId === 'p2' && action !== 'ContinueAction') expect(screen.getByRole('button', { name: '왼손' })).toHaveAttribute('aria-pressed', 'true');
      submit();
      game = resolveHumanDefense(game, action);
      roleChanged ||= game.offenseId === 'p2';
      if (game.status === 'playing') expect(screen.getByText(`플레이어 2 · ${game.offenseId === 'p2' ? '공격' : '수비'} 차례`)).toBeInTheDocument();
      decisions++;
    }
    expect(game.status).toBe('finished');
    expect(roleChanged).toBe(true);
    expect(screen.getByRole('heading', { name: /승리!|경기 종료/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '한 경기 더' })).toBeEnabled();
    expect(replayGame(await exportedReplay())).toEqual(game);
  });

  it('AI 자동 모드에서 한 턴, 자동 시작, 일시 정지를 구분한다', () => {
    vi.useFakeTimers();
    render(<BasketballClient />);
    clickButton(/AI 자동 대전/);
    expect(screen.getByRole('heading', { name: '벤치에서 관전하기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '명령 제출' })).not.toBeInTheDocument();
    clickButton('한 턴');
    expect(decisionText()).toBe('DECISION POINT 2');
    clickButton('자동 대전 시작');
    expect(screen.getByRole('button', { name: '한 턴' })).toBeDisabled();
    act(() => { vi.advanceTimersByTime(1400); });
    expect(decisionText()).toBe('DECISION POINT 4');
    clickButton('일시 정지');
    const paused = timeText();
    act(() => { vi.advanceTimersByTime(2100); });
    expect(timeText()).toBe(paused);
    expect(screen.getByRole('button', { name: '한 턴' })).toBeEnabled();
  });

  it('예약 목록을 취소하고 선택한 마지막 행동 대신 첫 예약부터 정확히 실행한다', async () => {
    render(<BasketballClient />);
    clickButton('+ 예약에 추가');
    selectAction('Crossover');
    clickButton('+ 예약에 추가');
    expect(screen.getByText('1. 일반 드리블')).toBeInTheDocument();
    expect(screen.getByText('2. 크로스오버')).toBeInTheDocument();
    clickButton('예약 취소');
    expect(screen.queryByText('1. 일반 드리블')).not.toBeInTheDocument();
    expect(timeText()).toBe('포제션 1 · 경기 0.0초');
    selectAction('NormalDribble');
    clickButton('+ 예약에 추가');
    selectAction('Crossover');
    clickButton('+ 예약에 추가');
    submit();
    let replay = await exportedReplay();
    expect(replay.decisions[0].commands.p1.actionId).toBe('NormalDribble');
    for (let i = 0; i < 12 && !replay.decisions.some(entry => entry.commands.p1.actionId === 'Crossover'); i++) {
      submit();
      replay = await exportedReplay();
    }
    const started = replayGame(replay).events.filter(event => event.type === 'action_start' && event.playerId === 'p1').map(event => event.actionId);
    expect(started.slice(0, 2)).toEqual(['NormalDribble', 'Crossover']);
    expect(started.filter(id => id === 'NormalDribble')).toHaveLength(1);
    expect(started.filter(id => id === 'Crossover')).toHaveLength(1);
  });

  it.each([
    { label: 'Hesitation → Sprint', actions: ['Hesitation', 'Sprint'] as ActionId[] },
    { label: 'Hesitation → Crossover → Sprint', actions: ['Hesitation', 'Crossover', 'Sprint'] as ActionId[] },
  ])('첫 드리블 이후에만 합법인 이동 예약을 전체 순서로 검증한다: $label', async ({ actions }) => {
    render(<BasketballClient />);
    for (const action of actions) {
      selectAction(action);
      clickButton('+ 예약에 추가');
    }
    submit();
    const replay = await exportedReplay();
    expect(replay.decisions).toHaveLength(1);
    expect(replay.decisions[0].commands.p1.actionId).toBe('Hesitation');
    expect(replayGame(replay).queues.p1.map(action => action.actionId)).toEqual(actions.slice(1));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('네 번째 드리블 예약을 거부하면서 앞선 세 예약과 경기 시간을 보존한다', async () => {
    render(<BasketballClient />);
    for (const action of ['NormalDribble', 'Crossover', 'ProtectedDribble'] as const) {
      selectAction(action);
      clickButton('+ 예약에 추가');
    }
    expect(screen.getByText('3. 보호 드리블')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^일반 드리블 / })).toBeDisabled();
    expect(screen.getByRole('button', { name: '+ 예약에 추가' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/최대 3회|더블 드리블/);
    expect(screen.getByRole('button', { name: '예약 3개 제출' })).toBeEnabled();
    expect(screen.queryByText('4. 일반 드리블')).not.toBeInTheDocument();
    expect(timeText()).toBe('포제션 1 · 경기 0.0초');
    submit();
    const replay = await exportedReplay();
    expect(replay.decisions[0].commands.p1.actionId).toBe('NormalDribble');
    expect(replayGame(replay).players[0].dribblesUsed).toBe(1);
  });

  it('진행 중 행동을 기본 선택으로 이어가며 드리블을 중복 차감하지 않는다', async () => {
    render(<BasketballClient />);
    submit();
    const first = replayGame(await exportedReplay());
    expect(first.ongoingActions.p1).toBeDefined();
    expect(screen.getByRole('button', { name: /^현재 행동 계속 / })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '+ 예약에 추가' })).toBeDisabled();
    expect(screen.queryByRole('slider', { name: '목표 속도' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '골대 방향' })).not.toBeInTheDocument();
    submit();
    const replay = await exportedReplay();
    const next = replayGame(replay);
    expect(replay.decisions.at(-1)!.commands.p1.actionId).toBe('ContinueAction');
    expect(next.players[0].dribblesUsed).toBe(first.players[0].dribblesUsed);
    expect(next.stats.totalDribbles).toBe(first.stats.totalDribbles);
    expect(next.events.filter(event => event.type === 'action_start' && event.playerId === 'p1')).toHaveLength(1);
  });

  it('다시 시작과 모드 변경의 확인 취소는 현재 경기를 보존한다', async () => {
    render(<BasketballClient />);
    submit();
    const before = await exportedReplay();
    vi.mocked(window.confirm).mockReturnValue(false);
    clickButton('다시 시작');
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('같은 시드'));
    expect(await exportedReplay()).toEqual(before);
    clickButton(/AI 자동 대전/);
    expect(screen.getByRole('button', { name: /공격으로 시작/ })).toHaveAttribute('aria-pressed', 'true');
    expect(await exportedReplay()).toEqual(before);
    vi.mocked(window.confirm).mockReturnValue(true);
    clickButton('다시 시작');
    expect(timeText()).toBe('포제션 1 · 경기 0.0초');
    expect((await exportedReplay()).decisions).toHaveLength(0);
    expect(screen.getByText(`SEED ${SEED}`)).toBeInTheDocument();
  });

  it('설정을 닫기·취소·Escape로 버리고 적용한 규칙·선수·시드는 새 경기로 전달한다', async () => {
    render(<BasketballClient />);
    for (const close of ['설정 닫기', '취소', 'Escape', '배경']) {
      const opener = clickButton('경기 설정');
      expect(screen.getByRole('dialog', { name: '나만의 매치 설정' })).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByRole('button', { name: '설정 닫기' })).toHaveFocus();
      fireEvent.change(screen.getByLabelText('난수 시드'), { target: { value: '777' } });
      if (close === 'Escape') fireEvent.keyDown(document, { key: 'Escape' });
      else if (close === '배경') fireEvent.click(screen.getByRole('dialog').parentElement!);
      else clickButton(close);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(opener).toHaveFocus();
      expect(screen.getByText(`SEED ${SEED}`)).toBeInTheDocument();
    }
    clickButton('경기 설정');
    fireEvent.change(screen.getByLabelText('난수 시드'), { target: { value: '777' } });
    fireEvent.change(screen.getByLabelText('승리 점수'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('공격 제한시간 (초)'), { target: { value: '9' } });
    fireEvent.change(screen.getByLabelText('AI 판단 난도'), { target: { value: 'hard' } });
    fireEvent.change(screen.getAllByLabelText('선수 이름')[0], { target: { value: '가드' } });
    fireEvent.change(screen.getAllByLabelText('프로필 적용')[0], { target: { value: 'guard' } });
    fireEvent.change(screen.getAllByLabelText('주로 쓰는 손')[0], { target: { value: 'left' } });
    clickButton('설정 적용 · 새 경기');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const replay = await exportedReplay();
    expect(replay.seed).toBe(777);
    expect(replay.config).toMatchObject({ targetScore: 7, shotClock: 9 });
    expect(replay.players[0]).toMatchObject({ name: '가드', dominantHand: 'left', attributes: { BallHandling: 92 } });
    expect(screen.getByText('가드 · 공격 차례')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '왼손' })).toHaveAttribute('aria-pressed', 'true');
    submit();
    expect((await exportedReplay()).decisions[0].commands.p1.hand).toBe('left');
    clickButton('경기 설정');
    expect(screen.getByLabelText('AI 판단 난도')).toHaveValue('hard');
  });

  it('설정 유효성 오류를 표시하고 적용하지 않은 경기를 보존한다', () => {
    render(<BasketballClient />);
    clickButton('경기 설정');
    fireEvent.change(screen.getByLabelText('난수 시드'), { target: { value: '-1' } });
    clickButton('설정 적용 · 새 경기');
    expect(screen.getByRole('alert')).toHaveTextContent('시드는 0~4,294,967,295 사이의 정수');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(`SEED ${SEED}`)).toBeInTheDocument();
  });

  it('리플레이 슬라이더는 과거를 보여 주고 현재 버튼은 진행 상태를 보존한다', async () => {
    render(<BasketballClient />);
    submit();
    submit();
    const before = await exportedReplay();
    const latest = timeText();
    const slider = screen.getByRole('slider', { name: '리플레이 결정점' });
    expect(slider).toHaveAttribute('max', '2');
    fireEvent.change(slider, { target: { value: '0' } });
    expect(decisionText()).toBe('REPLAY 1');
    expect(timeText()).toBe('포제션 1 · 경기 0.0초');
    expect(screen.queryByRole('button', { name: '명령 제출' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '다시 보는 한 수' })).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: '1' } });
    const first = replayGame({ ...before, operations: undefined, decisions: before.decisions.slice(0, 1) });
    expect(timeText()).toBe(`포제션 ${first.possession} · 경기 ${first.time.toFixed(1)}초`);
    clickButton('현재');
    expect(timeText()).toBe(latest);
    expect(await exportedReplay()).toEqual(before);
    submit();
    expect((await exportedReplay()).decisions).toHaveLength(3);
  });

  it('리플레이 재생은 고정된 결정점에서 멈추고 현재 경기 시간을 바꾸지 않는다', () => {
    vi.useFakeTimers();
    render(<BasketballClient />);
    clickButton(/AI 자동 대전/);
    clickButton('한 턴');
    clickButton('한 턴');
    const currentTime = timeText();
    fireEvent.change(screen.getByRole('slider', { name: '리플레이 결정점' }), { target: { value: '0' } });
    clickButton('리플레이 재생');
    act(() => { vi.advanceTimersByTime(650); });
    expect(decisionText()).toBe('REPLAY 2');
    expect(screen.getByRole('button', { name: '리플레이 일시 정지' })).toBeEnabled();
    act(() => { vi.advanceTimersByTime(650); });
    expect(decisionText()).toBe('REPLAY 3');
    expect(screen.getByRole('button', { name: '리플레이 재생' })).toBeEnabled();
    act(() => { vi.advanceTimersByTime(2600); });
    expect(decisionText()).toBe('REPLAY 3');
    clickButton('현재 경기로 돌아가기');
    expect(timeText()).toBe(currentTime);
    expect(screen.getByRole('slider', { name: '리플레이 결정점' })).toHaveAttribute('max', '2');
  });

  it('저장한 리플레이를 재검증해 불러오고 실제 경기로 돌아와 계속 진행한다', async () => {
    render(<BasketballClient />);
    submit();
    submit();
    const original = await exportedReplay();
    clickButton('다시 시작');
    const replayFile = new File([JSON.stringify(original)], 'valid.json', { type: 'application/json' });
    Object.defineProperty(replayFile, 'text', { value: async () => JSON.stringify(original) });
    fireEvent.change(screen.getByLabelText('리플레이 JSON 파일'), { target: { files: [replayFile] } });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('리플레이를 검증하고 불러왔습니다'));
    expect(decisionText()).toBe('REPLAY 1');
    expect(screen.getByRole('button', { name: /AI 자동 대전/ })).toHaveAttribute('aria-pressed', 'true');
    expect(await exportedReplay()).toEqual(original);
    clickButton('현재 경기로 돌아가기');
    expect(decisionText()).toBe('DECISION POINT 3');
    clickButton('한 턴');
    const advanced = await exportedReplay();
    expect(advanced.decisions).toHaveLength(3);
    expect(advanced.decisions.slice(0, 2)).toEqual(original.decisions);
  });

  it('5MB 초과 파일은 내용을 읽기 전에 거부한다', async () => {
    render(<BasketballClient />);
    const file = new File(['{}'], 'oversized.json', { type: 'application/json' });
    const read = vi.fn(async () => '{}');
    Object.defineProperty(file, 'size', { value: 5_000_001 });
    Object.defineProperty(file, 'text', { value: read });
    fireEvent.change(screen.getByLabelText('리플레이 JSON 파일'), { target: { files: [file] } });
    expect(screen.getByRole('status')).toHaveTextContent('5MB 이하');
    expect(read).not.toHaveBeenCalled();
    expect((await exportedReplay()).decisions).toHaveLength(0);
  });

  it('잘못된 JSON과 지원하지 않는 리플레이를 거부하고 경기 상태를 유지한다', async () => {
    render(<BasketballClient />);
    const before = await exportedReplay();
    // File.text는 jsdom에 없으므로 입력 파일 읽기 API만 제공한다.
    const malformed = new File(['{wrong'], 'broken.json', { type: 'application/json' });
    Object.defineProperty(malformed, 'text', { value: async () => '{wrong' });
    fireEvent.change(screen.getByLabelText('리플레이 JSON 파일'), { target: { files: [malformed] } });
    await waitFor(() => expect(screen.getByRole('status')).not.toBeEmptyDOMElement());
    expect(await exportedReplay()).toEqual(before);
    const unsupported = new File(['{}'], 'unsupported.json', { type: 'application/json' });
    Object.defineProperty(unsupported, 'text', { value: async () => '{}' });
    fireEvent.change(screen.getByLabelText('리플레이 JSON 파일'), { target: { files: [unsupported] } });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('지원하지 않는 리플레이'));
    expect(await exportedReplay()).toEqual(before);
  });
});

/** Worker의 전송·종료 계약만 대체한다. 통계 계산 자체는 엔진 별도 테스트의 책임이다. */
class WorkerStub {
  static instances: WorkerStub[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor(public url: URL) { WorkerStub.instances.push(this); }
}

describe('시뮬레이션 Worker 생명주기', () => {
  beforeEach(() => { WorkerStub.instances = []; vi.stubGlobal('Worker', WorkerStub); });

  it('10,000포제션 작업의 입력·진행·취소·재시작·언마운트를 처리한다', () => {
    const view = render(<BasketballClient />);
    clickButton('10,000포제션 검증');
    const first = WorkerStub.instances[0];
    expect(first.url.pathname).toMatch(/statistics.worker.ts$/);
    expect(first.postMessage).toHaveBeenCalledWith(expect.objectContaining({ seed: SEED, possessions: 10000, games: 100, difficulty: 'normal' }));
    expect(screen.getByRole('progressbar', { name: '통계 검증 진행' })).toHaveAttribute('aria-valuenow', '0');
    act(() => { first.onmessage?.({ data: { progress: .375 } } as MessageEvent); });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '38');
    submit();
    expect(decisionText()).toBe('DECISION POINT 2');
    clickButton('중지');
    expect(first.terminate).toHaveBeenCalled();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    clickButton('10,000포제션 검증');
    expect(WorkerStub.instances).toHaveLength(2);
    const second = WorkerStub.instances[1];
    view.unmount();
    expect(second.terminate).toHaveBeenCalledTimes(1);
  });

  it.each(['다시 시작', '설정 적용', '리플레이 불러오기'])('%s 이후 예전 통계 Worker의 늦은 결과를 무시한다', async reason => {
    render(<BasketballClient />);
    const initial = await exportedReplay();
    clickButton('10,000포제션 검증');
    const first = WorkerStub.instances[0];
    act(() => { first.onmessage?.({ data: { progress: .4 } } as MessageEvent); });
    if (reason === '다시 시작') clickButton('다시 시작');
    else if (reason === '설정 적용') {
      clickButton('경기 설정');
      fireEvent.change(screen.getByLabelText('난수 시드'), { target: { value: '123' } });
      clickButton('설정 적용 · 새 경기');
    } else {
      const file = new File([JSON.stringify(initial)], 'reset.json', { type: 'application/json' });
      Object.defineProperty(file, 'text', { value: async () => JSON.stringify(initial) });
      fireEvent.change(screen.getByLabelText('리플레이 JSON 파일'), { target: { files: [file] } });
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('리플레이를 검증하고 불러왔습니다'));
    }
    expect(first.terminate).toHaveBeenCalled();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    clickButton('10,000포제션 검증');
    const second = WorkerStub.instances[1];
    act(() => { first.onmessage?.({ data: { progress: .99, error: '이미 종료된 작업' } } as MessageEvent); first.onerror?.(); });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    act(() => { second.onmessage?.({ data: { progress: .25 } } as MessageEvent); });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  });

  it('작업 오류를 노출하고 재시도할 수 있도록 종료한다', () => {
    render(<BasketballClient />);
    clickButton('10,000포제션 검증');
    const first = WorkerStub.instances[0];
    act(() => { first.onmessage?.({ data: { error: '통계 검증 오류' } } as MessageEvent); });
    expect(first.terminate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent('통계 검증 오류');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    clickButton('10,000포제션 검증');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    act(() => { WorkerStub.instances[1].onerror?.(); });
    expect(screen.getByRole('alert')).toHaveTextContent('통계 작업을 실행할 수 없습니다');
  });
});

/** 너비별 접근 가능한 DOM만 확인한다. jsdom은 CSS 배치나 화면 픽셀을 검증하지 않는다. */
describe.each([390, 1440])('너비 %ipx 환경의 DOM 의미 구조 (시각적 브라우저 검증 아님)', width => {
  it('주요 구역·입력 레이블·상태 미터에 접근할 수 있다', () => {
    vi.stubGlobal('innerWidth', width);
    render(<BasketballClient />);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '농구 코트와 스코어' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '플레이어 1 선수 상태' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '플레이어 2 선수 상태' })).toBeInTheDocument();
    expect(screen.getAllByRole('meter')).toHaveLength(8);
    expect(screen.getByRole('slider', { name: '목표 속도' })).toHaveValue('0.7');
    const modes = screen.getByLabelText('대전 모드');
    expect(within(modes).getAllByRole('button')).toHaveLength(4);
    for (const heading of ['다음 행동 선택', '리플레이 타임라인', '플레이 로그', '시뮬레이션 랩']) expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    clickButton(/수비로 시작/);
    expect(screen.getByRole('combobox', { name: '예상 돌파 방향' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: '수비 유지 간격' })).toBeInTheDocument();
  });
});
