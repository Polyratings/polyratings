import { BulkKey, BulkKeyMap } from "@backend/utils/const";
import { useQuery } from "@tanstack/react-query";
import { createTRPCProxyClient } from "@trpc/client";
import { AppRouter } from "@backend/index";
import { trpcClientOptions } from "@/trpc";
import { useAuth } from "./useAuth";

const WORKER_RETRIEVAL_CHUNK_SIZE = 100;

export function useDbValues<T extends BulkKey>(bulkKey: T) {
    const { jwt } = useAuth();
    const rawTrpcClient = createTRPCProxyClient<AppRouter>(trpcClientOptions(jwt));

    return useQuery([`bulk-values-${bulkKey}`], async () => {
        const keys = await rawTrpcClient.admin.getBulkKeys.query(bulkKey);
        const chunkedKeys = chunkArray(keys, WORKER_RETRIEVAL_CHUNK_SIZE);
        const chunkedValues = await Promise.all(
            chunkedKeys.map((chunk) =>
                rawTrpcClient.admin.getBulkValues.mutate(
                    { keys: chunk, bulkKey },
                    { context: { skipBatch: true } },
                ),
            ),
        );
        return chunkedValues.flat() as BulkKeyMap[T];
    });
}

export function bulkInvalidationKey(bulkKey: BulkKey) {
    return [`bulk-values-${bulkKey}`];
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
    const arrShallowClone = [...arr];
    const chunked = [];
    while (arrShallowClone.length) {
        chunked.push(arrShallowClone.splice(0, size));
    }
    return chunked;
}
