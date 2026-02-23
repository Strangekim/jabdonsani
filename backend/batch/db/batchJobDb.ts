import { query } from "../../config/db";
import { BatchJob } from "../model";

/**
 * 배치 Job ID를 생성한다. (batch_YYYYMMDD_HHmm)
 */
export const generateJobId = (): string => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `batch_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
};

/**
 * 현재 실행 중인 배치가 있는지 확인한다.
 */
export const isAnyBatchRunning = async (): Promise<boolean> => {
    const result = await query(
        `SELECT 1 FROM batch_jobs WHERE status = 'running' LIMIT 1`
    );
    return result.rows.length > 0;
};

/**
 * 새 배치 job을 생성한다.
 */
export const createBatchJob = async (jobId: string): Promise<void> => {
    await query(
        `INSERT INTO batch_jobs (job_id, status, started_at) VALUES ($1, 'running', NOW())`,
        [jobId]
    );
};

/**
 * 배치 job을 완료 처리한다.
 */
export const completeBatchJob = async (
    jobId: string,
    itemsCollected: number,
    errors: number
): Promise<void> => {
    await query(
        `UPDATE batch_jobs SET status = 'completed', completed_at = NOW(), items_collected = $1, errors = $2 WHERE job_id = $3`,
        [itemsCollected, errors, jobId]
    );
};

/**
 * 배치 job을 실패 처리한다.
 */
export const failBatchJob = async (
    jobId: string,
    errorLog: string
): Promise<void> => {
    await query(
        `UPDATE batch_jobs SET status = 'failed', completed_at = NOW(), error_log = $1 WHERE job_id = $2`,
        [errorLog, jobId]
    );
};

/**
 * 가장 최근 배치 job을 조회한다.
 */
export const getLatestBatchJob = async (): Promise<BatchJob | null> => {
    const result = await query(
        `SELECT job_id as id, status, started_at, completed_at, items_collected, errors, error_log
         FROM batch_jobs ORDER BY started_at DESC LIMIT 1`
    );
    return result.rows[0] || null;
};
