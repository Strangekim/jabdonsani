import { z } from "zod";

// 허용 필터 값
export const VALID_FIELDS = ["ai", "dev", "robotics"] as const;
export const VALID_SOURCES = ["hn", "localllama", "ml", "programming", "robotics"] as const;

// 소스 → 표시 태그 매핑
export const SOURCE_TAG_MAP: Record<string, string> = {
    hn: "#HackerNews",
    localllama: "#LocalLLaMA",
    ml: "#MachineLearning",
    programming: "#programming",
    robotics: "#robotics",
};

// 분야 → 표시 태그 매핑
export const FIELD_TAG_MAP: Record<string, string> = {
    ai: "#AI",
    dev: "#개발",
    robotics: "#로보틱스",
};

// GET /api/trends 쿼리 검증 스키마
export const trendsQuerySchema = z.object({
    field: z.enum(VALID_FIELDS).optional(),
    source: z.enum(VALID_SOURCES).optional(),
    cursor: z.string().datetime({ offset: true }).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
}).passthrough();

export type TrendsQuery = z.infer<typeof trendsQuerySchema>;

// GET /api/trends/search 쿼리 검증 스키마
export const searchQuerySchema = z.object({
    q: z.string().min(1, "QUERY_REQUIRED:검색어를 입력해주세요.").min(2, "QUERY_TOO_SHORT:검색어는 2자 이상이어야 합니다."),
    field: z.enum(VALID_FIELDS).optional(),
    source: z.enum(VALID_SOURCES).optional(),
    cursor: z.string().datetime({ offset: true }).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
