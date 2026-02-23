import { getLatestBatchJob } from "../db/batchJobDb";

/**
 * 마지막 배치 실행 상태 조회 서비스
 */
export const getBatchStatusService = async () => {
    const job = await getLatestBatchJob();

    if (!job) {
        return {
            jobId: null,
            status: "none",
            startedAt: null,
            completedAt: null,
            itemsCollected: 0,
            errors: 0,
        };
    }

    return {
        jobId: job.id,
        status: job.status,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        itemsCollected: job.items_collected,
        errors: job.errors,
        errorLog: job.error_log,
    };
};
