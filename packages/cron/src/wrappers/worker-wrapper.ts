import { AuthResponse, PolyratingsError, chunkArray, BulkKey } from "@polyratings/shared";
import { Logger } from "../logger";

export class PolyratingsWorkerWrapper {
    private token: string | undefined;

    constructor(private baseUrl: string) {}

    private async polyratingsFetch(url: string, init?: RequestInit): Promise<Response> {
        const options = init || {};
        options.headers = {
            Authorization: `Bearer ${this.token}`,
        };
        const res = await fetch(url, options);

        if (res.status !== 200) {
            throw new Error(res.statusText);
        }

        return res;
    }

    async login(username: string, password: string) {
        const res = await fetch(`${this.baseUrl}login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });

        if (res.status >= 300) {
            const errorPayload = (await res.json()) as PolyratingsError;
            throw errorPayload.message;
        }

        const loginBody = (await res.json()) as AuthResponse;
        this.token = loginBody.accessToken;
        Logger.info(`Logged into ${this.baseUrl} as ${username}`);
    }

    async bulkKeys(bulkKey: BulkKey): Promise<string[]> {
        const res = await this.polyratingsFetch(`${this.baseUrl}admin/bulk/${bulkKey}`);
        Logger.info(`Got all ${bulkKey} keys for ${this.baseUrl}`);
        return res.json() as Promise<string[]>;
    }

    async getBulkValues<T>(bulkKey: BulkKey, keys: string[]): Promise<T[]> {
        const workerKeyRetrievalChunkSize = 1000;
        const chunkedKeys = chunkArray(keys, workerKeyRetrievalChunkSize);
        const results = await Promise.all(
            chunkedKeys.map((chunk) =>
                this.polyratingsFetch(`${this.baseUrl}admin/bulk/${bulkKey}`, {
                    method: "POST",
                    body: JSON.stringify({
                        keys: chunk,
                    }),
                }),
            ),
        );

        const bodies2d = (await Promise.all(results.map((res) => res.json()))) as T[][];
        const bodies = bodies2d.reduce((acc, curr) => acc.concat(curr), []);

        Logger.info(`Received ${bodies.length} from kv ${bulkKey} in ${this.baseUrl}`);
        return bodies;
    }

    async bulkEntries<T>(bulkKey: BulkKey): Promise<[string, T][]> {
        const keys = await this.bulkKeys(bulkKey);
        const values = await this.getBulkValues<T>(bulkKey, keys);
        return keys.map((k, i) => [k, values[i]]);
    }
}
