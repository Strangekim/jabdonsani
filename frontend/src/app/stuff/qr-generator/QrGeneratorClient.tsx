'use client';

/**
 * QrGeneratorClient — QR 코드 생성 도구 클라이언트 컴포넌트
 *
 * qrcode 라이브러리를 사용하여 완전히 클라이언트 사이드에서 QR 코드를 생성합니다.
 * 텍스트/URL 입력 → 실시간 미리보기 → PNG 다운로드 / 클립보드 복사
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import ToolPageShell from '@/components/stuff/tools/ToolPageShell';
import { recordToolUse } from '@/services/tools.service';
import styles from './QrGenerator.module.css';

/** QR 코드 크기 옵션 */
const SIZE_OPTIONS = [128, 256, 512] as const;
type QrSize = (typeof SIZE_OPTIONS)[number];

/** 디바운스 지연 (ms) — 입력 중 과도한 재생성 방지 */
const DEBOUNCE_MS = 400;

export default function QrGeneratorClient() {
    /* ===== 입력 상태 ===== */
    const [text, setText] = useState('');
    const [size, setSize] = useState<QrSize>(256);
    const [fgColor, setFgColor] = useState('#000000');
    const [bgColor, setBgColor] = useState('#ffffff');

    /* ===== QR 코드 이미지 ===== */
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    /* ===== 복사 피드백 ===== */
    const [copied, setCopied] = useState(false);

    /* ===== 사용량 기록 여부 (세션당 1회) ===== */
    const recordedRef = useRef(false);

    /* ===== 디바운스 타이머 ===== */
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /** QR 코드 생성 — 동적 import로 번들 크기 최소화 */
    const generateQr = useCallback(async (value: string) => {
        if (!value.trim()) {
            setQrDataUrl(null);
            setErrorMessage('');
            return;
        }

        setIsGenerating(true);
        setErrorMessage('');

        try {
            const QRCode = (await import('qrcode')).default;
            const dataUrl = await QRCode.toDataURL(value.trim(), {
                width: size,
                margin: 2,
                color: { dark: fgColor, light: bgColor },
                errorCorrectionLevel: 'M',
            });
            setQrDataUrl(dataUrl);

            /* 세션 최초 생성 시 사용량 기록 */
            if (!recordedRef.current) {
                recordedRef.current = true;
                recordToolUse('qr-generator').catch(() => {});
            }
        } catch (err) {
            console.error('[QR Generator]', err);
            setErrorMessage(err instanceof Error ? err.message : 'QR 코드 생성에 실패했습니다.');
            setQrDataUrl(null);
        } finally {
            setIsGenerating(false);
        }
    }, [size, fgColor, bgColor]);

    /* text / 설정 변경 시 디바운스 후 재생성 */
    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => generateQr(text), DEBOUNCE_MS);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [text, generateQr]);

    /* ===== PNG 다운로드 ===== */
    const handleDownload = () => {
        if (!qrDataUrl) return;
        const a = document.createElement('a');
        a.href = qrDataUrl;
        a.download = 'qrcode.png';
        a.click();
    };

    /* ===== 클립보드 복사 ===== */
    const handleCopy = async () => {
        if (!qrDataUrl) return;
        try {
            const res = await fetch(qrDataUrl);
            const blob = await res.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob }),
            ]);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* 클립보드 권한 없으면 무시 */
        }
    };

    const hasText = text.trim().length > 0;

    return (
        <ToolPageShell
            name="QR 코드 생성"
            icon="qr_code_2"
            description="URL이나 텍스트를 QR 코드로 변환합니다. 모든 처리는 브라우저에서 이루어지며 파일이 서버에 전송되지 않습니다."
        >
            {/* 텍스트 입력 */}
            <section className={styles.inputSection}>
                <label className={styles.inputLabel} htmlFor="qr-text">
                    URL 또는 텍스트
                </label>
                <textarea
                    id="qr-text"
                    className={styles.textarea}
                    placeholder="https://example.com 또는 원하는 텍스트를 입력하세요"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={3}
                    spellCheck={false}
                />
                <p className={styles.charCount}>{text.length}자</p>
            </section>

            {/* 설정 패널 */}
            <section className={styles.settingsSection}>
                <h2 className={styles.sectionTitle}>설정</h2>

                {/* 크기 선택 */}
                <div className={styles.field}>
                    <span className={styles.fieldLabel}>크기</span>
                    <div className={styles.sizeBtns}>
                        {SIZE_OPTIONS.map((s) => (
                            <button
                                key={s}
                                type="button"
                                className={`${styles.sizeBtn} ${size === s ? styles.sizeBtnActive : ''}`}
                                onClick={() => setSize(s)}
                            >
                                {s}px
                            </button>
                        ))}
                    </div>
                </div>

                {/* 색상 선택 */}
                <div className={styles.colorRow}>
                    <div className={styles.colorField}>
                        <label className={styles.fieldLabel} htmlFor="fg-color">
                            전경색
                        </label>
                        <div className={styles.colorInputWrapper}>
                            <input
                                id="fg-color"
                                type="color"
                                value={fgColor}
                                onChange={(e) => setFgColor(e.target.value)}
                                className={styles.colorInput}
                            />
                            <span className={styles.colorHex}>{fgColor.toUpperCase()}</span>
                        </div>
                    </div>
                    <div className={styles.colorField}>
                        <label className={styles.fieldLabel} htmlFor="bg-color">
                            배경색
                        </label>
                        <div className={styles.colorInputWrapper}>
                            <input
                                id="bg-color"
                                type="color"
                                value={bgColor}
                                onChange={(e) => setBgColor(e.target.value)}
                                className={styles.colorInput}
                            />
                            <span className={styles.colorHex}>{bgColor.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* QR 코드 미리보기 */}
            <section className={styles.previewSection}>
                <div className={styles.previewBox}>
                    {isGenerating && (
                        <div className={styles.previewPlaceholder}>
                            <span
                                className={`material-symbols-outlined ${styles.spinIcon}`}
                                aria-hidden="true"
                            >
                                progress_activity
                            </span>
                        </div>
                    )}

                    {!isGenerating && !hasText && (
                        <div className={styles.previewPlaceholder}>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '52px', color: 'var(--color-border)' }}
                                aria-hidden="true"
                            >
                                qr_code_2
                            </span>
                            <p className={styles.previewHint}>위에 텍스트를 입력하면<br />QR 코드가 생성됩니다</p>
                        </div>
                    )}

                    {!isGenerating && hasText && qrDataUrl && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={qrDataUrl}
                            alt="생성된 QR 코드"
                            className={styles.qrImage}
                            width={size}
                            height={size}
                        />
                    )}

                    {!isGenerating && errorMessage && (
                        <div className={styles.previewError}>
                            <span className="material-symbols-outlined" aria-hidden="true">error</span>
                            <p>{errorMessage}</p>
                        </div>
                    )}
                </div>

                {/* 다운로드 / 복사 버튼 */}
                {qrDataUrl && !isGenerating && (
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.downloadBtn}
                            onClick={handleDownload}
                        >
                            <span className="material-symbols-outlined" aria-hidden="true">download</span>
                            PNG 다운로드
                        </button>
                        <button
                            type="button"
                            className={`${styles.copyBtn} ${copied ? styles.copyBtnDone : ''}`}
                            onClick={handleCopy}
                        >
                            <span className="material-symbols-outlined" aria-hidden="true">
                                {copied ? 'check' : 'content_copy'}
                            </span>
                            {copied ? '복사됨!' : '클립보드 복사'}
                        </button>
                    </div>
                )}
            </section>
        </ToolPageShell>
    );
}
