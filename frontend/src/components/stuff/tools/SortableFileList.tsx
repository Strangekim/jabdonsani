'use client';

/**
 * SortableFileList — 드래그로 순서 변경 가능한 파일 목록
 *
 * @dnd-kit의 DndContext + SortableContext를 조합합니다.
 * 마우스/터치 드래그와 키보드(Space+방향키) 정렬을 모두 지원합니다.
 */

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import SortableFileItem from './SortableFileItem';
import styles from './SortableFileList.module.css';

/** 파일 목록 아이템 타입 — 외부에서도 참조할 수 있도록 export */
export interface FileItem {
    /** 드래그 키로 사용하는 고유 ID */
    id: string;
    /** 파일 객체 */
    file: File;
}

interface SortableFileListProps {
    /** 현재 파일 목록 */
    items: FileItem[];
    /** 순서 변경 후 새 배열을 돌려주는 콜백 */
    onReorder: (items: FileItem[]) => void;
    /** 특정 파일 삭제 콜백 */
    onRemove: (id: string) => void;
    /** 각 아이템에 표시할 파일 아이콘 (Material Symbol 이름) */
    fileIcon?: string;
    /** 파일 아이콘 색상 CSS 값 */
    fileIconColor?: string;
}

export default function SortableFileList({
    items,
    onReorder,
    onRemove,
    fileIcon,
    fileIconColor,
}: SortableFileListProps) {
    /* PointerSensor: 마우스/터치 드래그 */
    /* KeyboardSensor: Space + 방향키 정렬 */
    const sensors = useSensors(
        useSensor(PointerSensor, {
            /* 5px 이상 움직여야 드래그로 인식 → 클릭과 구분 */
            activationConstraint: { distance: 5 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    /** 드래그 종료 시 배열 재정렬 */
    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;

        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        onReorder(arrayMove(items, oldIndex, newIndex));
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
            >
                <ul className={styles.list} role="list" aria-label="업로드된 파일 목록">
                    {items.map((item, index) => (
                        <li key={item.id}>
                            <SortableFileItem
                                id={item.id}
                                file={item.file}
                                index={index}
                                fileIcon={fileIcon}
                                fileIconColor={fileIconColor}
                                onRemove={onRemove}
                            />
                        </li>
                    ))}
                </ul>
            </SortableContext>
        </DndContext>
    );
}
