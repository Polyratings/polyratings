import { BulkKey, BulkKeyMap } from "@backend/utils/const";
import { chunkArray, mapInBatches } from "@backend/utils/chunkArray";
import { useQuery } from "@tanstack/react-query";
import { createTRPCProxyClient } from "@trpc/client";
import { AppRouter } from "@backend/index";
import { trpcClientOptions } from "@/trpc";
import { useAuth } from "./useAuth";

const WORKER_RETRIEVAL_CHUNK_SIZE = 100;
const WORKER_RETRIEVAL_CONCURRENCY = 3;

export function useDbValues<T extends BulkKey>(bulkKey: T) {
    const { jwt } = useAuth();
    const rawTrpcClient = createTRPCProxyClient<AppRouter>(trpcClientOptions(jwt));

    return useQuery({
        queryKey: [`bulk-values-${bulkKey}`],
        meta: { suppressGlobalErrorToast: true },
        queryFn: async () => {
            const keys = await rawTrpcClient.admin.getBulkKeys.query(bulkKey);
            const chunkedKeyValuePairs = await mapInBatches(
                chunkArray(keys, WORKER_RETRIEVAL_CHUNK_SIZE),
                WORKER_RETRIEVAL_CONCURRENCY,
                (chunk) =>
                    rawTrpcClient.admin.getBulkValues.mutate(
                        { keys: chunk, bulkKey },
                        { context: { skipBatch: true } },
                    ),
            );
            // Extract values from key-value pairs
            // Filter for null values in case of data consistency issues. Ex: value deleted after key is gotten
            return chunkedKeyValuePairs
                .flat()
                .map(({ value }) => value)
                .filter((x) => x) as BulkKeyMap[T];
        },
    });
}

export function bulkInvalidationKey(bulkKey: BulkKey) {
    return [`bulk-values-${bulkKey}`];
}
