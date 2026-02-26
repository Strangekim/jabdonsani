import { query } from "../../config/db";

interface VisitorStats {
    today: number;
    total: number;
}

/**
 * 방문자 통계 조회 서비스
 */
export const getVisitorsService = async (): Promise<VisitorStats> => {
    /* CURRENT_DATE는 UTC 기준 → KST(UTC+9) 날짜로 변환 */
    const todayResult = await query(`SELECT count FROM visitors WHERE visit_date = (NOW() AT TIME ZONE 'Asia/Seoul')::date`);
    const today = todayResult.rows.length > 0 ? todayResult.rows[0].count : 0;

    const totalResult = await query(`SELECT SUM(count) as total FROM visitors`);
    const total = totalResult.rows[0].total ? parseInt(totalResult.rows[0].total, 10) : 0;

    return { today, total };
};
