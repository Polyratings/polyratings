const POLYRATINGS_INDEXED_DB_NAME = "POLYRATINGS";
const POLYRATINGS_OBJECT_STORE = "POLYRATINGS";
const POLYRATINGS_INDEXED_DB_VERSION = 1;

export interface CacheEntry<T> {
    exp: number;
    cachedAt: number;
    data: T;
}

// Private browsing in Firefox does not support indexedDb
// To resolve this there is two memory backings that the storage service can use
export class StorageService {
    public async getItem<T>(cacheKey: string): Promise<CacheEntry<T> | undefined> {
        const backing = await this.getBacking();
        const cacheEntry = await backing.getItem<CacheEntry<T>>(cacheKey);

        if (cacheEntry && Date.now() < cacheEntry.exp) {
            return cacheEntry;
        }

        this.removeItem(cacheKey);
        return undefined;
    }

    public async setItem<T>(cacheKey: string, data: T, timeUntilExpire: number) {
        const backing = await this.getBacking();
        const cacheEntry: CacheEntry<T> = {
            data,
            exp: Date.now() + timeUntilExpire,
            cachedAt: Date.now(),
        };
        await backing.setItem(cacheKey, cacheEntry);
    }

    public async removeItem(cacheKey: string) {
        const backing = await this.getBacking();
        await backing.removeItem(cacheKey);
    }

    public async clearAllStorage() {
        const backing = await this.getBacking();
        backing.clearAllStorage();
    }

    private indexDbBacking = new IndexedDbBacking();

    private memoryBacking = new MemoryBacking();

    private async getBacking(): Promise<StorageBacking> {
        if (await this.indexDbBacking.isOk()) {
            return this.indexDbBacking;
        }
        return this.memoryBacking;
    }
}

interface StorageBacking {
    setItem<T>(key: string, value: T): Promise<void>;
    getItem<T>(key: string): Promise<T | undefined>;
    removeItem(key: string): Promise<void>;
    clearAllStorage(): Promise<void>;
}

class IndexedDbBacking implements StorageBacking {
    private databaseConnection: Promise<IDBDatabase> = new Promise((resolve, reject) => {
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
            reject(dbOpenRequest.error);
        };

        dbOpenRequest.onsuccess = (): void => {
            resolve(dbOpenRequest.result);
        };
    });

    public async isOk(): Promise<boolean> {
        try {
            await this.databaseConnection;
            return true;
        } catch {
            return false;
        }
    }

    async getItem<T>(cacheKey: string): Promise<T | undefined> {
        const db = await this.databaseConnection;
        const transaction = db.transaction(POLYRATINGS_OBJECT_STORE, "readonly");
        const request = transaction.objectStore(POLYRATINGS_OBJECT_STORE).get(cacheKey);

        return new Promise((resolve, reject) => {
            request.onsuccess = (): void => {
                resolve(request.result);
            };
            request.onerror = (e) => {
                reject(e);
            };
        });
    }

    async setItem<T>(key: string, value: T) {
        const db = await this.databaseConnection;
        const transaction = db.transaction(POLYRATINGS_OBJECT_STORE, "readwrite");
        await transaction.objectStore(POLYRATINGS_OBJECT_STORE).put(value, key);
    }

    async removeItem(key: string) {
        const db = await this.databaseConnection;
        const transaction = db.transaction(POLYRATINGS_OBJECT_STORE, "readwrite");
        transaction.objectStore(POLYRATINGS_OBJECT_STORE).delete(key);
    }

    async clearAllStorage() {
        const db = await this.databaseConnection;
        const transaction = db.transaction(POLYRATINGS_OBJECT_STORE, "readwrite");
        const request = transaction.objectStore(POLYRATINGS_OBJECT_STORE).clear();
        return new Promise<void>((resolve, reject) => {
            request.onsuccess = () => resolve();
            request.onerror = () => reject();
        });
    }
}

class MemoryBacking implements StorageBacking {
    private store: Record<string, unknown> = {};

    async getItem<T>(key: string): Promise<T | undefined> {
        return this.store[key] as T | undefined;
    }

    async setItem<T>(key: string, value: T): Promise<void> {
        this.store[key] = value;
    }

    async removeItem(key: string): Promise<void> {
        delete this.store[key];
    }

    async clearAllStorage(): Promise<void> {
        this.store = {};
    }
}
