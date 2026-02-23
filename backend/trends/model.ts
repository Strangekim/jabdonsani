import { z } from "zod";

// 파라미터 :keyword 검증 스키마
export const searchQuerySchema = z.object({
    keyword: z.string().min(1, "검색어를 입력해주세요.")
});
