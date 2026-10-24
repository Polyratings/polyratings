import { useEffect, useRef, useState } from "react";

type AuditResult = {
    processedCount: number;
    totalProfessors: number;
    hasMore: boolean;
    nextCursor: string | null;
    message: string;
};

type AuditProgress = {
    isRunning: boolean;
    isPaused: boolean;
    processedCount: number;
    totalProfessors: number;
    metricCount: number;
    nextCursor: string | null;
    message: string;
};

type UseAuditRunnerOptions<T extends AuditResult> = {
    mutate: (input?: { cursor?: string }) => Promise<T>;
    isPending: boolean;
    getMetricCount: (result: T) => number;
    completeMessage: (processedCount: number, metricCount: number) => string;
    /** Called when an audit run finishes, pauses, or errors (not between batches). */
    onSettled?: () => void;
};

/** Brief yield between batches so the UI can paint without adding multi-minute wait. */
const INTER_BATCH_DELAY_MS = 50;

export function useAuditRunner<T extends AuditResult>({
    mutate,
    isPending,
    getMetricCount,
    completeMessage,
    onSettled,
}: UseAuditRunnerOptions<T>) {
    const [progress, setProgress] = useState<AuditProgress>({
        isRunning: false,
        isPaused: false,
        processedCount: 0,
        totalProfessors: 0,
        metricCount: 0,
        nextCursor: null,
        message: "",
    });
    const pauseRequestedRef = useRef(false);
    const progressRef = useRef(progress);
    // Bumped on unmount / new run so in-flight loops skip stale setState.
    const runGenerationRef = useRef(0);

    useEffect(() => {
        progressRef.current = progress;
    }, [progress]);

    useEffect(
        () => () => {
            runGenerationRef.current += 1;
        },
        [],
    );

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
        onSettled?.();
    };

    const runAudit = async (startCursor?: string) => {
        const generation = runGenerationRef.current + 1;
        runGenerationRef.current = generation;
        pauseRequestedRef.current = false;

        const isCurrentRun = () => runGenerationRef.current === generation;

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
            // Read from ref so pause/resume does not use a stale closure snapshot.
            let totalProcessed = startCursor ? progressRef.current.processedCount : 0;
            let totalMetric = startCursor ? progressRef.current.metricCount : 0;
            let totalProfessors = 0;
            let hasMore = true;

            while (hasMore) {
                if (!isCurrentRun()) {
                    return;
                }
                if (pauseRequestedRef.current) {
                    handlePause(cursor, totalProcessed, totalMetric, totalProfessors);
                    return;
                }

                // eslint-disable-next-line no-await-in-loop
                const result = await mutate(cursor ? { cursor } : {});
                if (!isCurrentRun()) {
                    return;
                }

                totalProcessed += result.processedCount;
                totalMetric += getMetricCount(result);
                totalProfessors = result.totalProfessors;
                hasMore = result.hasMore;
                cursor = result.nextCursor ?? undefined;

                if (hasMore && !cursor) {
                    throw new Error(
                        "Audit pagination returned hasMore without a next cursor; stopping to avoid an incomplete or infinite run.",
                    );
                }

                setProgress({
                    isRunning: hasMore,
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

                if (hasMore) {
                    // eslint-disable-next-line no-await-in-loop
                    await new Promise<void>((resolve) => {
                        setTimeout(resolve, INTER_BATCH_DELAY_MS);
                    });
                }
            }

            if (!pauseRequestedRef.current && isCurrentRun()) {
                setProgress((prev) => ({
                    ...prev,
                    isRunning: false,
                    isPaused: false,
                    message: `✅ Audit complete! ${completeMessage(totalProcessed, totalMetric)}`,
                }));
                onSettled?.();
            }
        } catch (error) {
            if (!isCurrentRun()) {
                return;
            }
            setProgress((prev) => ({
                ...prev,
                isRunning: false,
                isPaused: false,
                message: `❌ Error during audit: ${error instanceof Error ? error.message : "Unknown error"}`,
            }));
            onSettled?.();
        }
    };

    const pauseAudit = () => {
        pauseRequestedRef.current = true;
    };

    return { progress, runAudit, pauseAudit, isPending };
}
