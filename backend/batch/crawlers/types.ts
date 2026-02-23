export interface RawComment {
    author: string;
    text: string;
    votes: number;
}

export interface RawCrawledItem {
    source: string;
    originalId: string;
    title: string;
    url: string;
    content: string;
    score: number;
    commentCount: number;
    comments: RawComment[];
    thumbnailUrl: string | null;
    createdAt: string;
}

export interface TranslatedComment {
    original: string;
    translated: string;
    votes: number;
}

export interface ProcessedItem {
    source: string;
    originalId: string;
    field: "ai" | "dev" | "robotics";
    title: string;
    translatedTitle: string;
    url: string;
    content: string;
    translatedContent: string;
    score: number;
    commentCount: number;
    commentSummary: string;
    translatedComments: TranslatedComment[];
    thumbnailUrl: string | null;
    createdAt: string;
}

export interface CrawlerConfig {
    source: string;
    field: "ai" | "dev" | "robotics" | null; // null = Claude가 분류
    limit: number;
}
