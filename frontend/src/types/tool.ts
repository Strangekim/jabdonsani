/* ================================================================
   잡동사니 도구(Tool) 관련 타입
   ================================================================ */

/** 도구 사용량 조회 응답 아이템 */
export interface ToolUsageItem {
    /** 도구 고유 ID (slug) */
    id: string;
    /** 도구 이름 (한국어) */
    name: string;
    /** 누적 사용 횟수 */
    count: number;
}

/** 도구 카드 정보 (프론트엔드 하드코딩용) */
export interface ToolCardInfo {
    /** 고유 도구 ID (URL 슬러그로 사용) */
    id: string;
    /** 도구 이름 */
    name: string;
    /** 간단한 설명 */
    description: string;
    /** Material Symbol 아이콘 이름 (기존 목데이터용) */
    icon?: string;
    /** CSS 클래스명 (기존 목데이터용 백그라운드 그라데이션) */
    colorClass?: string;
    /** 썸네일 이미지 URL (실제 이미지 사용 시) */
    imageUrl?: string;
}
