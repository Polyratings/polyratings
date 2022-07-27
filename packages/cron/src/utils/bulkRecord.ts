import { AppRouter } from "@backend/index";
import { BulkKey } from "@backend/utils/const";
import { TRPCClient } from "@trpc/client";
import { chunkArray } from "./chunkArray";

const WORKER_RETRIEVAL_CHUNK_SIZE = 1000;

export async function bulkRecord(client: TRPCClient<AppRouter>, bulkKey: BulkKey) {
    const allKeys = await client.query("getBulkKeys", bulkKey);
    const values = (
        await Promise.all(
            chunkArray(allKeys, WORKER_RETRIEVAL_CHUNK_SIZE).map((chunk) =>
                client
                    .mutation("getBulkValues", { keys: chunk, bulkKey })
                    // We know that the values and the chunk have the same length
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    .then((values) => values.map((value, i) => ({ key: chunk[i]!, value }))),
            ),
        )
    ).flat();
    return Object.fromEntries(values.map(({ key, value }) => [key, value]));
}
