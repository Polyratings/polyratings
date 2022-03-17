// Disable any since there is no types when dealing with cloudflare API
/* eslint-disable @typescript-eslint/no-explicit-any */
import { chunkArray } from "@polyratings/client";
import { Logger } from "../logger";

const CLOUDFLARE_API_BASE_URL = "https://api.cloudflare.com/client/v4/";
export function cloudflareKVInit(apiToken: string, accountId: string) {
    return class {
        constructor(public namespaceId: string) {}

        public async cloudflareFetch(url: string, init?: RequestInit): Promise<Response> {
            const options = init || {};
            options.headers = {
                Authorization: `Bearer ${apiToken}`,
            };
            if (init?.body) {
                options.headers["Content-Type"] = "application/json";
            }

            const res = await fetch(url, options);

            if (res.status !== 200) {
                throw new Error(res.statusText);
            }

            return res;
        }

        async getAllKeys() {
            let cursor = "";
            let keyList: string[] = [];
            do {
                let url = `${CLOUDFLARE_API_BASE_URL}accounts/${accountId}/storage/kv/namespaces/${this.namespaceId}/keys`;
                if (cursor) {
                    url = `${url}?${new URLSearchParams({ cursor })}`;
                }
                const res = await this.cloudflareFetch(url);
                const body = (await res.json()) as any;
                keyList = keyList.concat(body.result.map((o: any) => o.name));
                cursor = body.result_info.cursor;
            } while (cursor);

            Logger.info(`Got ${keyList.length} number of keys from ${this.namespaceId}`);

            return keyList;
        }

        async putValues(values: { key: string; value: string }[]) {
            const chunkSize = 500;
            const chunks = chunkArray(values, chunkSize);
            for (const [i, chunk] of chunks.entries()) {
                Logger.info(
                    `Uploading chunk ${i * chunkSize} - ${(i + 1) * chunkSize} / ${
                        values.length
                    } to ${this.namespaceId}`,
                );
                await this.cloudflareFetch(
                    `${CLOUDFLARE_API_BASE_URL}accounts/${accountId}/storage/kv/namespaces/${this.namespaceId}/bulk`,
                    {
                        method: "PUT",
                        body: JSON.stringify(chunk),
                    },
                );
            }
        }

        async deleteValues(keys: string[]) {
            if (!keys.length) {
                // No work to be done
                return;
            }
            await this.cloudflareFetch(
                `${CLOUDFLARE_API_BASE_URL}accounts/${accountId}/storage/kv/namespaces/${this.namespaceId}/bulk`,
                {
                    method: "DELETE",
                    body: JSON.stringify(keys),
                },
            );
            Logger.info(`Deleted ${keys.length} from ${this.namespaceId}`);
        }
    };
}
