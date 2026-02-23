import { pool } from "../../config/db";
import { notFoundError } from "../../middleware/customError";
import { PostBody } from "../model";

/**
 * 블로그 글 수정 서비스 (트랜잭션 사용, 존재 여부 체크)
 * @param id 게시글 ID
 * @param postData Zod 검증을 통과한 게시글 데이터
 */
export const updatePostService = async (id: string, postData: PostBody): Promise<{ id: number; message: string }> => {
    const { title, content, tags } = postData;
    const description = content.substring(0, 200);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const updateResult = await client.query(
            `UPDATE posts SET title = $1, content = $2, description = $3, updated_at = NOW() WHERE id = $4 RETURNING id`,
            [title, content, description, id]
        );

        if (updateResult.rows.length === 0) {
            throw notFoundError("해당 ID의 글이 없습니다.", "POST_NOT_FOUND");
        }

        if (tags !== undefined) {
            await client.query(`DELETE FROM post_tags WHERE post_id = $1`, [id]);

            for (const tagName of tags) {
                const tagResult = await client.query(
                    `INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
                    [tagName]
                );
                const tagId = tagResult.rows[0].id;

                await client.query(
                    `INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [id, tagId]
                );
            }
        }

        await client.query('COMMIT');
        return { id: parseInt(id, 10), message: "글이 수정되었습니다" };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};
