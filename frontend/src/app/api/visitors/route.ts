import { NextResponse } from 'next/server';

/**
 * 방문자 수 더미 API 엔드포인트
 * 
 * 프론트엔드 개발 중 /api/visitors 404 에러 발생을 막기 위한 모의(Mock) 라우트입니다.
 * 실제 백엔드 연동 시 이 파일은 삭제하거나 프록시 설정으로 덮어씌워야 합니다.
 */
export async function GET() {
    return NextResponse.json({
        success: true,
        data: {
            today: 128,
            total: 45092,
        },
    });
}
