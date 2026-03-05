import { useRef, useState } from "react";

type AuditResult = {
    processedCount: number;
    totalProfessors: number;
    hasMore: boolean;
    nextCursor: string | null;
    message: string;
};

type UseAuditRunnerOptions<T extends AuditResult> = {
    mutate: (input?: { cursor?: string }) => Promise<T>;
    isPending: boolean;
    getMetricCount: (result: T) => number;
    completeMessage: (processedCount: number, metricCount: number) => string;
};

export function useAuditRunner<T extends AuditResult>({
    mutate,
    isPending,
    getMetricCount,
    completeMessage,
}: UseAuditRunnerOptions<T>) {
    const [progress, setProgress] = useState({
        isRunning: false,
        isPaused: false,
        processedCount: 0,
        totalProfessors: 0,
        metricCount: 0,
        nextCursor: null as string | null,
        message: "",
    });
    const pauseRequestedRef = useRef(false);

    const handlePause = (
        cursor: string | undefined,
        totalProcessed: number,
        totalMetric: number,
        totalProfessors: number,
    ) => {
        setProgress((prev) => ({
            ...prev,
            isRunning: false,
            isPaused: true,
            nextCursor: cursor ?? null,
            processedCount: totalProcessed,
            metricCount: totalMetric,
            totalProfessors,
            message: `⏸️ Audit paused. Processed ${totalProcessed} professors. Click Resume to continue.`,
        }));
    };

    const runAudit = async (startCursor?: string) => {
        pauseRequestedRef.current = false;
        setProgress((prev) => ({
            ...prev,
            isRunning: true,
            isPaused: false,
            processedCount: startCursor ? prev.processedCount : 0,
            metricCount: startCursor ? prev.metricCount : 0,
            message: startCursor ? "Resuming audit..." : "Starting audit...",
        }));

        try {
            let cursor: string | undefined = startCursor;
            let totalProcessed = startCursor ? progress.processedCount : 0;
            let totalMetric = startCursor ? progress.metricCount : 0;
            let totalProfessors = 0;

            do {
                if (pauseRequestedRef.current) {
                    handlePause(cursor, totalProcessed, totalMetric, totalProfessors);
                    return;
                }

                // eslint-disable-next-line no-await-in-loop
                const result = await mutate(cursor ? { cursor } : {});

                totalProcessed += result.processedCount;
                totalMetric += getMetricCount(result);
                totalProfessors = result.totalProfessors;
                cursor = result.nextCursor || undefined;

                setProgress({
                    isRunning: result.hasMore,
                    isPaused: false,
                    processedCount: totalProcessed,
                    totalProfessors,
                    metricCount: totalMetric,
                    nextCursor: result.nextCursor,
                    message: result.message,
                });

                if (pauseRequestedRef.current) {
                    handlePause(cursor, totalProcessed, totalMetric, totalProfessors);
                    return;
                }

                if (result.hasMore) {
                    // eslint-disable-next-line no-await-in-loop
                    await new Promise<void>((resolve) => {
                        setTimeout(resolve, 500);
                    });
                }
            } while (cursor);

            if (!pauseRequestedRef.current) {
                setProgress((prev) => ({
                    ...prev,
                    isRunning: false,
                    isPaused: false,
                    message: `✅ Audit complete! ${completeMessage(totalProcessed, totalMetric)}`,
                }));
            }
        } catch (error) {
            setProgress((prev) => ({
                ...prev,
                isRunning: false,
                isPaused: false,
                message: `❌ Error during audit: ${error instanceof Error ? error.message : "Unknown error"}`,
            }));
        }
    };

    const pauseAudit = () => {
        pauseRequestedRef.current = true;
    };

    return { progress, runAudit, pauseAudit, isPending };
}
