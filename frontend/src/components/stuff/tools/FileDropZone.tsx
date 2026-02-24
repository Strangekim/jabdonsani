'use client';

/**
 * FileDropZone — 파일 드래그&드롭 / 클릭 업로드 공통 컴포넌트
 *
 * 여러 도구 페이지에서 재사용 가능합니다.
 * `accept` prop으로 허용할 파일 형식을 지정합니다.
 */

import { useRef, useState, useCallback } from 'react';
import styles from './FileDropZone.module.css';

interface FileDropZoneProps {
    /** 파일 추가 콜백 */
    onFilesAdded: (files: File[]) => void;
    /** 허용 파일 형식 (input accept 속성 형식, 예: ".pdf,application/pdf") */
    accept: string;
    /** 다중 선택 허용 여부 (기본: true) */
    multiple?: boolean;
    /** 드롭존 하단에 표시할 힌트 텍스트 */
    hint?: string;
    /** 비활성화 여부 */
    disabled?: boolean;
}

export default function FileDropZone({
    onFilesAdded,
    accept,
    multiple = true,
    hint,
    disabled = false,
}: FileDropZoneProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    /** File/FileList를 배열로 변환 후 콜백 호출 */
    const handleFiles = useCallback(
        (fileList: FileList | null) => {
            if (!fileList || disabled) return;
            const files = Array.from(fileList);
            if (files.length > 0) onFilesAdded(files);
        },
        [onFilesAdded, disabled]
    );

    /* 드래그 이벤트 핸들러 */
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setIsDragOver(true);
    };
    const handleDragLeave = (e: React.DragEvent) => {
        /* 자식 요소로 이동할 때 leave가 발생하는 것을 방지 */
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragOver(false);
        }
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
    };

    const handleClick = () => {
        if (!disabled) inputRef.current?.click();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    };

    return (
        <div
            className={[
                styles.zone,
                isDragOver && styles.dragOver,
                disabled && styles.disabled,
            ]
                .filter(Boolean)
                .join(' ')}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={`파일 업로드 — 클릭하거나 파일을 끌어다 놓으세요`}
            aria-disabled={disabled}
        >
            {/* 숨겨진 파일 input */}
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                className={styles.hiddenInput}
                onChange={(e) => handleFiles(e.target.files)}
                /* 같은 파일 재선택이 가능하도록 클릭마다 value 초기화 */
                onClick={(e) => ((e.target as HTMLInputElement).value = '')}
            />

            {/* 업로드 아이콘 */}
            <span className={`material-symbols-outlined ${styles.uploadIcon}`} aria-hidden="true">
                {isDragOver ? 'file_download' : 'upload_file'}
            </span>

            {/* 안내 텍스트 */}
            <p className={styles.primaryText}>
                파일을 여기에 끌어다 놓거나{' '}
                <span className={styles.clickText}>클릭해서 선택</span>
            </p>

            {hint && <p className={styles.hint}>{hint}</p>}
        </div>
    );
}
