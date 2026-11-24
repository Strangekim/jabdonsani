import type { Metadata } from 'next';
import InkClient from './InkClient';

export const metadata: Metadata = {
  title: 'INK — 입체 영토 전략',
  description: '잉크와 입체 구조물로 영토를 경쟁하는 턴제 추상 전략 게임',
};

export default function InkPage() {
  return <InkClient />;
}
