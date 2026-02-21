import { z } from "zod";

/**
 * 공개 메시지 조회 쿼리 파라미터
 * GET /api/messages/public?before=100
 */
export const GetPublicMessagesQuerySchema = z.object({
    before: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : undefined))
        .refine((val) => val === undefined || val > 0, "before는 양수여야 합니다."),
});

/**
 * DM 조회 path 파라미터
 * GET /api/messages/dm/:userId
 */
export const GetDMParamsSchema = z.object({
    userId: z
        .string()
        .transform((val) => parseInt(val, 10))
        .refine((val) => val > 0, "userId는 양수여야 합니다."),
});
