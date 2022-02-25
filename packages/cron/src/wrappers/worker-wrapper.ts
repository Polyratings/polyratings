import { AuthResponse, PolyratingsError, Teacher } from "@polyratings/shared";
import { chunkArray } from "../utils/chunkArray";
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
        Logger.info(`Logged into ${this.baseUrl}`);
    }

    async professorKeys(): Promise<string[]> {
        const res = await this.polyratingsFetch(`${this.baseUrl}admin/professor/keys`);
        Logger.info(`Got all professor keys for ${this.baseUrl}`);
        return res.json() as Promise<string[]>;
    }

    async professorValues(keys: string[]): Promise<Teacher[]> {
        const workerKeyRetrievalChunkSize = 1000;
        const chunkedKeys = chunkArray(keys, workerKeyRetrievalChunkSize);
        const results = await Promise.all(
            chunkedKeys.map((chunk) =>
                this.polyratingsFetch(`${this.baseUrl}admin/professor/values`, {
                    method: "POST",
                    body: JSON.stringify({
                        professorKeys: chunk,
                    }),
                }),
            ),
        );

        const bodies = (await Promise.all(results.map((res) => res.json()))) as string[][];

        const teachers2d = bodies.map((arr) => arr.map((t) => JSON.parse(t))) as Teacher[][];
        const teachers = teachers2d.reduce((acc, curr) => acc.concat(curr), []);

        Logger.info(`Received ${teachers.length} professors from ${this.baseUrl}`);
        return teachers;
    }

    async professorEntries(): Promise<[string, Teacher][]> {
        const keys = await this.professorKeys();
        const values = await this.professorValues(keys);
        return keys.map((k, i) => [k, values[i]]);
    }
}
