import { query } from "../../config/db";
import { notFoundError } from "../../middleware/customError";

/**
 * 도구 사용 기록 (카운트 +1) 서비스
 * @param id 도구 영문 ID (ex. json-formatter)
 */
export const useToolService = async (id: string): Promise<{ id: string; count: number }> => {
    const sql = `UPDATE tools SET usage_count = usage_count + 1 WHERE id = $1 RETURNING id, usage_count AS count`;
    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
        throw notFoundError("존재하지 않는 도구 ID입니다.", "TOOL_NOT_FOUND");
    }

    return { id: result.rows[0].id, count: result.rows[0].count };
};
