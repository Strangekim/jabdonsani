export interface BatchJob {
    id: string;
    status: "running" | "completed" | "failed";
    started_at: string;
    completed_at: string | null;
    items_collected: number;
    errors: number;
    error_log: string | null;
}
