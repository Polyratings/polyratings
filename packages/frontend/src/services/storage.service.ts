const POLYRATINGS_INDEXED_DB_NAME = "POLYRATINGS";
const POLYRATINGS_OBJECT_STORE = "POLYRATINGS";
const POLYRATINGS_INDEXED_DB_VERSION = 1;

export interface CacheEntry<T> {
    exp: number;
    cachedAt: number;
    data: T;
}

export class StorageService {
    private databaseConnection: Promise<IDBDatabase> = new Promise((resolve) => {
        const dbOpenRequest = indexedDB.open(
            POLYRATINGS_INDEXED_DB_NAME,
            POLYRATINGS_INDEXED_DB_VERSION,
        );

        dbOpenRequest.onupgradeneeded = (): void => {
            const db = dbOpenRequest.result;
            // Wipes out all auto-save data on upgrade
            if (db.objectStoreNames.contains(POLYRATINGS_OBJECT_STORE)) {
                db.deleteObjectStore(POLYRATINGS_OBJECT_STORE);
            }

            db.createObjectStore(POLYRATINGS_OBJECT_STORE);
        };

        dbOpenRequest.onerror = (): void => {
            // eslint-disable-next-line no-console
            console.error("Polyratings IndexedDb error:", dbOpenRequest.error);
        };

        dbOpenRequest.onsuccess = (): void => {
            resolve(dbOpenRequest.result);
        };
    });

    public async getItem<T>(cacheKey: string): Promise<CacheEntry<T> | undefined> {
        const db = await this.databaseConnection;
        const transaction = db.transaction(POLYRATINGS_OBJECT_STORE, "readonly");
        const request = transaction.objectStore(POLYRATINGS_OBJECT_STORE).get(cacheKey);

        return new Promise((resolve) => {
            request.onsuccess = (): void => {
                const cacheEntry: CacheEntry<T> = request.result;
                // Check if cache entry has expired
                if (cacheEntry && Date.now() < cacheEntry.exp) {
                    resolve(cacheEntry);
                } else {
                    this.removeItem(cacheKey);
                    resolve(undefined);
                }
            };
        });
    }

    public async setItem<T>(cacheKey: string, data: T, timeUntilExpire: number) {
        const db = await this.databaseConnection;
        const cacheEntry: CacheEntry<T> = {
            data,
            exp: Date.now() + timeUntilExpire,
            cachedAt: Date.now(),
        };
        const transaction = db.transaction(POLYRATINGS_OBJECT_STORE, "readwrite");
        transaction.objectStore(POLYRATINGS_OBJECT_STORE).put(cacheEntry, cacheKey);
    }

    public async removeItem(cacheKey: string) {
        const db = await this.databaseConnection;
        const transaction = db.transaction(POLYRATINGS_OBJECT_STORE, "readwrite");
        transaction.objectStore(POLYRATINGS_OBJECT_STORE).delete(cacheKey);
    }
}
