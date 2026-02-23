import cron from "node-cron";
import { runBatchService } from "./service/runBatchService";

/**
 * 배치 스케줄러 초기화.
 * KST 7시, 19시에 자동 크롤링 실행.
 * cron은 UTC 기준이므로 KST 7시 = UTC 22시(전날), KST 19시 = UTC 10시.
 */
export const initScheduler = () => {
    // KST 07:00 = UTC 22:00 (전날)
    cron.schedule("0 22 * * *", async () => {
        console.log("[Scheduler] Running morning batch (KST 07:00)...");
        try {
            await runBatchService();
        } catch (err) {
            console.error("[Scheduler] Morning batch failed:", err);
        }
    });

    // KST 19:00 = UTC 10:00
    cron.schedule("0 10 * * *", async () => {
        console.log("[Scheduler] Running evening batch (KST 19:00)...");
        try {
            await runBatchService();
        } catch (err) {
            console.error("[Scheduler] Evening batch failed:", err);
        }
    });

    console.log("[Scheduler] Batch scheduler initialized (KST 07:00, 19:00)");
};
