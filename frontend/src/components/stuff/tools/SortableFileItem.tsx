'use client';

/**
 * SortableFileItem — 드래그 정렬 가능한 파일 목록 아이템
 *
 * @dnd-kit의 useSortable 훅을 사용합니다.
 * 드래그 핸들, 순서 번호, 파일 정보, 삭제 버튼을 포함합니다.
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './SortableFileItem.module.css';

/** 파일 크기를 읽기 좋은 형식으로 변환 */
const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface SortableFileItemProps {
    /** 드래그 키 (고유 ID) */
    id: string;
    /** 파일 객체 */
    file: File;
    /** 목록 내 순서 (0부터 시작) */
    index: number;
    /** 파일 아이콘 (Material Symbol 이름) */
    fileIcon?: string;
    /** 파일 아이콘 색상 CSS 값 */
    fileIconColor?: string;
    /** 삭제 버튼 클릭 콜백 */
    onRemove: (id: string) => void;
}

export default function SortableFileItem({
    id,
    file,
    index,
    fileIcon = 'description',
    fileIconColor = 'var(--color-accent)',
    onRemove,
}: SortableFileItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        /* 드래그 중인 아이템은 반투명 처리 */
        opacity: isDragging ? 0.45 : 1,
        /* 드래그 중에는 다른 아이템 위로 올라오도록 */
        zIndex: isDragging ? 999 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`${styles.item} ${isDragging ? styles.dragging : ''}`}
        >
            {/* 드래그 핸들 */}
            <button
                className={styles.dragHandle}
                {...attributes}
                {...listeners}
                aria-label="드래그하여 순서 변경"
                tabIndex={0}
            >
                <span className="material-symbols-outlined" aria-hidden="true">
                    drag_indicator
                </span>
            </button>

            {/* 순서 번호 배지 */}
            <span className={styles.indexBadge} aria-label={`${index + 1}번째`}>
                {index + 1}
            </span>

            {/* 파일 아이콘 */}
            <span
                className={`material-symbols-outlined ${styles.fileIcon}`}
                style={{ color: fileIconColor }}
                aria-hidden="true"
            >
                {fileIcon}
            </span>

            {/* 파일 정보 */}
            <div className={styles.info}>
                <span className={styles.filename} title={file.name}>
                    {file.name}
                </span>
                <span className={styles.filesize}>{formatBytes(file.size)}</span>
            </div>

            {/* 삭제 버튼 */}
            <button
                className={styles.removeBtn}
                onClick={() => onRemove(id)}
                aria-label={`"${file.name}" 제거`}
            >
                <span className="material-symbols-outlined" aria-hidden="true">
                    close
                </span>
            </button>
        </div>
    );
}
