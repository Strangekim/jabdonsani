import { RawCrawledItem, RawComment, CrawlerConfig } from "./types";

const LOBSTERS_API = "https://lobste.rs/hottest.json";
const MIN_SCORE = 5;

interface LobstersStory {
    short_id: string;
    title: string;
    url: string;
    score: number;
    comment_count: number;
    description: string;
    submitted_at: string;
    tags: string[];
    comments_url: string;
}

interface LobstersComment {
    short_id: string;
    comment: string;
    score: number;
    is_deleted?: boolean;
    children?: LobstersComment[];
}

interface LobstersDetail {
    comments?: LobstersComment[];
}

const fetchJson = async <T>(url: string): Promise<T | null> => {
    try {
        const res = await fetch(url, {
            headers: { "User-Agent": "JabdonSaniBot/1.0 (batch crawler)" },
        });
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch {
        return null;
    }
};

/** HTML 태그 제거 유틸 */
const stripHtml = (html: string) => html.replace(/<[^>]+>/g, "").trim();

/** 스토리 상위 댓글 조회 (최대 5개) */
const fetchComments = async (shortId: string): Promise<RawComment[]> => {
    const data = await fetchJson<LobstersDetail>(
        `https://lobste.rs/s/${shortId}.json`
    );
    if (!data?.comments) return [];

    return data.comments
        .filter((c) => !c.is_deleted && c.comment)
        .slice(0, 5)
        .map((c) => ({
            author: "",
            text: stripHtml(c.comment).slice(0, 500),
            votes: c.score || 0,
        }));
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Lobste.rs 핫 스토리 크롤러
 * https://lobste.rs/hottest.json — 공식 JSON API, 인증 불필요
 */
export const crawlLobsters = async (
    config: CrawlerConfig
): Promise<RawCrawledItem[]> => {
    console.log(`[Crawler] Fetching Lobste.rs hottest...`);

    const data = await fetchJson<LobstersStory[]>(LOBSTERS_API);
    if (!data) {
        console.error(`[Crawler] Lobste.rs fetch failed`);
        return [];
    }

    const stories = data
        .filter((s) => s.score >= MIN_SCORE)
        .slice(0, config.limit);

    const items: RawCrawledItem[] = [];

    for (const story of stories) {
        await delay(500); /* rate limit 준수 */

        const comments = await fetchComments(story.short_id);

        items.push({
            source: config.source,
            originalId: story.short_id,
            title: story.title,
            url: story.url || story.comments_url,
            content: stripHtml(story.description || "").slice(0, 3000),
            score: story.score,
            commentCount: story.comment_count,
            comments,
            thumbnailUrl: null,
            createdAt: story.submitted_at,
        });
    }

    console.log(`[Crawler] Lobste.rs: collected ${items.length} items`);
    return items;
};
