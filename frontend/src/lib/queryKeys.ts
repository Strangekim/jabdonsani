/* ================================================================
   React Query 키 팩토리 — 쿼리 키 중앙 관리
   캐시 무효화와 키 충돌 방지를 위해 도메인별로 키를 정의합니다.
   ================================================================ */

export const queryKeys = {
    /** 인증 도메인 */
    auth: {
        /** 현재 로그인 상태 조회 */
        me: () => ['auth', 'me'] as const,
    },

    /** 방문자 수 도메인 */
    visitors: {
        /** 오늘/총 방문자 수 */
        count: () => ['visitors'] as const,
    },

    /** 동향 도메인 */
    trends: {
        /** 동향 무한 목록 (분야·소스 필터 포함) */
        list: (params: { field?: string; source?: string }) =>
            ['trends', 'list', params] as const,
        /** 동향 검색 결과 */
        search: (query: string) => ['trends', 'search', query] as const,
        /** 동향 인기글 */
        popular: () => ['trends', 'popular'] as const,
    },

    /** 블로그 도메인 */
    posts: {
        /** 블로그 무한 목록 (태그 필터 포함) */
        list: (params: { tag?: string }) => ['posts', 'list', params] as const,
        /** 블로그 글 상세 */
        detail: (id: number) => ['posts', 'detail', id] as const,
        /** 블로그 인기글 */
        popular: () => ['posts', 'popular'] as const,
    },

    /** 태그 도메인 */
    tags: {
        /** 태그 클라우드 목록 */
        list: () => ['tags'] as const,
    },

    /** 도구 도메인 */
    tools: {
        /** 도구 사용량 통계 */
        usage: () => ['tools', 'usage'] as const,
    },
} as const;
