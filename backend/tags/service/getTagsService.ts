import { query } from "../../config/db";

interface TagItem {
    name: string;
    count: number;
}

/**
 * 태그 클라우드용 태그 목록 + 글 수 조회 서비스
 */
export const getTagsService = async (): Promise<TagItem[]> => {
    const sql = `
        SELECT t.name, COUNT(pt.post_id)::int AS count
        FROM tags t
        JOIN post_tags pt ON pt.tag_id = t.id
        GROUP BY t.id, t.name
        ORDER BY count DESC, t.name ASC
    `;
    const result = await query(sql);
    return result.rows.map((row: any) => ({
        name: row.name,
        count: row.count,
    }));
};
