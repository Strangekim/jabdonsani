import { RawCrawledItem, RawComment, CrawlerConfig } from "./types";

const REDDIT_USER_AGENT = "JabdonSaniBot/1.0 (batch crawler)";

interface RedditPost {
    id: string;
    title: string;
    url: string;
    selftext: string;
    score: number;
    num_comments: number;
    thumbnail: string;
    permalink: string;
    created_utc: number;
    is_self: boolean;
    stickied: boolean;
}

interface RedditComment {
    author: string;
    body: string;
    score: number;
}

const SUBREDDIT_MAP: Record<string, string> = {
    localllama: "LocalLLaMA",
    ml: "MachineLearning",
    programming: "programming",
    robotics: "robotics",
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reddit 게시글의 댓글을 가져온다 (최대 5개).
 */
const fetchComments = async (subreddit: string, postId: string): Promise<RawComment[]> => {
    try {
        const res = await fetch(
            `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=5&sort=top`,
            { headers: { "User-Agent": REDDIT_USER_AGENT } }
        );
        if (!res.ok) return [];

        const data = await res.json();
        // Reddit returns [post, comments] array
        const commentListing = data?.[1]?.data?.children || [];

        const comments: RawComment[] = [];
        for (const child of commentListing) {
            if (child.kind !== "t1" || !child.data?.body) continue;
            comments.push({
                author: child.data.author || "[deleted]",
                text: child.data.body.slice(0, 500),
                votes: child.data.score || 0,
            });
        }
        return comments.slice(0, 5);
    } catch {
        return [];
    }
};

/**
 * 특정 subreddit의 hot 게시글을 크롤링한다.
 */
export const crawlReddit = async (config: CrawlerConfig): Promise<RawCrawledItem[]> => {
    const subreddit = SUBREDDIT_MAP[config.source];
    if (!subreddit) {
        console.error(`[Crawler] Unknown Reddit source: ${config.source}`);
        return [];
    }

    console.log(`[Crawler] Fetching r/${subreddit} hot posts...`);

    try {
        const res = await fetch(
            `https://www.reddit.com/r/${subreddit}/hot.json?limit=${config.limit + 5}`,
            { headers: { "User-Agent": REDDIT_USER_AGENT } }
        );

        if (!res.ok) {
            console.error(`[Crawler] Reddit r/${subreddit} returned ${res.status}`);
            return [];
        }

        const data = await res.json();
        const posts: RedditPost[] = (data?.data?.children || [])
            .filter((c: any) => c.kind === "t3" && !c.data.stickied)
            .map((c: any) => c.data)
            .slice(0, config.limit);

        const items: RawCrawledItem[] = [];

        for (const post of posts) {
            // 요청 간 1초 딜레이 (Reddit rate limit 준수)
            await delay(1000);

            const comments = await fetchComments(subreddit, post.id);

            const thumbnailUrl =
                post.thumbnail && post.thumbnail.startsWith("http")
                    ? post.thumbnail
                    : null;

            items.push({
                source: config.source,
                originalId: post.id,
                title: post.title,
                url: post.is_self
                    ? `https://www.reddit.com${post.permalink}`
                    : post.url,
                content: post.selftext?.slice(0, 3000) || "",
                score: post.score,
                commentCount: post.num_comments,
                comments,
                thumbnailUrl,
                createdAt: new Date(post.created_utc * 1000).toISOString(),
            });
        }

        console.log(`[Crawler] r/${subreddit}: collected ${items.length} items`);
        return items;
    } catch (err) {
        console.error(`[Crawler] r/${subreddit} error:`, err);
        return [];
    }
};
