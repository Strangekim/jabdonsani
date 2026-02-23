/**
 * ToolCard 컴포넌트 — neal.fun 스타일 도구 카드
 *
 * 프로토타입 stuff.html의 도구 카드 디자인을 React 컴포넌트로 구현.
 * 아이콘, 이름, 설명을 표시하며 도구별 배경 그라데이션이 적용됩니다.
 * 클릭 시 해당 도구 상세 페이지로 이동합니다.
 */

import Link from 'next/link';
import Image from 'next/image';
import type { ToolCardInfo } from '@/types/tool';
import styles from './ToolCard.module.css';

interface ToolCardProps {
    /** 도구 카드 데이터 */
    tool: ToolCardInfo;
}

export default function ToolCard({ tool }: ToolCardProps) {
    const isImageMode = !!tool.imageUrl;

    return (
        <Link
            href={`/stuff/${tool.id}`}
            className={`${styles.card} ${isImageMode ? styles.hasImage : (tool.colorClass ? styles[tool.colorClass] : '')}`}
        >
            {isImageMode ? (
                <>
                    <Image
                        src={tool.imageUrl!}
                        alt={tool.name}
                        fill
                        sizes="(max-width: 560px) 100vw, (max-width: 860px) 50vw, 33vw"
                        priority={true}
                        style={{ objectFit: 'cover' }}
                        className={styles.cardImage}
                    />
                    {/* 이미지가 있을 때는 오버레이 텍스트와 아이콘을 제거합니다. */}
                </>
            ) : (
                <>
                    {tool.icon && <span className={styles.cardIcon}>{tool.icon}</span>}
                    <span className={styles.cardName}>{tool.name}</span>
                    <span className={styles.cardDesc}>{tool.description}</span>
                </>
            )}
        </Link>
    );
}
