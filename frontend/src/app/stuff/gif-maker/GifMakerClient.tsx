'use client';

/* ================================================================
   GIF 변환기 — 동영상 업로드 → 구간 트리밍 → GIF 변환
   FFmpeg.wasm을 사용하여 완전히 클라이언트에서 처리합니다.
   ================================================================ */

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import styles from './GifMakerClient.module.css';

/* ── 상수 ── */
const FPS_OPTIONS = [10, 15, 20, 24] as const;
type Fps = (typeof FPS_OPTIONS)[number];

const WIDTH_OPTIONS = [
    { label: '320px', value: 320 },
    { label: '480px', value: 480 },
    { label: '640px', value: 640 },
    { label: '원본', value: 0 },
] as const;
type OutputWidth = (typeof WIDTH_OPTIONS)[number]['value'];

/* ── 단계 타입 ── */
type Phase = 'idle' | 'loading' | 'writing' | 'converting' | 'done' | 'error';

/* ── 시간 포맷 헬퍼 ── */
function fmt(s: number): string {
    const m = Math.floor(s / 60);
    const sec = String(Math.floor(s % 60)).padStart(2, '0');
    const ds = String(Math.floor((s % 1) * 10));
    return `${m}:${sec}.${ds}`;
}
function fmtSize(b: number): string {
    return b < 1_000_000 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1_000_000).toFixed(1)} MB`;
}

/* ================================================================
   컴포넌트
   ================================================================ */
export default function GifMakerClient() {
    /* 파일 / 비디오 */
    const [file, setFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);

    /* 트리밍 구간 */
    const [trimStart, setTrimStart] = useState(0);
    const [trimEnd, setTrimEnd] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [playing, setPlaying] = useState(false);

    /* 설정 */
    const [fps, setFps] = useState<Fps>(15);
    const [outputWidth, setOutputWidth] = useState<OutputWidth>(480);

    /* 변환 상태 */
    const [phase, setPhase] = useState<Phase>('idle');
    const [progress, setProgress] = useState(0);
    const [gifUrl, setGifUrl] = useState<string | null>(null);
    const [gifSize, setGifSize] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');

    /* UI */
    const [isDragOver, setIsDragOver] = useState(false);
    const [thumbnails, setThumbnails] = useState<string[]>([]);

    /* Refs */
    const videoRef = useRef<HTMLVideoElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const ffmpegRef = useRef<any>(null);

    /* 드래그 중 최신값을 클로저 없이 참조하기 위한 ref */
    const trimStartRef = useRef(0);
    const trimEndRef = useRef(0);
    const durationRef = useRef(0);

    useEffect(() => { trimStartRef.current = trimStart; }, [trimStart]);
    useEffect(() => { trimEndRef.current = trimEnd; }, [trimEnd]);
    useEffect(() => { durationRef.current = duration; }, [duration]);

    /* ── 파일 선택 / 드롭 ── */
    const handleFile = useCallback((f: File) => {
        if (!f.type.startsWith('video/')) return;
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        if (gifUrl) URL.revokeObjectURL(gifUrl);

        setFile(f);
        setVideoUrl(URL.createObjectURL(f));
        setGifUrl(null);
        setPhase('idle');
        setThumbnails([]);
        setProgress(0);
    }, [videoUrl, gifUrl]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    }, [handleFile]);

    /* ── 비디오 메타데이터 로드 ── */
    const handleLoadedMetadata = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        const d = video.duration;
        setDuration(d);
        setTrimStart(0);
        setTrimEnd(d);
        setCurrentTime(0);
        generateThumbnails(video, d);
    }, []);

    /* ── 썸네일 스트립 생성 ── */
    async function generateThumbnails(video: HTMLVideoElement, dur: number) {
        const COUNT = 16;
        const canvas = document.createElement('canvas');
        canvas.width = 80;
        canvas.height = 45;
        const ctx = canvas.getContext('2d')!;
        const result: string[] = [];
        const savedTime = video.currentTime;

        for (let i = 0; i < COUNT; i++) {
            video.currentTime = (i / (COUNT - 1)) * dur;
            await new Promise<void>((resolve) =>
                video.addEventListener('seeked', () => resolve(), { once: true })
            );
            ctx.drawImage(video, 0, 0, 80, 45);
            result.push(canvas.toDataURL('image/jpeg', 0.5));
        }

        video.currentTime = savedTime;
        setThumbnails(result);
    }

    /* ── 재생 루프 (트리밍 구간 안에서) ── */
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onTimeUpdate = () => {
            setCurrentTime(video.currentTime);
            if (video.currentTime >= trimEndRef.current && !video.paused) {
                video.currentTime = trimStartRef.current;
            }
        };
        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);

        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        return () => {
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
        };
    }, []);

    /* ── 재생/일시정지 ── */
    const togglePlay = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            if (video.currentTime >= trimEndRef.current || video.currentTime < trimStartRef.current) {
                video.currentTime = trimStartRef.current;
            }
            video.play();
        } else {
            video.pause();
        }
    }, []);

    /* Space 키 단축키 */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code === 'Space' && file) {
                e.preventDefault();
                togglePlay();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [togglePlay, file]);

    /* ── 타임라인 클릭 (씩) ── */
    const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!timelineRef.current || !videoRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const t = ratio * durationRef.current;
        videoRef.current.currentTime = t;
        setCurrentTime(t);
    }, []);

    /* ── 핸들 드래그 (Pointer Capture 방식) ── */
    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
    }, []);

    const handleStartPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId) || !timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const t = Math.max(0, Math.min(ratio * durationRef.current, trimEndRef.current - 0.1));
        setTrimStart(t);
        if (videoRef.current) videoRef.current.currentTime = t;
        setCurrentTime(t);
    }, []);

    const handleEndPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId) || !timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const t = Math.min(durationRef.current, Math.max(ratio * durationRef.current, trimStartRef.current + 0.1));
        setTrimEnd(t);
        if (videoRef.current) videoRef.current.currentTime = t;
        setCurrentTime(t);
    }, []);

    /* ── GIF 변환 ── */
    const convertToGif = useCallback(async () => {
        if (!file) return;

        setPhase('loading');
        setProgress(0);
        setGifUrl(null);
        setErrorMsg('');

        try {
            /* FFmpeg 로드 (최초 1회) */
            let ffmpeg = ffmpegRef.current;
            if (!ffmpeg) {
                const { FFmpeg } = await import('@ffmpeg/ffmpeg');
                const { toBlobURL } = await import('@ffmpeg/util');

                ffmpeg = new FFmpeg();
                ffmpeg.on('progress', ({ progress: p }: { progress: number }) => {
                    setProgress(Math.min(99, Math.round(p * 100)));
                });

                const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
                await ffmpeg.load({
                    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                });

                ffmpegRef.current = ffmpeg;
            }

            const { fetchFile } = await import('@ffmpeg/util');

            /* 입력 파일 작성 */
            setPhase('writing');
            const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
            const inputName = `input.${ext}`;
            await ffmpeg.writeFile(inputName, await fetchFile(file));

            /* FFmpeg 실행 */
            setPhase('converting');
            const clipDuration = trimEnd - trimStart;
            const scaleFilter = outputWidth > 0 ? `${outputWidth}:-2` : '-1:-1';
            const vfFilter = [
                `fps=${fps}`,
                `scale=${scaleFilter}:flags=lanczos`,
                'split[s0][s1]',
                '[s0]palettegen=max_colors=256[p]',
                '[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
            ].join(',');

            await ffmpeg.exec([
                '-ss', String(trimStart),
                '-t', String(clipDuration),
                '-i', inputName,
                '-vf', vfFilter,
                'output.gif',
            ]);

            /* 결과 읽기 */
            const data = (await ffmpeg.readFile('output.gif')) as Uint8Array;
            const blob = new Blob([data.buffer], { type: 'image/gif' });
            setGifUrl(URL.createObjectURL(blob));
            setGifSize(blob.size);
            setProgress(100);
            setPhase('done');

            /* 임시 파일 정리 */
            await ffmpeg.deleteFile(inputName).catch(() => {});
            await ffmpeg.deleteFile('output.gif').catch(() => {});
        } catch (err) {
            console.error(err);
            setErrorMsg('변환 중 오류가 발생했습니다. 짧은 구간을 선택하거나 파일 형식을 확인해주세요.');
            setPhase('error');
        }
    }, [file, trimStart, trimEnd, fps, outputWidth]);

    /* ── 진행 메시지 ── */
    const phaseLabel: Record<Phase, string> = {
        idle: '',
        loading: 'FFmpeg 로딩 중 (최초 1회, 약 20MB)...',
        writing: '파일 준비 중...',
        converting: `변환 중... ${progress}%`,
        done: '변환 완료!',
        error: '',
    };
    const isConverting = phase === 'loading' || phase === 'writing' || phase === 'converting';

    /* ── 렌더 ── */
    if (!file || !videoUrl) {
        /* ─ 드롭존 ─ */
        return (
            <main className={styles.main}>
                <div className={styles.pageHeader}>
                    <Link href="/stuff" className={styles.backLink}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                        잡동사니
                    </Link>
                    <h1 className={styles.title}>GIF 변환기</h1>
                    <p className={styles.subtitle}>동영상을 업로드하고 원하는 구간만 잘라 GIF로 저장하세요.</p>
                </div>

                <label
                    className={`${styles.dropZone} ${isDragOver ? styles.dropZoneOver : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        accept="video/*"
                        className={styles.fileInput}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    />
                    <span className={`material-symbols-outlined ${styles.dropIcon}`}>video_file</span>
                    <span className={styles.dropText}>동영상을 드래그하거나 클릭해서 업로드</span>
                    <span className={styles.dropHint}>MP4, MOV, WebM, AVI 등 지원</span>
                </label>
            </main>
        );
    }

    /* ─ 에디터 ─ */
    const startPct = duration > 0 ? (trimStart / duration) * 100 : 0;
    const endPct = duration > 0 ? (trimEnd / duration) * 100 : 100;
    const playPct = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <main className={styles.main}>
            <div className={styles.pageHeader}>
                <Link href="/stuff" className={styles.backLink}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                    잡동사니
                </Link>
                <h1 className={styles.title}>GIF 변환기</h1>
            </div>

            {/* ── 에디터 2단 레이아웃 ── */}
            <div className={styles.editor}>
                {/* 좌측: 비디오 프리뷰 */}
                <div className={styles.previewSection}>
                    <div className={styles.videoWrapper}>
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            className={styles.video}
                            onLoadedMetadata={handleLoadedMetadata}
                            playsInline
                        />
                    </div>

                    {/* 재생 컨트롤 */}
                    <div className={styles.videoControls}>
                        <button className={styles.playBtn} onClick={togglePlay} title="Space">
                            <span className="material-symbols-outlined">
                                {playing ? 'pause' : 'play_arrow'}
                            </span>
                        </button>
                        <span className={styles.timeDisplay}>
                            <span className={styles.timeCurrent}>{fmt(currentTime)}</span>
                            <span className={styles.timeSep}>/</span>
                            <span className={styles.timeDuration}>{fmt(duration)}</span>
                        </span>
                        {/* 파일 재선택 */}
                        <label className={styles.reuploadBtn} title="다른 파일 선택">
                            <input type="file" accept="video/*" className={styles.fileInput}
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                            <span className="material-symbols-outlined">upload_file</span>
                        </label>
                    </div>
                </div>

                {/* 우측: 설정 패널 */}
                <div className={styles.settingsSection}>
                    {/* 구간 정보 */}
                    <div className={styles.trimInfo}>
                        <div className={styles.trimInfoRow}>
                            <span className={styles.trimLabel}>시작</span>
                            <span className={styles.trimValue}>{fmt(trimStart)}</span>
                        </div>
                        <div className={styles.trimInfoRow}>
                            <span className={styles.trimLabel}>끝</span>
                            <span className={styles.trimValue}>{fmt(trimEnd)}</span>
                        </div>
                        <div className={`${styles.trimInfoRow} ${styles.trimInfoHighlight}`}>
                            <span className={styles.trimLabel}>길이</span>
                            <span className={styles.trimValue}>{fmt(trimEnd - trimStart)}</span>
                        </div>
                    </div>

                    {/* FPS */}
                    <div className={styles.settingGroup}>
                        <label className={styles.settingLabel}>FPS</label>
                        <div className={styles.optionRow}>
                            {FPS_OPTIONS.map((f) => (
                                <button
                                    key={f}
                                    className={`${styles.optionBtn} ${fps === f ? styles.optionBtnActive : ''}`}
                                    onClick={() => setFps(f)}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 해상도 */}
                    <div className={styles.settingGroup}>
                        <label className={styles.settingLabel}>해상도 (가로)</label>
                        <div className={styles.optionRow}>
                            {WIDTH_OPTIONS.map((w) => (
                                <button
                                    key={w.value}
                                    className={`${styles.optionBtn} ${outputWidth === w.value ? styles.optionBtnActive : ''}`}
                                    onClick={() => setOutputWidth(w.value)}
                                >
                                    {w.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 변환 버튼 */}
                    <button
                        className={styles.convertBtn}
                        onClick={convertToGif}
                        disabled={isConverting || duration === 0}
                    >
                        {isConverting ? (
                            <><span className={styles.spinner} />변환 중</>
                        ) : (
                            <><span className="material-symbols-outlined">gif_box</span>GIF 변환하기</>
                        )}
                    </button>
                </div>
            </div>

            {/* ── 타임라인 ── */}
            <div className={styles.timelineSection}>
                {/* 시간 레이블 (위) */}
                <div className={styles.timeLabels}>
                    <span style={{ left: `${startPct}%` }} className={styles.timeLabel}>{fmt(trimStart)}</span>
                    <span style={{ left: `${endPct}%` }} className={styles.timeLabel}>{fmt(trimEnd)}</span>
                </div>

                {/* 타임라인 바 */}
                <div
                    ref={timelineRef}
                    className={styles.timeline}
                    onClick={handleTimelineClick}
                >
                    {/* 썸네일 스트립 */}
                    {thumbnails.length > 0 && (
                        <div className={styles.thumbnailStrip}>
                            {thumbnails.map((src, i) => (
                                <div key={i} className={styles.thumbnail} style={{ backgroundImage: `url(${src})` }} />
                            ))}
                        </div>
                    )}

                    {/* 선택 영역 바깥 어둡게 */}
                    <div className={styles.dimLeft} style={{ width: `${startPct}%` }} />
                    <div className={styles.dimRight} style={{ width: `${100 - endPct}%` }} />

                    {/* 선택 영역 테두리 */}
                    <div
                        className={styles.selection}
                        style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
                    />

                    {/* 시작 핸들 */}
                    <div
                        className={`${styles.handle} ${styles.handleStart}`}
                        style={{ left: `${startPct}%` }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handleStartPointerMove}
                    >
                        <div className={styles.gripDots}>
                            <span /><span /><span />
                        </div>
                    </div>

                    {/* 끝 핸들 */}
                    <div
                        className={`${styles.handle} ${styles.handleEnd}`}
                        style={{ left: `${endPct}%` }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handleEndPointerMove}
                    >
                        <div className={styles.gripDots}>
                            <span /><span /><span />
                        </div>
                    </div>

                    {/* 플레이헤드 */}
                    <div className={styles.playhead} style={{ left: `${playPct}%` }} />
                </div>

                {/* 전체 길이 레이블 (아래) */}
                <div className={styles.totalDuration}>
                    <span>0:00</span>
                    <span>{fmt(duration)}</span>
                </div>
            </div>

            {/* ── 진행 상태 ── */}
            {isConverting && (
                <div className={styles.progressSection}>
                    <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                    </div>
                    <p className={styles.progressLabel}>{phaseLabel[phase]}</p>
                </div>
            )}

            {/* ── 오류 ── */}
            {phase === 'error' && (
                <div className={styles.errorBox}>
                    <span className="material-symbols-outlined">error</span>
                    {errorMsg}
                </div>
            )}

            {/* ── 결과 ── */}
            {phase === 'done' && gifUrl && (
                <div className={styles.resultSection}>
                    <h2 className={styles.resultTitle}>변환 완료</h2>
                    <div className={styles.resultContent}>
                        <div className={styles.resultPreview}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={gifUrl} alt="변환된 GIF" className={styles.resultGif} />
                        </div>
                        <div className={styles.resultMeta}>
                            <p className={styles.resultSize}>파일 크기: <strong>{fmtSize(gifSize)}</strong></p>
                            <a
                                href={gifUrl}
                                download="output.gif"
                                className={styles.downloadBtn}
                            >
                                <span className="material-symbols-outlined">download</span>
                                GIF 다운로드
                            </a>
                            <button className={styles.retryBtn} onClick={() => setPhase('idle')}>
                                다시 설정
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
