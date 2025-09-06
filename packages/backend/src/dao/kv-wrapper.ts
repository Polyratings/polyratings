import { TRPCError } from "@trpc/server";
import type { output, infer as zodInfer, ZodSafeParseResult, ZodTypeAny } from "zod";

export class KvWrapper {
    constructor(private readonly kv: KVNamespace) {}

    async get<T extends ZodTypeAny>(parser: T, key: string): Promise<zodInfer<T>> {
        const json = await this.kv.get<zodInfer<T>>(key, "json");
        if (json == null) {
            throw new TRPCError({ code: "NOT_FOUND" });
        }
        return parser.parse(json);
    }

    async safeGet<T extends ZodTypeAny>(
        parser: T,
        key: string,
    ): Promise<ZodSafeParseResult<output<T>>> {
        const json = await this.kv.get<zodInfer<T>>(key, "json");
        return parser.safeParse(json);
    }

    async getOptional<T extends ZodTypeAny>(
        parser: T,
        key: string,
    ): Promise<zodInfer<T> | undefined> {
        const value = await this.safeGet<T>(parser, key);
        return value.success ? value.data : undefined;
    }

    async getUnsafe<T>(key: string) {
        return this.kv.get<T>(key, "json");
    }

    async getAll<T extends ZodTypeAny>(parser: T): Promise<Array<zodInfer<T>>> {
        const list = await this.kv.list();
        const possiblyNullJson = await Promise.all(
            list.keys.map(async (key) => {
                const value = await this.safeGet<T>(parser, key.name);
                return value.success ? value.data : null;
            }),
        );
        return possiblyNullJson.filter((json) => json != null);
    }

    async safeGetAll<T extends ZodTypeAny>(
        parser: T,
    ): Promise<Array<ZodSafeParseResult<output<T>>>> {
        const list = await this.kv.list();
        return Promise.all(list.keys.map(async (key) => this.safeGet<T>(parser, key.name)));
    }

    async put<T extends ZodTypeAny, U extends zodInfer<T>>(
        parser: T,
        key: string,
        data: U,
        options?: KVNamespacePutOptions,
    ) {
        const parsed = parser.parse(data);
        await this.kv.put(key, JSON.stringify(parsed), options);
    }

    async delete(key: string) {
        await this.kv.delete(key);
    }

    async list(options?: KVNamespaceListOptions) {
        return this.kv.list(options);
    }
}
