'use client';

/**
 * ImageCompressClient — 이미지 압축 도구 클라이언트 컴포넌트
 *
 * Canvas API를 사용하여 완전히 클라이언트 사이드에서 이미지를 압축합니다.
 * 파일은 서버로 전송되지 않습니다.
 *
 * 흐름: 이미지 업로드 → 품질/최대크기 설정 → 압축 → 비교 & 다운로드
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import ToolPageShell from '@/components/stuff/tools/ToolPageShell';
import FileDropZone from '@/components/stuff/tools/FileDropZone';
import { recordToolUse } from '@/services/tools.service';
import styles from './ImageCompress.module.css';

/** 출력 포맷 옵션 */
type OutputFormat = 'image/jpeg' | 'image/webp' | 'image/png';

/** 압축 상태 */
type CompressStatus = 'idle' | 'compressing' | 'done' | 'error';

/** 파일 크기를 읽기 좋은 형식으로 변환 */
const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/** 감소율 계산 (소수점 1자리) */
const reductionRate = (original: number, compressed: number): string => {
    const rate = ((original - compressed) / original) * 100;
    return rate.toFixed(1);
};

/** Canvas API로 이미지 압축 */
const compressImage = (
    file: File,
    quality: number,     /* 0~100 */
    maxDim: number,      /* px, 0이면 리사이즈 없음 */
    format: OutputFormat
): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            /* 최대 크기 초과 시 비율 유지하며 축소 */
            let { naturalWidth: w, naturalHeight: h } = img;
            if (maxDim > 0 && (w > maxDim || h > maxDim)) {
                if (w >= h) {
                    h = Math.round((h * maxDim) / w);
                    w = maxDim;
                } else {
                    w = Math.round((w * maxDim) / h);
                    h = maxDim;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('Canvas context 생성 실패')); return; }

            /* PNG를 투명 배경으로 내보낼 때를 위해 흰 배경 미설정 */
            ctx.drawImage(img, 0, 0, w, h);

            canvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('이미지 변환 실패'));
                },
                format,
                format === 'image/png' ? undefined : quality / 100
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('이미지 로드 실패'));
        };
        img.src = objectUrl;
    });
};

