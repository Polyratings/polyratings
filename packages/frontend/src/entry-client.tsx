import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import Modal from "react-modal";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Hydrate, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { routes } from "./App";
import { createIDBPersister } from "./utils/idbPersister";
import { trpc, trpcClientOptions } from "./trpc";

Modal.setAppElement("#app");

const router = createBrowserRouter(routes);

// @ts-expect-error We put this from the client
const dehydratedState = window.__REACT_QUERY_STATE__;
const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, cacheTime: 600000 } },
});

const trpcClient = trpc.createClient(trpcClientOptions(""));

persistQueryClient({
    queryClient,
    persister: createIDBPersister(),
});

ReactDOM.hydrateRoot(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    document.getElementById("app")!,
    <React.StrictMode>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                <Hydrate state={dehydratedState}>
                    <RouterProvider router={router} fallbackElement={null} />
                </Hydrate>
            </QueryClientProvider>
        </trpc.Provider>
    </React.StrictMode>,
);
