import { RawCrawledItem, RawComment, CrawlerConfig } from "./types";
import { fetchThumbnail } from "./thumbnailParser";

const HN_API = "https://hacker-news.firebaseio.com/v0";
const MIN_SCORE = 100;
const CONCURRENT_LIMIT = 10;

interface HNItem {
    id: number;
    title: string;
    url?: string;
    text?: string;
    score: number;
    descendants?: number;
    kids?: number[];
    time: number;
    type: string;
}

interface HNComment {
    id: number;
    by?: string;
    text?: string;
    kids?: number[];
    deleted?: boolean;
    dead?: boolean;
}

const fetchJson = async <T>(url: string): Promise<T | null> => {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch {
        return null;
    }
};

/**
 * HN의 kids 배열에서 상위 댓글을 가져온다 (최대 5개).
 */
const fetchTopComments = async (kids: number[]): Promise<RawComment[]> => {
    const topKids = kids.slice(0, 5);
    const results = await Promise.allSettled(
        topKids.map((id) => fetchJson<HNComment>(`${HN_API}/item/${id}.json`))
    );

    const comments: RawComment[] = [];
    for (const r of results) {
        if (r.status === "fulfilled" && r.value && !r.value.deleted && !r.value.dead && r.value.text) {
            comments.push({
                author: r.value.by || "anonymous",
                text: r.value.text.slice(0, 500),
                votes: 0, // HN API doesn't expose comment scores
            });
        }
    }
    return comments;
};

/**
 * HN Top Stories를 크롤링한다.
 */
export const crawlHN = async (config: CrawlerConfig): Promise<RawCrawledItem[]> => {
    console.log(`[Crawler] Fetching HN top stories...`);

    const storyIds = await fetchJson<number[]>(`${HN_API}/topstories.json`);
    if (!storyIds) {
        console.error("[Crawler] Failed to fetch HN top stories");
        return [];
    }

    const items: RawCrawledItem[] = [];
    // score >= 100인 스토리만 필터하기 위해 충분히 많이 fetch
    const candidateIds = storyIds.slice(0, config.limit * 5);

    // 동시 10개씩 fetch
    for (let i = 0; i < candidateIds.length; i += CONCURRENT_LIMIT) {
        if (items.length >= config.limit) break;

        const batch = candidateIds.slice(i, i + CONCURRENT_LIMIT);
        const results = await Promise.allSettled(
            batch.map((id) => fetchJson<HNItem>(`${HN_API}/item/${id}.json`))
        );

        for (const r of results) {
            if (items.length >= config.limit) break;
            if (r.status !== "fulfilled" || !r.value) continue;

            const story = r.value;
            if (story.type !== "story" || story.score < MIN_SCORE) continue;

            const url = story.url || `https://news.ycombinator.com/item?id=${story.id}`;

            // 댓글 fetch
            const comments = story.kids ? await fetchTopComments(story.kids) : [];

            // og:image 추출 (외부 URL이 있는 경우만)
            const thumbnailUrl = story.url ? await fetchThumbnail(story.url) : null;

            items.push({
                source: "hn",
                originalId: String(story.id),
                title: story.title,
                url,
                content: story.text?.slice(0, 3000) || "",
                score: story.score,
                commentCount: story.descendants || 0,
                comments,
                thumbnailUrl,
                createdAt: new Date(story.time * 1000).toISOString(),
            });
        }
    }

    console.log(`[Crawler] HN: collected ${items.length} items`);
    return items;
};