export default function ImageCompressClient() {
    /* ===== 원본 파일 ===== */
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    /* ===== 설정 ===== */
    const [quality, setQuality] = useState(80);            /* JPEG/WebP 품질 */
    const [maxDim, setMaxDim] = useState(1920);            /* 최대 가로/세로 px */
    const [format, setFormat] = useState<OutputFormat>('image/jpeg');

    /* ===== 결과 ===== */
    const [status, setStatus] = useState<CompressStatus>('idle');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [compressedSize, setCompressedSize] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');

    /* 결과 URL 메모리 해제 */
    const downloadUrlRef = useRef<string | null>(null);
    useEffect(() => {
        downloadUrlRef.current = downloadUrl;
    }, [downloadUrl]);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* ===== 파일 추가 핸들러 ===== */
    const handleFilesAdded = useCallback((files: File[]) => {
        const img = files.find((f) => f.type.startsWith('image/'));
        if (!img) return;

        /* 이전 상태 정리 */
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);

        setSourceFile(img);
        setPreviewUrl(URL.createObjectURL(img));
        setStatus('idle');
        setDownloadUrl(null);
        setCompressedSize(0);
        setErrorMessage('');
    }, [previewUrl, downloadUrl]);

    /* ===== 압축 실행 ===== */
    const handleCompress = async () => {
        if (!sourceFile) return;

        setStatus('compressing');
        setErrorMessage('');

        try {
            const blob = await compressImage(sourceFile, quality, maxDim, format);

            if (downloadUrl) URL.revokeObjectURL(downloadUrl);
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setCompressedSize(blob.size);
            setStatus('done');

            /* 사용량 기록 */
            recordToolUse('image-compress').catch(() => {});
        } catch (err) {
            console.error('[Image Compress]', err);
            setErrorMessage(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
            setStatus('error');
        }
    };

    /* ===== 초기화 ===== */
    const handleReset = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setSourceFile(null);
        setPreviewUrl(null);
        setDownloadUrl(null);
        setCompressedSize(0);
        setStatus('idle');
        setErrorMessage('');
    };

    /* 다운로드 파일명 (원본명 + 포맷 확장자) */
    const downloadFilename = sourceFile
        ? `${sourceFile.name.replace(/\.[^.]+$/, '')}_compressed.${format.split('/')[1]}`
        : 'compressed.jpg';

    return (
        <ToolPageShell
            name="이미지 압축"
            icon="compress"
            description="이미지 품질과 최대 크기를 조절하여 파일 용량을 줄입니다. 모든 처리는 브라우저에서 이루어지며 파일이 서버에 전송되지 않습니다."
        >
            {/* 파일 드롭존 (이미지가 없을 때만 표시) */}
            {!sourceFile && (
                <FileDropZone
                    accept="image/*"
                    multiple={false}
                    onFilesAdded={handleFilesAdded}
                    hint="JPEG, PNG, WebP, GIF 등 이미지 파일 지원"
                />
            )}

            {/* 원본 이미지 프리뷰 + 파일 교체 */}
            {sourceFile && previewUrl && (
                <div className={styles.previewSection}>
                    <div className={styles.previewHeader}>
                        <span className={styles.previewLabel}>원본 이미지</span>
                        <button
                            type="button"
                            className={styles.changeBtn}
                            onClick={handleReset}
                            disabled={status === 'compressing'}
                        >
                            이미지 변경
                        </button>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="원본 이미지" className={styles.preview} />
                    <p className={styles.fileMeta}>
                        {sourceFile.name}
                        <span className={styles.fileMetaSep}>·</span>
                        {formatBytes(sourceFile.size)}
                    </p>
                </div>
            )}

            {/* 압축 설정 */}
            {sourceFile && (
                <section className={styles.settingsSection}>
                    <h2 className={styles.sectionTitle}>압축 설정</h2>

                    {/* 출력 포맷 */}
                    <div className={styles.field}>
                        <label className={styles.label}>출력 형식</label>
                        <div className={styles.formatBtns}>
                            {(
                                [
                                    { value: 'image/jpeg', label: 'JPEG' },
                                    { value: 'image/webp', label: 'WebP' },
                                    { value: 'image/png', label: 'PNG' },
                                ] as { value: OutputFormat; label: string }[]
                            ).map(({ value, label }) => (
                                <button
                                    key={value}
                                    type="button"
                                    className={`${styles.formatBtn} ${format === value ? styles.formatBtnActive : ''}`}
                                    onClick={() => setFormat(value)}
                                    disabled={status === 'compressing'}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 품질 슬라이더 (PNG는 무손실이므로 비활성화) */}
                    <div className={`${styles.field} ${format === 'image/png' ? styles.fieldDisabled : ''}`}>
                        <label className={styles.label} htmlFor="quality-slider">
                            품질
                            <span className={styles.qualityValue}>{format === 'image/png' ? '무손실' : `${quality}%`}</span>
                        </label>
                        <input
                            id="quality-slider"
                            type="range"
                            min={10}
                            max={100}
                            step={5}
                            value={quality}
                            onChange={(e) => setQuality(Number(e.target.value))}
                            disabled={format === 'image/png' || status === 'compressing'}
                            className={styles.slider}
                        />
                        <div className={styles.sliderHints}>
                            <span>낮음 (작은 용량)</span>
                            <span>높음 (좋은 화질)</span>
                        </div>
                    </div>

                    {/* 최대 크기 */}
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="max-dim">
                            최대 크기 (px)
                        </label>
                        <div className={styles.maxDimRow}>
                            <input
                                id="max-dim"
                                type="number"
                                min={100}
                                max={8192}
                                step={100}
                                value={maxDim}
                                onChange={(e) => setMaxDim(Number(e.target.value))}
                                disabled={status === 'compressing'}
                                className={styles.numInput}
                            />
                            <span className={styles.maxDimHint}>가로/세로 중 긴 변 기준</span>
                        </div>
                    </div>
                </section>
            )}

            {/* 압축 버튼 */}
            {sourceFile && (
                <div className={styles.actionArea}>
                    <button
                        type="button"
                        className={styles.compressBtn}
                        onClick={handleCompress}
                        disabled={status === 'compressing'}
                        aria-busy={status === 'compressing'}
                    >
                        {status === 'compressing' ? (
                            <>
                                <span
                                    className={`material-symbols-outlined ${styles.spinIcon}`}
                                    aria-hidden="true"
                                >
                                    progress_activity
                                </span>
                                압축 중...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined" aria-hidden="true">
                                    compress
                                </span>
                                이미지 압축하기
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* 오류 배너 */}
            {status === 'error' && (
                <div className={styles.errorBanner} role="alert">
                    <span className="material-symbols-outlined" aria-hidden="true">error</span>
                    <div>
                        <strong>압축에 실패했습니다</strong>
                        <p>{errorMessage}</p>
                    </div>
                </div>
            )}

            {/* 완료 배너 */}
            {status === 'done' && downloadUrl && sourceFile && (
                <div className={styles.successBanner} role="status">
                    <div className={styles.successStats}>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>원본</span>
                            <span className={styles.statValue}>{formatBytes(sourceFile.size)}</span>
                        </div>
                        <span className={styles.statArrow}>
                            <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                        </span>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>압축 후</span>
                            <span className={`${styles.statValue} ${styles.statValueGreen}`}>
                                {formatBytes(compressedSize)}
                            </span>
                        </div>
                        <div className={styles.statBadge}>
                            -{reductionRate(sourceFile.size, compressedSize)}%
                        </div>
                    </div>
                    <a
                        href={downloadUrl}
                        download={downloadFilename}
                        className={styles.downloadBtn}
                    >
                        <span className="material-symbols-outlined" aria-hidden="true">download</span>
                        다운로드
                    </a>
                </div>
            )}
        </ToolPageShell>
    );
}
