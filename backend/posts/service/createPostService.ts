import { pool } from "../../config/db";
import { PostBody } from "../model";

/**
 * 블로그 글 작성 서비스 (트랜잭션 사용)
 * @param postData Zod 검증을 통과한 게시글 데이터
 */
export const createPostService = async (postData: PostBody): Promise<{ id: number; message: string }> => {
    const { title, content, tags } = postData;
    const description = content.substring(0, 200);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const insertResult = await client.query(
            `INSERT INTO posts (title, content, description) VALUES ($1, $2, $3) RETURNING id`,
            [title, content, description]
        );
        const newPostId = insertResult.rows[0].id;

        if (tags && tags.length > 0) {
            for (const tagName of tags) {
                const tagResult = await client.query(
                    `INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
                    [tagName]
                );
                const tagId = tagResult.rows[0].id;

                await client.query(
                    `INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [newPostId, tagId]
                );
            }
        }

        await client.query('COMMIT');
        return { id: newPostId, message: "글이 작성되었습니다" };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};
