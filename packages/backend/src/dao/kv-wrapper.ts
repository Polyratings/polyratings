import { infer as zodInfer, ZodTypeAny } from "zod";
import { TRPCError } from "@trpc/server";

export class KvWrapper {
    constructor(private kv: KVNamespace) {}

    async get<T extends ZodTypeAny>(validator: T, key: string): Promise<zodInfer<T>> {
        const json = await this.kv.get(key, "json");
        if (!json) {
            throw new TRPCError({ code: "NOT_FOUND" });
        }
        return validator.parse(json);
    }

    async getOptional<T extends ZodTypeAny>(
        validator: T,
        key: string,
    ): Promise<zodInfer<T> | undefined> {
        try {
            const value = await this.get(validator, key);
            return value;
        } catch (_) {
            return undefined;
        }
    }

    getUnsafe(key: string) {
        return this.kv.get(key, "json");
    }

    async getAll<T extends ZodTypeAny>(validator: T): Promise<zodInfer<T>[]> {
        const list = await this.kv.list();
        const possiblyNullJson = await Promise.all(
            list.keys.map((key) => this.kv.get(key.name, "json")),
        );
        return possiblyNullJson.filter((exists) => exists).map((json) => validator.parse(json));
    }

    put<T extends ZodTypeAny, U extends zodInfer<T>>(validator: T, key: string, data: U) {
        const parsed = validator.parse(data);
        return this.kv.put(key, JSON.stringify(parsed));
    }

    delete(key: string) {
        return this.kv.delete(key);
    }

    list(options?: KVNamespaceListOptions) {
        return this.kv.list(options);
    }
}
