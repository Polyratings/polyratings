import { AppRouter } from "@backend/index";
import { BulkKey, BulkKeyMap } from "@backend/utils/const";
import { chunkArray } from "@backend/utils/chunkArray";
import { createTRPCProxyClient } from "@trpc/client";

const WORKER_RETRIEVAL_CHUNK_SIZE = 100;

export async function bulkRecord<T extends BulkKey>(
    client: ReturnType<typeof createTRPCProxyClient<AppRouter>>,
    bulkKey: T,
): Promise<Record<string, BulkKeyMap[T][0]>> {
    const allKeys = await client.admin.getBulkKeys.query(bulkKey);
    const keyValuePairs = (
        await Promise.all(
            chunkArray(allKeys, WORKER_RETRIEVAL_CHUNK_SIZE).map((chunk) =>
                client.admin.getBulkValues.mutate({ keys: chunk, bulkKey }),
            ),
        )
    ).flat();

    return Object.fromEntries(keyValuePairs.map(({ key, value }) => [key, value]));
}
