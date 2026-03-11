/* ================================================================
   잡동사니 도구 목록 — 하드코딩으로 관리 (기획서 요구사항)
   새로운 도구 추가 시 이 배열에 항목을 추가하면 됩니다.
   ================================================================ */

import type { ToolCardInfo } from '@/types/tool';

/** 잡동사니 도구 목록 */
export const TOOL_LIST: ToolCardInfo[] = [
    {
        id: 'pdf-merge',
        name: 'PDF 병합',
        description: '여러 개의 PDF 파일을 하나의 문서로 합칩니다.',
        icon: 'picture_as_pdf',
        colorClass: 'pdfMerge',
        imageUrl: '/tools/pdf-merge.png',
    },
    {
        id: 'image-compress',
        name: '이미지 압축',
        description: '화질 손실 없이 이미지 파일 크기를 줄입니다.',
        icon: 'compress',
        colorClass: 'imageCompress',
        imageUrl: '/tools/image-compress.png',
    },
    {
        id: 'qr-generator',
        name: 'QR 코드 생성',
        description: 'URL이나 텍스트를 QR 코드로 변환합니다.',
        icon: 'qr_code_2',
        colorClass: 'qrGenerator',
        imageUrl: '/tools/qr-generator.png',
    },
    {
        id: 'dice-roller',
        name: '주사위 굴리기',
        description: 'D4~D20 다면체 주사위를 3D로 굴려보세요.',
        icon: 'casino',
        colorClass: 'diceRoller',
        imageUrl: '/tools/dice-roller.png',
    },
    {
        id: 'watermelon',
        name: '3D 수박게임',
        description: '과일을 합쳐 수박을 만들어보세요. 3D 물리 엔진 기반.',
        icon: 'sports_esports',
        colorClass: 'watermelonGame',
    },
    {
        id: 'bugshooter',
        name: 'Bug Shooter',
        description: '화면을 가득 채운 버그들을 조준해서 잡으세요.',
        icon: 'bug_report',
        colorClass: 'bugShooterGame',
    },
    {
        id: 'bowling',
        name: '바퀴벌레 볼링',
        description: '3D 볼링장에서 바퀴벌레 볼로 핀을 쓰러뜨리세요.',
        icon: 'sports_bowling',
        colorClass: 'bowlingGame',
    },
];
