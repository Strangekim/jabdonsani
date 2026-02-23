import { query } from "../../config/db";

interface PopularTrendItem {
    id: number;
    title: string;
    source: string;
    upvotes: number;
    createdAt: string;
}

/**
 * 인기 동향(오늘의 TOP 5) 조회 서비스 — 업보트 기준
 */
export const getPopularTrendsService = async (): Promise<PopularTrendItem[]> => {
    const sql = `
        SELECT
            id, title, source, upvotes, created_at AS "createdAt"
        FROM trends
        WHERE created_at >= NOW() - INTERVAL '24 HOURS'
        ORDER BY upvotes DESC
        LIMIT 5
    `;
    const result = await query(sql);
    return result.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        source: row.source,
        upvotes: row.upvotes,
        createdAt: new Date(row.createdAt).toISOString(),
    }));
};
