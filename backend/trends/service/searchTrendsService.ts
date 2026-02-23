import { query } from "../../config/db";
import { CursorPage } from "../../types/api";

interface SearchTrendItem {
    id: number;
    source: string;
    title: string;
    content: string;
    relevance: number;
    upvotes: number;
    views: number;
    originalUrl: string;
    createdAt: string;
}

/**
 * 동향 검색 (커서 기반) 서비스
 * PostgreSQL Full-Text Search + trigram 병행
 */
export const searchTrendsService = async (
    q: string,
    field?: string,
    source?: string,
    cursor?: string,
    limit: number = 20
): Promise<CursorPage<SearchTrendItem>> => {

    // ts_rank로 relevance 계산
    let sql = `
        SELECT
            t.id, t.source, t.title, t.content, t.upvotes,
            t.original_url AS "originalUrl",
            t.created_at AS "createdAt",
            ts_rank(
                to_tsvector('simple', coalesce(t.title, '') || ' ' || coalesce(t.content, '')),
                plainto_tsquery('simple', $1)
            ) AS relevance
        FROM trends t
        WHERE (t.title ILIKE $2 OR t.content ILIKE $2)
    `;
    const likePattern = `%${q}%`;
    const params: any[] = [q, likePattern];
    let paramIndex = 3;

    if (field) {
        sql += ` AND t.field = $${paramIndex++}`;
        params.push(field);
    }

    if (source) {
        sql += ` AND t.source = $${paramIndex++}`;
        params.push(source);
    }

    if (cursor) {
        sql += ` AND t.created_at < $${paramIndex++}`;
        params.push(cursor);
    }

    sql += ` ORDER BY relevance DESC, t.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit + 1);

    const result = await query(sql, params);
    const rows = result.rows;

    let hasMore = false;
    if (rows.length > limit) {
        hasMore = true;
        rows.pop();
    }

    const nextCursor = hasMore && rows.length > 0
        ? new Date(rows[rows.length - 1].createdAt).toISOString()
        : null;

    // totalCount
    let countSql = `SELECT COUNT(*) FROM trends t WHERE (t.title ILIKE $1 OR t.content ILIKE $1)`;
    const countParams: any[] = [likePattern];
    let cIndex = 2;
    if (field) { countSql += ` AND t.field = $${cIndex++}`; countParams.push(field); }
    if (source) { countSql += ` AND t.source = $${cIndex++}`; countParams.push(source); }
    const countResult = await query(countSql, countParams);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    const items: SearchTrendItem[] = rows.map((row: any) => ({
        id: row.id,
        source: row.source,
        title: row.title,
        content: row.content,
        relevance: parseFloat(row.relevance) || 0,
        upvotes: row.upvotes,
        views: 0,
        originalUrl: row.originalUrl,
        createdAt: new Date(row.createdAt).toISOString(),
    }));

    return { items, nextCursor, hasMore, totalCount };
};
