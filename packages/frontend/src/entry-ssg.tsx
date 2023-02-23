/* eslint-disable no-await-in-loop */
import fs from "fs";
import path from "path";
import { createStaticHandler } from "@remix-run/router";
import { dehydrate, Hydrate, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { createStaticRouter, StaticRouterProvider } from "react-router-dom/server";
import { createTRPCProxyClient } from "@trpc/client";
import { AppRouter } from "@backend/index";
import { PromisePool } from "@supercharge/promise-pool";
import cliProgress from "cli-progress";
import { trpc, trpcClientOptions } from "./trpc";
import { routes } from "./App";

async function SSRRender(urlStr: string) {
    const { query } = createStaticHandler(routes);
    const context = await query(new Request(urlStr));

    if (context instanceof Response) {
        throw context;
    }

    const router = createStaticRouter(routes, context);
    const queryClient = new QueryClient({
        defaultOptions: { queries: { staleTime: Infinity, cacheTime: 600000 } },
    });

    const trpcClient = trpc.createClient(trpcClientOptions(""));

    // First Render
    ReactDOMServer.renderToString(
        <React.StrictMode>
            <trpc.Provider client={trpcClient} queryClient={queryClient}>
                <QueryClientProvider client={queryClient}>
                    <StaticRouterProvider router={router} context={context} />
                </QueryClientProvider>
            </trpc.Provider>
        </React.StrictMode>,
    );

    await queryClient.refetchQueries();

    const dehydratedState = dehydrate(queryClient);

    const secondRender = ReactDOMServer.renderToString(
        <React.StrictMode>
            <trpc.Provider client={trpcClient} queryClient={queryClient}>
                <QueryClientProvider client={queryClient}>
                    <Hydrate state={dehydratedState}>
                        <StaticRouterProvider router={router} context={context} />
                    </Hydrate>
                </QueryClientProvider>
            </trpc.Provider>
        </React.StrictMode>,
    );

    queryClient.clear();

    return `${secondRender}
        <script>
          window.__REACT_QUERY_STATE__ = ${JSON.stringify(dehydratedState)};
        </script>`;
}

async function main() {
    const trpcClient = createTRPCProxyClient<AppRouter>(trpcClientOptions(null));

    const template = fs.readFileSync("dist/index.html", "utf-8");

    const professors = await trpcClient.professors.all.query();
    const professorUrls = professors.map(({ id }) => `/professor/${id}`);

    const routesToPrerender = [...professorUrls, "/faq", "/new-professor"];

    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.legacy);
    progressBar.start(routesToPrerender.length, 0);

    const { errors } = await PromisePool.withConcurrency(20)
        .for(routesToPrerender)
        .onTaskFinished(() => progressBar.increment())
        .process(async (url) => {
            const appHtml = await SSRRender(`http://localhost:300${url}`);

            const html = template.replace("<!--app-html-->", appHtml);

            const filePath = `dist${url === "/" ? "/index" : url}.html`;
            try {
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
            } catch {
                //
            }
            fs.writeFileSync(filePath, html);
        });

    if (errors.length) {
        // eslint-disable-next-line no-console
        console.log(`Got Errors\n:${errors}`);
        process.exit(1);
    }
}
main();
