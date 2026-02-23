import { RawCrawledItem, ProcessedItem, TranslatedComment } from "../crawlers/types";
import { callClaude, extractJson } from "./claudeClient";
import { buildHNPrompt, buildRedditPrompt } from "./prompts";

interface HNResponse {
    translatedTitle: string;
    translatedContent: string;
    field: "ai" | "dev";
    commentSummary: string;
    translatedComments: TranslatedComment[];
}

interface RedditResponse {
    translatedTitle: string;
    translatedContent: string;
    commentSummary: string;
    translatedComments: TranslatedComment[];
}

/**
 * 단일 크롤링 아이템을 AI로 처리한다.
 */
const processOneItem = async (
    item: RawCrawledItem,
    defaultField: "ai" | "dev" | "robotics" | null
): Promise<ProcessedItem | null> => {
    try {
        const isHN = item.source === "hn";
        const prompt = isHN
            ? buildHNPrompt(item.title, item.content, item.comments)
            : buildRedditPrompt(item.title, item.content, item.comments);

        const raw = await callClaude(prompt);

        if (isHN) {
            const parsed = extractJson<HNResponse>(raw);
            return {
                source: item.source,
                originalId: item.originalId,
                field: parsed.field === "ai" || parsed.field === "dev" ? parsed.field : "dev",
                title: item.title,
                translatedTitle: parsed.translatedTitle,
                url: item.url,
                content: item.content,
                translatedContent: parsed.translatedContent,
                score: item.score,
                commentCount: item.commentCount,
                commentSummary: parsed.commentSummary,
                translatedComments: parsed.translatedComments || [],
                thumbnailUrl: item.thumbnailUrl,
                createdAt: item.createdAt,
            };
        } else {
            const parsed = extractJson<RedditResponse>(raw);
            return {
                source: item.source,
                originalId: item.originalId,
                field: defaultField || "dev",
                title: item.title,
                translatedTitle: parsed.translatedTitle,
                url: item.url,
                content: item.content,
                translatedContent: parsed.translatedContent,
                score: item.score,
                commentCount: item.commentCount,
                commentSummary: parsed.commentSummary,
                translatedComments: parsed.translatedComments || [],
                thumbnailUrl: item.thumbnailUrl,
                createdAt: item.createdAt,
            };
        }
    } catch (err) {
        console.error(`[AI] Failed to process item ${item.source}/${item.originalId}:`, err);
        return null;
    }
};

/**
 * 크롤링된 아이템 배열을 AI로 처리한다.
 * 각 아이템을 순차적으로 처리하여 API rate limit을 준수한다.
 */
export const processItems = async (
    items: RawCrawledItem[],
    defaultField: "ai" | "dev" | "robotics" | null
): Promise<{ processed: ProcessedItem[]; errors: number }> => {
    const processed: ProcessedItem[] = [];
    let errors = 0;

    for (const item of items) {
        const result = await processOneItem(item, defaultField);
        if (result) {
            processed.push(result);
        } else {
            errors++;
        }
    }

    return { processed, errors };
};
