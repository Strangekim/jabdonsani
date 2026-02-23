/* ================================================================
   공통 유틸리티 함수
   날짜 포맷팅, 숫자 포맷팅 등 프로젝트 전역에서 사용되는 헬퍼
   ================================================================ */

/**
 * ISO 날짜 문자열을 "YYYY.MM.DD" 형식으로 변환
 *
 * @param isoString - ISO 8601 형식의 날짜 문자열
 * @returns 포맷된 날짜 문자열 (예: "2026.02.18")
 */
export function formatDate(isoString: string): string {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

/**
 * 숫자를 쉼표 구분 문자열로 변환
 *
 * @param num - 변환할 숫자
 * @returns 포맷된 문자열 (예: 1247 → "1,247")
 */
export function formatNumber(num: number): string {
    return num.toLocaleString('ko-KR');
}

/**
 * ISO 날짜 문자열을 상대 시간으로 변환 (예: "3시간 전")
 *
 * @param isoString - ISO 8601 형식의 날짜 문자열
 * @returns 상대 시간 문자열
 */
export function formatRelativeTime(isoString: string): string {
    const now = Date.now();
    const target = new Date(isoString).getTime();
    const diff = now - target;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금 전';
}

/**
 * 문자열을 URL 안전한 slug로 변환
 *
 * @param text - 변환할 문자열
 * @returns 소문자 하이픈 구분 slug
 */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
