import { BulkKey, BulkKeyMap } from "@backend/utils/const";
import { useEffect, useState } from "react";
import { trpc } from "@/trpc";

const WORKER_RETRIEVAL_CHUNK_SIZE = 1000;

export function useDbValues<T extends BulkKey>(bulkKey: T) {
    const [dbValues, setDbValues] = useState<BulkKeyMap[T]>();
    const { data: keys } = trpc.useQuery(["getBulkKeys", bulkKey]);
    const trpcContext = trpc.useContext();
    useEffect(() => {
        if (!keys) {
            return;
        }
        const getValues = async () => {
            const chunkedKeys = chunkArray(keys, WORKER_RETRIEVAL_CHUNK_SIZE);
            const results = await Promise.all(
                chunkedKeys.map((chunk) =>
                    trpcContext.client.query("getBulkValues", { keys: chunk, bulkKey }),
                ),
            );
            setDbValues(results.flat() as never);
        };
        getValues();
    }, [keys]);

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
