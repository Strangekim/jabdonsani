import { RawCrawledItem, CrawlerConfig } from "./types";

const HF_PAPERS_API = "https://huggingface.co/api/daily_papers";

interface HFPaper {
    paper: {
        id: string;
        title: string;
        summary?: string;
        upvotes?: number;
        publishedAt?: string;
    };
    numComments?: number;
    submittedAt?: string;
}

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

/**
 * Hugging Face Daily Papers 크롤러
 * 오늘 + 어제 논문을 합산하여 limit 개 반환
 * (배치가 하루 2회 실행되므로 당일 업로드 전 조조 배치 커버 목적)
 */
export const crawlHFPapers = async (config: CrawlerConfig): Promise<RawCrawledItem[]> => {
    console.log(`[Crawler] Fetching HF Daily Papers...`);

    const dates: string[] = [];
    for (let i = 0; i < 2; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split("T")[0]);
    }

    const all: RawCrawledItem[] = [];

    for (const date of dates) {
        const data = await fetchJson<HFPaper[]>(`${HF_PAPERS_API}?date=${date}`);
        if (!data) continue;

        for (const item of data) {
            if (all.length >= config.limit) break;
            all.push({
                source: config.source,
                originalId: item.paper.id,
                title: item.paper.title,
                url: `https://huggingface.co/papers/${item.paper.id}`,
                content: item.paper.summary?.slice(0, 3000) || "",
                score: item.paper.upvotes || 0,
                commentCount: item.numComments || 0,
                comments: [],
                thumbnailUrl: null,
                createdAt:
                    item.submittedAt ||
                    item.paper.publishedAt ||
                    new Date().toISOString(),
            });
        }
        if (all.length >= config.limit) break;
    }

    console.log(`[Crawler] HF Papers: collected ${all.length} items`);
    return all;
};
