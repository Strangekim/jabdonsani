import { createCustomError } from "../../middleware/customError";
import { CrawlerConfig } from "../crawlers/types";
import { crawlHN } from "../crawlers/hnCrawler";
import { crawlReddit } from "../crawlers/redditCrawler";
import { processItems } from "../ai/processItems";
import { upsertTrend, getExistingOriginalIds } from "../db/trendDb";
import {
    generateJobId,
    isAnyBatchRunning,
    createBatchJob,
    completeBatchJob,
    failBatchJob,
} from "../db/batchJobDb";

const SOURCES: CrawlerConfig[] = [
    { source: "hn", field: null, limit: 15 },
    { source: "localllama", field: "ai", limit: 10 },
    { source: "ml", field: "ai", limit: 10 },
    { source: "programming", field: "dev", limit: 10 },
    { source: "robotics", field: "robotics", limit: 8 },
];

/**
 * 배치 실행의 실제 로직 (백그라운드).
 */
const executeBatch = async (jobId: string): Promise<void> => {
    let totalItems = 0;
    let totalErrors = 0;

    try {
        for (const config of SOURCES) {
            try {
                console.log(`[Batch ${jobId}] Crawling ${config.source}...`);

                // 1. 크롤링
                const rawItems =
                    config.source === "hn"
                        ? await crawlHN(config)
                        : await crawlReddit(config);

                if (rawItems.length === 0) {
                    console.log(`[Batch ${jobId}] ${config.source}: no items collected`);
                    continue;
                }

                // 2. 이미 DB에 존재하는 글 skip
                const existingIds = await getExistingOriginalIds(
                    config.source,
                    rawItems.map((i) => i.originalId)
                );
                const newItems = rawItems.filter((i) => !existingIds.has(i.originalId));
                console.log(`[Batch ${jobId}] ${config.source}: ${rawItems.length} crawled, ${existingIds.size} already exist, ${newItems.length} new`);

                if (newItems.length === 0) continue;

                // 3. AI 처리
                console.log(`[Batch ${jobId}] Processing ${newItems.length} items from ${config.source}...`);
                const { processed, errors } = await processItems(newItems, config.field);
                totalErrors += errors;

                // 3. DB 저장
                for (const item of processed) {
                    try {
                        await upsertTrend(item, jobId);
                        totalItems++;
                    } catch (err) {
                        console.error(`[Batch ${jobId}] DB save failed for ${item.source}/${item.originalId}:`, err);
                        totalErrors++;
                    }
                }

                console.log(`[Batch ${jobId}] ${config.source}: saved ${processed.length} items, ${errors} AI errors`);
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
    // 중복 실행 체크
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

    // 비동기 실행 (응답은 즉시 반환)
    executeBatch(jobId);

    return { message: "배치 실행이 시작되었습니다.", jobId };
};
