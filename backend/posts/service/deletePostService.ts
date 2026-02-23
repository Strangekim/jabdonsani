import { query } from "../../config/db";
import { notFoundError } from "../../middleware/customError";

/**
 * 블로그 글 삭제 서비스 (존재 여부 체크)
 * @param id 게시글 ID
 */
export const deletePostService = async (id: string): Promise<{ message: string }> => {
    const result = await query(`DELETE FROM posts WHERE id = $1 RETURNING id`, [id]);

    if (result.rows.length === 0) {
        throw notFoundError("해당 ID의 글이 없습니다.", "POST_NOT_FOUND");
    }

    return { message: "글이 삭제되었습니다" };
};
