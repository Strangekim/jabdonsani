import type { Metadata } from 'next';
import MbtiClient from './MbtiClient';

export const metadata: Metadata = {
    title: 'MBTI 검사',
    description:
        '일상 속 64문항에 답하고 네 글자 추정 MBTI 유형과 8가지 기능 점수를 확인하세요. 응답은 브라우저에 저장되는 자기이해용 검사입니다.',
};

export default function MbtiPage() {
    return <MbtiClient />;
}
