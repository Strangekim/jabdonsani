import { z } from "zod";

// 파라미터 :keyword 검증 스키마
export const searchQuerySchema = z.object({
    keyword: z.string().min(2, "QUERY_TOO_SHORT:검색어는 2자 이상이어야 합니다.")
});
