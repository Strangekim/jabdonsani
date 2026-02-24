/**
 * 주사위 굴리기 페이지 — 서버 컴포넌트 (메타데이터 전용)
 */

import type { Metadata } from 'next';
import DiceRollerClient from './DiceRollerClient';

export const metadata: Metadata = {
    title: '주사위 굴리기',
    description: 'D4~D20 다면체 주사위를 3D로 굴려보세요.',
};

export default function DiceRollerPage() {
    return <DiceRollerClient />;
}
