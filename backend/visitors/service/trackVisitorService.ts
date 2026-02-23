import { query } from "../../config/db";

/**
 * 방문자 추적 기록 서비스
 * UPSERT로 오늘 날짜의 count 증가
 */
export const trackVisitorService = async (ip: string, userAgent: string): Promise<{ tracked: true }> => {
    const sql = `
        INSERT INTO visitors (visit_date, count)
        VALUES (CURRENT_DATE, 1)
        ON CONFLICT (visit_date)
        DO UPDATE SET count = visitors.count + 1
    `;
    await query(sql);
    return { tracked: true };
};
