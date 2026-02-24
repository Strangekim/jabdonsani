'use client';

/**
 * PdfMergeClient — PDF 병합 도구 클라이언트 컴포넌트
 *
 * pdf-lib를 사용하여 완전히 클라이언트 사이드에서 PDF를 병합합니다.
 * 파일은 서버로 전송되지 않으며, 처리 결과는 Blob URL로 다운로드됩니다.
 *
 * 흐름: 파일 추가 → 드래그로 순서 조정 → 병합 → 다운로드
 */

import { useState, useEffect, useCallback } from 'react';
import type { FileItem } from '@/components/stuff/tools/SortableFileList';
import ToolPageShell from '@/components/stuff/tools/ToolPageShell';
import FileDropZone from '@/components/stuff/tools/FileDropZone';
import SortableFileList from '@/components/stuff/tools/SortableFileList';
import { recordToolUse } from '@/services/tools.service';
import styles from './PdfMerge.module.css';

/** 병합 진행 상태 */
type MergeStatus = 'idle' | 'merging' | 'done' | 'error';

export default function PdfMergeClient() {
    /* ===== 상태 ===== */
    const [fileItems, setFileItems] = useState<FileItem[]>([]);
    const [status, setStatus] = useState<MergeStatus>('idle');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    /* 컴포넌트 언마운트 시 Blob URL 메모리 해제 */
    useEffect(() => {
        return () => {
            if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        };
    }, [downloadUrl]);

    /* ===== 파일 추가 핸들러 ===== */
    const handleFilesAdded = useCallback(
        (files: File[]) => {
            /* PDF 파일만 허용 */
            const pdfs = files.filter(
                (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
            );
            if (pdfs.length === 0) return;

            setFileItems((prev) => [
                ...prev,
                ...pdfs.map((file) => ({ id: crypto.randomUUID(), file })),
            ]);

            /* 새 파일이 추가되면 이전 완료 결과 초기화 */
            setStatus('idle');
            if (downloadUrl) {
                URL.revokeObjectURL(downloadUrl);
                setDownloadUrl(null);
            }
        },
        [downloadUrl]
    );

    /* ===== 파일 제거 핸들러 ===== */
    const handleRemove = useCallback((id: string) => {
        setFileItems((prev) => prev.filter((item) => item.id !== id));
    }, []);

    /* ===== 드래그 순서 변경 핸들러 ===== */
    const handleReorder = useCallback((items: FileItem[]) => {
        setFileItems(items);
    }, []);

    /* ===== 전체 초기화 ===== */
    const handleReset = useCallback(() => {
        setFileItems([]);
        setStatus('idle');
        setErrorMessage('');
        if (downloadUrl) {
            URL.revokeObjectURL(downloadUrl);
            setDownloadUrl(null);
        }
    }, [downloadUrl]);

    /* ===== PDF 병합 실행 ===== */
    const handleMerge = async () => {
        if (fileItems.length < 2) return;

        setStatus('merging');
        setErrorMessage('');

        try {
            /* 동적 import — 초기 번들 크기 최소화 */
            const { PDFDocument } = await import('pdf-lib');

            const merged = await PDFDocument.create();

            for (const item of fileItems) {
                const arrayBuffer = await item.file.arrayBuffer();
                const doc = await PDFDocument.load(arrayBuffer);
                const pageIndices = doc.getPageIndices();
                const copiedPages = await merged.copyPages(doc, pageIndices);
                copiedPages.forEach((page) => merged.addPage(page));
            }

            const pdfBytes = await merged.save();
            /* ArrayBufferLike → ArrayBuffer 캐스팅으로 Blob 타입 호환 */
            const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

            /* 이전 URL 해제 후 새 URL 생성 */
            if (downloadUrl) URL.revokeObjectURL(downloadUrl);
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('done');

            /* 사용량 기록 — 실패해도 병합 결과에 영향 없음 */
            recordToolUse('pdf-merge').catch(() => {});
        } catch (err) {
            console.error('[PDF Merge]', err);
            setErrorMessage(
                err instanceof Error
                    ? err.message
                    : '알 수 없는 오류가 발생했습니다.'
            );
            setStatus('error');
        }
    };

    const canMerge = fileItems.length >= 2 && status !== 'merging';

    return (
        <ToolPageShell
            name="PDF 병합"
            icon="picture_as_pdf"
            description="여러 개의 PDF 파일을 순서대로 하나의 문서로 합칩니다. 모든 처리는 브라우저에서 이루어지며 파일이 서버에 전송되지 않습니다."
        >
            {/* 파일 드롭존 */}
            <FileDropZone
                accept=".pdf,application/pdf"
                multiple
                onFilesAdded={handleFilesAdded}
                disabled={status === 'merging'}
                hint="PDF 파일만 지원됩니다"
            />

            {/* 파일 목록 — 1개 이상 추가됐을 때만 표시 */}
            {fileItems.length > 0 && (
                <section className={styles.fileSection}>
                    <div className={styles.listHeader}>
                        <span className={styles.listTitle}>
                            <span className="material-symbols-outlined" aria-hidden="true">
                                format_list_numbered
                            </span>
                            파일 목록 ({fileItems.length}개)
                        </span>
                        <button
                            type="button"
                            className={styles.clearBtn}
                            onClick={handleReset}
                            disabled={status === 'merging'}
                        >
                            전체 삭제
                        </button>
                    </div>
                    <p className={styles.reorderHint}>드래그하여 병합 순서를 변경하세요</p>
                    <SortableFileList
                        items={fileItems}
                        onReorder={handleReorder}
                        onRemove={handleRemove}
                        fileIcon="picture_as_pdf"
                        fileIconColor="#e53e3e"
                    />
                </section>
            )}

            {/* 병합 버튼 영역 */}
            <div className={styles.actionArea}>
                <button
                    type="button"
                    className={styles.mergeBtn}
                    onClick={handleMerge}
                    disabled={!canMerge}
                    aria-busy={status === 'merging'}
                >
                    {status === 'merging' ? (
                        <>
                            <span
                                className={`material-symbols-outlined ${styles.spinIcon}`}
                                aria-hidden="true"
                            >
                                progress_activity
                            </span>
                            병합 중...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined" aria-hidden="true">
                                merge
                            </span>
                            PDF 병합하기
                            {fileItems.length >= 2 && ` (${fileItems.length}개)`}
                        </>
                    )}
                </button>
                {fileItems.length === 0 && (
                    <p className={styles.mergeHint}>위에서 PDF 파일을 추가하세요</p>
                )}
                {fileItems.length === 1 && (
                    <p className={styles.mergeHint}>PDF 파일을 2개 이상 추가하세요</p>
                )}
            </div>

            {/* 오류 배너 */}
            {status === 'error' && (
                <div className={styles.errorBanner} role="alert">
                    <span className="material-symbols-outlined" aria-hidden="true">error</span>
                    <div>
                        <strong>병합에 실패했습니다</strong>
                        <p>{errorMessage}</p>
                    </div>
                </div>
            )}

            {/* 완료 배너 */}
            {status === 'done' && downloadUrl && (
                <div className={styles.successBanner} role="status">
                    <span className="material-symbols-outlined" aria-hidden="true">
                        check_circle
                    </span>
                    <div className={styles.successContent}>
                        <strong>병합 완료!</strong>
                        <p>{fileItems.length}개 파일이 하나로 합쳐졌습니다.</p>
                    </div>
                    <a href={downloadUrl} download="merged.pdf" className={styles.downloadBtn}>
                        <span className="material-symbols-outlined" aria-hidden="true">
                            download
                        </span>
                        다운로드
                    </a>
                </div>
            )}
        </ToolPageShell>
    );
}
