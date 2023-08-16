import { get, set, del } from "idb-keyval";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";

// eslint-disable-next-line max-len
// FROM https://tanstack.com/query/v4/docs/plugins/persistQueryClient?from=reactQueryV3&original=https://react-query-v3.tanstack.com/plugins/persistQueryClient

/**
 * Creates an Indexed DB persister
 * @see https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 */
export function createIDBPersister(idbValidKey: IDBValidKey = "reactQuery") {
    return {
        persistClient: async (client: PersistedClient) => {
            set(idbValidKey, client);
        },
        restoreClient: async () => get<PersistedClient>(idbValidKey),
        removeClient: async () => {
            await del(idbValidKey);
        },
    } as Persister;
}
