import { RawCrawledItem, RawComment, CrawlerConfig } from "./types";

const DEVTO_API = "https://dev.to/api";

interface DevToArticle {
    id: number;
    title: string;
    description: string;
    url: string;
    cover_image: string | null;
    social_image: string | null;
    positive_reactions_count: number;
    comments_count: number;
    published_at: string;
    tag_list: string[];
}

interface DevToComment {
    id_code: string;
    body_html: string;
    positive_reactions_count: number;
}

/**
 * field → 검색할 Dev.to 태그 목록
 * devtoCrawler 하나로 ai / robotics 두 분야를 커버
 */
const FIELD_TAGS: Record<string, string[]> = {
    ai:       ["ai", "machinelearning"],
    robotics: ["robotics"],
    dev:      ["programming", "webdev"],
};

const fetchJson = async <T>(url: string): Promise<T | null> => {
    try {
        const res = await fetch(url, {
            headers: { "User-Agent": "JabdonSaniBot/1.0" },
        });
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch {
        return null;
    }
};

/** HTML 태그 제거 유틸 */
const stripHtml = (html: string) => html.replace(/<[^>]+>/g, "").trim();

/** 아티클 상위 댓글 조회 (최대 5개) */
const fetchComments = async (articleId: number): Promise<RawComment[]> => {
    const data = await fetchJson<DevToComment[]>(
        `${DEVTO_API}/comments?a_id=${articleId}`
    );
    if (!data) return [];

    return data.slice(0, 5).map((c) => ({
        author: "",
        text: stripHtml(c.body_html).slice(0, 500),
        votes: c.positive_reactions_count || 0,
    }));
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Dev.to 크롤러
 * config.field에 따라 FIELD_TAGS 매핑을 참조하여 태그별 인기 글 수집
 * top=7 — 최근 7일간 반응 수 기준 인기 아티클
 */
export const crawlDevTo = async (
    config: CrawlerConfig
): Promise<RawCrawledItem[]> => {
    const tags = FIELD_TAGS[config.field || "dev"] || ["programming"];
    const perTag = Math.ceil(config.limit / tags.length);

    console.log(`[Crawler] Fetching Dev.to (tags: ${tags.join(", ")})...`);

    const allItems: RawCrawledItem[] = [];
    const seenIds = new Set<number>();

    for (const tag of tags) {
        try {
            const articles = await fetchJson<DevToArticle[]>(
                `${DEVTO_API}/articles?tag=${tag}&per_page=${perTag + 5}&top=7`
            );
            if (!articles) continue;

            for (const article of articles) {
                if (seenIds.has(article.id)) continue;
                seenIds.add(article.id);

                await delay(300);
                const comments = await fetchComments(article.id);

                allItems.push({
                    source: config.source,
                    originalId: String(article.id),
                    title: article.title,
                    url: article.url,
                    content: article.description?.slice(0, 3000) || "",
                    score: article.positive_reactions_count,
                    commentCount: article.comments_count,
                    comments,
                    thumbnailUrl: article.cover_image || article.social_image || null,
                    createdAt: article.published_at,
                });
            }
        } catch (err) {
            console.error(`[Crawler] Dev.to tag=${tag} error:`, err);
        }
    }

    const result = allItems.slice(0, config.limit);
    console.log(`[Crawler] Dev.to (${config.field}): collected ${result.length} items`);
    return result;
};
