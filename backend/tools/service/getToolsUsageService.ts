import { query } from "../../config/db";

interface ToolUsageItem {
    id: string;
    name: string;
    count: number;
}

/**
 * 도구별 누적 사용 횟수 조회 서비스
 */
export const getToolsUsageService = async (): Promise<ToolUsageItem[]> => {
    const sql = `SELECT id, name, usage_count AS count FROM tools ORDER BY usage_count DESC`;
    const result = await query(sql);
    return result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        count: row.count,
    }));
};
