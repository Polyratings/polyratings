import { BulkKey, BulkKeyMap } from "@backend/utils/const";
import { useState } from "react";
import { trpc } from "@/trpc";

const WORKER_RETRIEVAL_CHUNK_SIZE = 1000;

export function useDbValues<T extends BulkKey>(bulkKey: T, enabled = true) {
    const [dbValues, setDbValues] = useState<BulkKeyMap[T]>();
    const { data: keys } = trpc.useQuery(["getBulkKeys", bulkKey], { enabled });
    const trpcContext = trpc.useContext();

    if (keys && !dbValues) {
        const getValues = async () => {
            const chunkedKeys = chunkArray(keys, WORKER_RETRIEVAL_CHUNK_SIZE);
            const results = await Promise.all(
                chunkedKeys.map((chunk) =>
                    trpcContext.client.mutation(
                        "getBulkValues",
                        { keys: chunk, bulkKey },
                        { context: { skipBatch: true } },
                    ),
                ),
            );
            setDbValues(results.flat() as never);
        };
        getValues();
    }

    return dbValues;
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
    const arrShallowClone = [...arr];
    const chunked = [];
    while (arrShallowClone.length) {
        chunked.push(arrShallowClone.splice(0, size));
    }
    return chunked;
}
