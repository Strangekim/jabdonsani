import { createCustomError } from "../../middleware/customError";
import { CrawlerConfig } from "../crawlers/types";
import { crawlHN } from "../crawlers/hnCrawler";
import { crawlHFPapers } from "../crawlers/hfPapersCrawler";
import { crawlLobsters } from "../crawlers/lobstersCrawler";
import { crawlDevTo } from "../crawlers/devtoCrawler";
import { processItems } from "../ai/processItems";
import { upsertTrend, getExistingOriginalIds } from "../db/trendDb";
import {
    generateJobId,
    isAnyBatchRunning,
    createBatchJob,
    completeBatchJob,
    failBatchJob,
} from "../db/batchJobDb";

/**
 * 수집 소스 목록
 *  - hn        : Hacker News (분야: Claude 자동 분류)
 *  - hfpapers  : Hugging Face Daily Papers (분야: ai)
 *  - devto     : Dev.to — ai/machinelearning 태그 (분야: ai)
 *  - lobsters  : Lobste.rs hottest (분야: dev)
 *  - devto     : Dev.to — robotics 태그 (분야: robotics)
 *    ※ devto는 source 이름이 같고 field만 다름 → DB unique(source, original_id) 유지
 */
const SOURCES: CrawlerConfig[] = [
    { source: "hn",       field: null,       limit: 15 },
    { source: "hfpapers", field: "ai",       limit: 12 },
    { source: "devto",    field: "ai",       limit: 10 },
    { source: "lobsters", field: "dev",      limit: 10 },
    { source: "devto",    field: "robotics", limit: 8  },
];

/** source 이름 → 크롤러 함수 선택 */
const selectCrawler = (config: CrawlerConfig) => {
    switch (config.source) {
        case "hn":       return crawlHN(config);
        case "hfpapers": return crawlHFPapers(config);
        case "lobsters": return crawlLobsters(config);
        case "devto":    return crawlDevTo(config);
        default:
            console.warn(`[Crawler] Unknown source: ${config.source}`);
            return Promise.resolve([]);
    }
};

/**
 * 배치 실행의 실제 로직 (백그라운드)
 */
const executeBatch = async (jobId: string): Promise<void> => {
    let totalItems = 0;
    let totalErrors = 0;

    try {
        for (const config of SOURCES) {
            try {
                const label = `${config.source}(${config.field ?? "auto"})`;
                console.log(`[Batch ${jobId}] Crawling ${label}...`);

                // 1. 크롤링
                const rawItems = await selectCrawler(config);

                if (rawItems.length === 0) {
                    console.log(`[Batch ${jobId}] ${label}: no items collected`);
                    continue;
                }

                // 2. 이미 DB에 존재하는 글 skip
                const existingIds = await getExistingOriginalIds(
                    config.source,
                    rawItems.map((i) => i.originalId)
                );
                const newItems = rawItems.filter((i) => !existingIds.has(i.originalId));
                console.log(
                    `[Batch ${jobId}] ${label}: ${rawItems.length} crawled, ` +
                    `${existingIds.size} already exist, ${newItems.length} new`
                );

                if (newItems.length === 0) continue;

                // 3. AI 번역·요약
                console.log(
                    `[Batch ${jobId}] Processing ${newItems.length} items from ${label}...`
                );
                const { processed, errors } = await processItems(newItems, config.field);
                totalErrors += errors;

                // 4. DB 저장
                for (const item of processed) {
                    try {
                        await upsertTrend(item, jobId);
                        totalItems++;
                    } catch (err) {
                        console.error(
                            `[Batch ${jobId}] DB save failed for ${item.source}/${item.originalId}:`,
                            err
                        );
                        totalErrors++;
                    }
                }

                console.log(
                    `[Batch ${jobId}] ${label}: saved ${processed.length} items, ${errors} AI errors`
                );
            } catch (err) {
                console.error(`[Batch ${jobId}] Source ${config.source} failed:`, err);
                totalErrors++;
            }
        }

        await completeBatchJob(jobId, totalItems, totalErrors);
        console.log(`[Batch ${jobId}] Completed: ${totalItems} items, ${totalErrors} errors`);
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[Batch ${jobId}] Fatal error:`, errorMsg);
        await failBatchJob(jobId, errorMsg).catch(() => {});
    }
};

/**
 * 크롤링 및 번역 배치 수동 트리거 로직
 */
export const runBatchService = async () => {
    const running = await isAnyBatchRunning();
    if (running) {
        throw createCustomError(
            "이미 실행 중인 배치가 있습니다.",
            409,
            "BATCH_ALREADY_RUNNING"
        );
    }

    const jobId = generateJobId();
    await createBatchJob(jobId);

    executeBatch(jobId); // 비동기 실행 — 응답은 즉시 반환

    return { message: "배치 실행이 시작되었습니다.", jobId };
};
