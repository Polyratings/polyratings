import { AppRouter } from "@backend/index";
import { BulkKey, BulkKeyMap } from "@backend/utils/const";
import { chunkArray, mapInBatches } from "@backend/utils/chunkArray";
import { createTRPCProxyClient } from "@trpc/client";

const WORKER_RETRIEVAL_CHUNK_SIZE = 100;
const WORKER_RETRIEVAL_CONCURRENCY = 3;

export async function bulkRecord<T extends BulkKey>(
    client: ReturnType<typeof createTRPCProxyClient<AppRouter>>,
    bulkKey: T,
): Promise<Record<string, BulkKeyMap[T][0]>> {
    const allKeys = await client.admin.getBulkKeys.query(bulkKey);
    const keyValuePairs = (
        await mapInBatches(
            chunkArray(allKeys, WORKER_RETRIEVAL_CHUNK_SIZE),
            WORKER_RETRIEVAL_CONCURRENCY,
            (chunk) => client.admin.getBulkValues.mutate({ keys: chunk, bulkKey }),
        )
    ).flat();

    return Object.fromEntries(keyValuePairs.map(({ key, value }) => [key, value]));
}
