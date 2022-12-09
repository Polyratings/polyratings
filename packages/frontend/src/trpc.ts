import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@backend/index";
import { config } from "./App.config";

// eslint-disable-next-line no-restricted-imports, import/no-relative-packages

export const trpc = createTRPCReact<AppRouter>();

export const trpcClientOptions = (jwt: string | null) => ({
    links: [
        httpLink({
            url: config.clientEnv.url,
            headers() {
                return {
                    authorization: jwt ? `Bearer ${jwt}` : "",
                };
            },
        }),
    ],
});
