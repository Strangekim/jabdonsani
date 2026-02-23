import { query } from "../../config/db";

interface PopularPostItem {
    id: number;
    title: string;
    views: number;
    createdAt: string;
}

/**
 * 인기 블로그 글 조회 서비스 (TOP 5, 조회수 기준)
 */
export const getPopularPostsService = async (): Promise<PopularPostItem[]> => {
    const sql = `
        SELECT
            id, title, views,
            created_at AS "createdAt"
        FROM posts
        ORDER BY views DESC
        LIMIT 5
    `;
    const result = await query(sql);
    return result.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        views: row.views,
        createdAt: new Date(row.createdAt).toISOString(),
    }));
};
