import { query } from "../../config/db";
import { CursorPage } from "../../types/api";
import { SOURCE_TAG_MAP, FIELD_TAG_MAP } from "../model";

interface TopComment {
    text: string;
    votes: number;
}

interface TrendItem {
    id: number;
    source: string;
    fieldTag: string;
    sourceTags: string[];
    fieldTags: string[];
    title: string;
    content: string;
    thumbnails: string[];
    commentSummary: string;
    topComments: TopComment[];
    upvotes: number;
    views: number;
    originalUrl: string;
    createdAt: string;
}

/**
 * 동향 카드 목록 조회 (커서 기반 멀티 필터링) 서비스
 */
export const getTrendsService = async (
    field?: string,
    source?: string,
    cursor?: string,
    limit: number = 20
): Promise<CursorPage<TrendItem>> => {

    let sql = `
        SELECT
            t.id, t.source, t.field,
            t.title, t.content, t.comment_summary AS "commentSummary",
            t.thumbnails, t.upvotes, t.original_url AS "originalUrl",
            t.created_at AS "createdAt"
        FROM trends t
        WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

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

    sql += ` ORDER BY t.created_at DESC LIMIT $${paramIndex}`;
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
    let countSql = `SELECT COUNT(*) FROM trends t WHERE 1=1`;
    const countParams: any[] = [];
    let cIndex = 1;
    if (field) { countSql += ` AND t.field = $${cIndex++}`; countParams.push(field); }
    if (source) { countSql += ` AND t.source = $${cIndex++}`; countParams.push(source); }
    const countResult = await query(countSql, countParams);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // trend_comments 조회 (각 트렌드별 상위 댓글)
    const trendIds = rows.map((r: any) => r.id);
    let commentsMap: Record<number, TopComment[]> = {};

    if (trendIds.length > 0) {
        const commentsSql = `
            SELECT trend_id, text, votes
            FROM trend_comments
            WHERE trend_id = ANY($1)
            ORDER BY votes DESC
        `;
        const commentsResult = await query(commentsSql, [trendIds]);
        for (const c of commentsResult.rows) {
            if (!commentsMap[c.trend_id]) commentsMap[c.trend_id] = [];
            commentsMap[c.trend_id].push({ text: c.text, votes: c.votes });
        }
    }

    // 응답 매핑
    const items: TrendItem[] = rows.map((row: any) => ({
        id: row.id,
        source: row.source,
        fieldTag: row.field,
        sourceTags: [SOURCE_TAG_MAP[row.source] || `#${row.source}`],
        fieldTags: [FIELD_TAG_MAP[row.field] || `#${row.field}`],
        title: row.title,
        content: row.content,
        thumbnails: row.thumbnails || [],
        commentSummary: row.commentSummary || "",
        topComments: commentsMap[row.id] || [],
        upvotes: row.upvotes,
        views: 0, // trends 테이블에 views 컬럼 없음 — 추후 추가 시 반영
        originalUrl: row.originalUrl,
        createdAt: new Date(row.createdAt).toISOString(),
    }));

    return { items, nextCursor, hasMore, totalCount };
};
