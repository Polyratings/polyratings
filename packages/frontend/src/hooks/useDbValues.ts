import { BulkKey, BulkKeyMap } from "@backend/utils/const";
import { useQuery } from "react-query";
import { trpc } from "@/trpc";

const WORKER_RETRIEVAL_CHUNK_SIZE = 100;

export function useDbValues<T extends BulkKey>(bulkKey: T) {
    const trpcContext = trpc.useContext();

    return useQuery(`bulk-values-${bulkKey}`, async () => {
        const keys = await trpcContext.client.query("getBulkKeys", bulkKey);
        const chunkedKeys = chunkArray(keys, WORKER_RETRIEVAL_CHUNK_SIZE);
        const chunkedValues = await Promise.all(
            chunkedKeys.map((chunk) =>
                trpcContext.client.mutation(
                    "getBulkValues",
                    { keys: chunk, bulkKey },
                    { context: { skipBatch: true } },
                ),
            ),
        );
        return chunkedValues.flat() as BulkKeyMap[T];
    });
}

export function bulkInvalidationKey(bulkKey: BulkKey) {
    return `bulk-values-${bulkKey}`;
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
    const arrShallowClone = [...arr];
    const chunked = [];
    while (arrShallowClone.length) {
        chunked.push(arrShallowClone.splice(0, size));
    }
    return chunked;
}
