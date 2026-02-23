import { query } from "../../config/db";

interface VisitorStats {
    today: number;
    total: number;
}

/**
 * 방문자 통계 조회 서비스
 */
export const getVisitorsService = async (): Promise<VisitorStats> => {
    const todayResult = await query(`SELECT count FROM visitors WHERE visit_date = CURRENT_DATE`);
    const today = todayResult.rows.length > 0 ? todayResult.rows[0].count : 0;

    const totalResult = await query(`SELECT SUM(count) as total FROM visitors`);
    const total = totalResult.rows[0].total ? parseInt(totalResult.rows[0].total, 10) : 0;

    return { today, total };
};
