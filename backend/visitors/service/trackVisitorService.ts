import { query } from "../../config/db";

/**
 * 방문자 추적 기록 서비스
 * UPSERT로 오늘 날짜의 count 증가
 */
export const trackVisitorService = async (): Promise<{ tracked: true }> => {
    /* CURRENT_DATE는 UTC 기준 → KST(UTC+9) 날짜로 변환 */
    const sql = `
        INSERT INTO visitors (visit_date, count)
        VALUES ((NOW() AT TIME ZONE 'Asia/Seoul')::date, 1)
        ON CONFLICT (visit_date)
        DO UPDATE SET count = visitors.count + 1
    `;
    await query(sql);
    return { tracked: true };
};
