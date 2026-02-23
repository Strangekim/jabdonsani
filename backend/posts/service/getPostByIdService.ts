import { query } from "../../config/db";
import { notFoundError } from "../../middleware/customError";

interface PostNav {
    id: number;
    title: string;
}

interface PostDetail {
    id: number;
    title: string;
    content: string;
    tags: string[];
    views: number;
    createdAt: string;
    updatedAt: string;
    prevPost: PostNav | null;
    nextPost: PostNav | null;
}

/**
 * 블로그 글 상세 조회 서비스
 * @param id 게시글 ID
 */
export const getPostByIdService = async (id: string): Promise<PostDetail> => {
    // 조회수 증가
    await query(`UPDATE posts SET views = views + 1 WHERE id = $1`, [id]);

    const sql = `
        SELECT
            p.id,
            p.title,
            p.content,
            COALESCE(
                (SELECT array_agg(t.name)
                 FROM post_tags pt
                 JOIN tags t ON pt.tag_id = t.id
                 WHERE pt.post_id = p.id),
                '{}'
            ) AS tags,
            p.views,
            p.created_at AS "createdAt",
            p.updated_at AS "updatedAt"
        FROM posts p
        WHERE p.id = $1
    `;
    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
        throw notFoundError("해당 ID의 글이 없습니다.", "POST_NOT_FOUND");
    }

    const post = result.rows[0];

    // 이전 글 (현재 글보다 created_at이 작은 것 중 가장 최근)
    const prevResult = await query(
        `SELECT id, title FROM posts WHERE created_at < $1 ORDER BY created_at DESC LIMIT 1`,
        [post.createdAt]
    );

    // 다음 글 (현재 글보다 created_at이 큰 것 중 가장 오래된)
    const nextResult = await query(
        `SELECT id, title FROM posts WHERE created_at > $1 ORDER BY created_at ASC LIMIT 1`,
        [post.createdAt]
    );

    return {
        id: post.id,
        title: post.title,
        content: post.content,
        tags: post.tags || [],
        views: post.views,
        createdAt: new Date(post.createdAt).toISOString(),
        updatedAt: new Date(post.updatedAt).toISOString(),
        prevPost: prevResult.rows.length > 0 ? { id: prevResult.rows[0].id, title: prevResult.rows[0].title } : null,
        nextPost: nextResult.rows.length > 0 ? { id: nextResult.rows[0].id, title: nextResult.rows[0].title } : null,
    };
};
