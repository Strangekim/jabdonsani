import { query } from "../../config/db";
import { CursorPage } from "../../types/api";

interface PostListItem {
    id: number;
    title: string;
    description: string;
    tags: string[];
    views: number;
    createdAt: string;
}

/**
 * 블로그 글 목록 조회 서비스 (커서 기반, 태그 필터)
 * @param tag 태그 필터 (선택)
 * @param cursor 기준 커서
 * @param limit 조회 개수 (기본 10)
 */
export const getPostsService = async (
    tag?: string,
    cursor?: string,
    limit: number = 10
): Promise<CursorPage<PostListItem>> => {
    let sql = `
        SELECT
            p.id,
            p.title,
            COALESCE(p.description, LEFT(p.content, 200)) AS description,
            COALESCE(
                (SELECT array_agg(t.name)
                 FROM post_tags pt
                 JOIN tags t ON pt.tag_id = t.id
                 WHERE pt.post_id = p.id),
                '{}'
            ) AS tags,
            p.views,
            p.created_at AS "createdAt"
        FROM posts p
    `;

    const params: any[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    // 태그 필터: post_tags + tags 조인
    if (tag) {
        sql = `
            SELECT
                p.id,
                p.title,
                COALESCE(p.description, LEFT(p.content, 200)) AS description,
                COALESCE(
                    (SELECT array_agg(t2.name)
                     FROM post_tags pt2
                     JOIN tags t2 ON pt2.tag_id = t2.id
                     WHERE pt2.post_id = p.id),
                    '{}'
                ) AS tags,
                p.views,
                p.created_at AS "createdAt"
            FROM posts p
            JOIN post_tags pt ON pt.post_id = p.id
            JOIN tags t ON pt.tag_id = t.id AND t.name = $${paramIndex++}
        `;
        params.push(tag);
    }

    if (cursor) {
        conditions.push(`p.created_at < $${paramIndex++}`);
        params.push(cursor);
    }

    if (conditions.length > 0) {
        sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $${paramIndex}`;
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
    let countSql: string;
    const countParams: any[] = [];

    if (tag) {
        countSql = `
            SELECT COUNT(*) FROM posts p
            JOIN post_tags pt ON pt.post_id = p.id
            JOIN tags t ON pt.tag_id = t.id AND t.name = $1
        `;
        countParams.push(tag);
    } else {
        countSql = `SELECT COUNT(*) FROM posts`;
    }

    const countResult = await query(countSql, countParams);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    const items: PostListItem[] = rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        tags: row.tags || [],
        views: row.views,
        createdAt: new Date(row.createdAt).toISOString(),
    }));

    return { items, nextCursor, hasMore, totalCount };
};
