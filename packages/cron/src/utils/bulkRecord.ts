import type { AppRouter } from "@backend/index";
import type { BulkKey, BulkKeyMap } from "@backend/utils/const";
import type { createTRPCProxyClient } from "@trpc/client";
import { chunkArray } from "./chunkArray";

const WORKER_RETRIEVAL_CHUNK_SIZE = 100;

export async function bulkRecord<T extends BulkKey>(
    client: ReturnType<typeof createTRPCProxyClient<AppRouter>>,
    bulkKey: T,
): Promise<Record<string, BulkKeyMap[T][0]>> {
    const allKeys = await client.admin.getBulkKeys.query(bulkKey);
    const values = (
        await Promise.all(
            chunkArray(allKeys, WORKER_RETRIEVAL_CHUNK_SIZE).map((chunk) =>
                client.admin.getBulkValues
                    .mutate({ keys: chunk, bulkKey })
                    // We know that the values and the chunk have the same length
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    .then((values) => values.map((value, i) => ({ key: chunk[i]!, value }))),
            ),
        )
    ).flat();

    return Object.fromEntries(values.map(({ key, value }) => [key, value]));
}
