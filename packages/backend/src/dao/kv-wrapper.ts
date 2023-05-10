import { infer as zodInfer, SafeParseReturnType, ZodTypeAny } from "zod";
import { TRPCError } from "@trpc/server";

export class KvWrapper {
    constructor(private kv: KVNamespace) {}

    async get<T extends ZodTypeAny>(parser: T, key: string): Promise<zodInfer<T>> {
        const json = await this.kv.get(key, "json");
        if (!json) {
            throw new TRPCError({ code: "NOT_FOUND" });
        }
        return parser.parse(json);
    }

    async safeGet<T extends ZodTypeAny>(
        parser: T,
        key: string,
    ): Promise<SafeParseReturnType<T, zodInfer<T>>> {
        const json = await this.kv.get(key, "json");
        return parser.safeParse(json);
    }

    async getOptional<T extends ZodTypeAny>(
        parser: T,
        key: string,
    ): Promise<zodInfer<T> | undefined> {
        try {
            const value = await this.get(parser, key);
            return value;
        } catch (_) {
            return undefined;
        }
    }

    getUnsafe(key: string) {
        return this.kv.get(key, "json");
    }

    async getAll<T extends ZodTypeAny>(parser: T): Promise<zodInfer<T>[]> {
        const list = await this.kv.list();
        const possiblyNullJson = await Promise.all(
            list.keys.map((key) => this.kv.get(key.name, "json")),
        );
        return possiblyNullJson.filter((exists) => exists).map((json) => parser.parse(json));
    }

    put<T extends ZodTypeAny, U extends zodInfer<T>>(
        parser: T,
        key: string,
        data: U,
        options?: KVNamespacePutOptions,
    ) {
        const parsed = parser.parse(data);
        return this.kv.put(key, JSON.stringify(parsed), options);
    }

    delete(key: string) {
        return this.kv.delete(key);
    }

    list(options?: KVNamespaceListOptions) {
        return this.kv.list(options);
    }
}
