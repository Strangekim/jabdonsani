import { query } from "../../config/db";
import { ProcessedItem } from "../crawlers/types";

/**
 * 특정 소스에서 이미 DB에 존재하는 original_id Set을 반환한다.
 */
export const getExistingOriginalIds = async (
    source: string,
    originalIds: string[]
): Promise<Set<string>> => {
    if (originalIds.length === 0) return new Set();
    const result = await query(
        `SELECT original_id FROM trends WHERE source = $1 AND original_id = ANY($2)`,
        [source, originalIds]
    );
    return new Set(result.rows.map((r) => r.original_id));
};

/**
 * ProcessedItem을 trends + trend_comments 테이블에 upsert한다.
 * ON CONFLICT (source, original_id) DO UPDATE로 중복 방지.
 */
export const upsertTrend = async (
    item: ProcessedItem,
    batchId: string
): Promise<void> => {
    // trends 테이블 upsert
    const trendResult = await query(
        `INSERT INTO trends (source, field, title, content, comment_summary, thumbnails, upvotes, original_url, original_id, batch_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (source, original_id) DO UPDATE SET
            field = EXCLUDED.field,
            title = EXCLUDED.title,
            content = EXCLUDED.content,
            comment_summary = EXCLUDED.comment_summary,
            thumbnails = EXCLUDED.thumbnails,
            upvotes = EXCLUDED.upvotes,
            batch_id = EXCLUDED.batch_id
         RETURNING id`,
        [
            item.source,
            item.field,
            item.translatedTitle,
            item.translatedContent,
            item.commentSummary,
            item.thumbnailUrl ? [item.thumbnailUrl] : [],
            item.score,
            item.url,
            item.originalId,
            batchId,
            item.createdAt,
        ]
    );

    const trendId = trendResult.rows[0]?.id;
    if (!trendId || item.translatedComments.length === 0) return;

    // 기존 댓글 삭제 후 새로 삽입
    await query(`DELETE FROM trend_comments WHERE trend_id = $1`, [trendId]);

    for (const comment of item.translatedComments) {
        await query(
            `INSERT INTO trend_comments (trend_id, text, votes) VALUES ($1, $2, $3)`,
            [trendId, comment.translated, comment.votes]
        );
    }
};
