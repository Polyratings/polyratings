import {
    Route,
    createBrowserRouter,
    createRoutesFromElements,
    RouterProvider,
    Outlet,
    ScrollRestoration,
} from "react-router";
import { ToastContainer, toast } from "react-toastify";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { useMemo, useState } from "react";
import {
    Home,
    ProfessorPageRoute,
    Login,
    NewProfessor,
    About,
    Admin,
    FAQ,
    NotFoundRedirect,
    professorPageLoaderFactory,
    SearchWrapper,
} from "./pages";
import { Navbar } from "./components";
import "react-toastify/dist/ReactToastify.css";
import { trpc, trpcClientOptions } from "./trpc";
import { createIDBPersister } from "./utils/idbPersister";
import { getApiErrorMessage, isExpectedSilentQueryError } from "./utils";
import { AuthContext, useAuthState } from "./hooks";

/**
 * Bump this when persisted React Query data shape changes incompatibly
 * (e.g. a tRPC procedure's wire format changes). `persistQueryClient` will
 * drop any cache that does not match this `buster`, preventing stale clients
 * from rendering with old shapes after a deploy.
 */
const PERSISTED_QUERY_CACHE_BUSTER = "v2-2026-05";

type GlobalQueryMeta = {
    suppressGlobalErrorToast?: boolean;
};

declare module "@tanstack/react-query" {
    interface Register {
        queryMeta: GlobalQueryMeta;
        mutationMeta: GlobalQueryMeta;
    }
}

function shouldSuppressGlobalErrorToast(meta: GlobalQueryMeta | undefined): boolean {
    return Boolean(meta?.suppressGlobalErrorToast);
}

// TODO: Fix large screen size
export default function App() {
    const authState = useAuthState();

    const [queryClient] = useState(() => {
        const queryClient = new QueryClient({
            queryCache: new QueryCache({
                onError: (error, query) => {
                    if (
                        shouldSuppressGlobalErrorToast(query.options.meta) ||
                        isExpectedSilentQueryError(error)
                    ) {
                        return;
                    }
                    toast.error(
                        getApiErrorMessage(
                            error,
                            query.state.data === undefined
                                ? "We could not load this data."
                                : "We could not refresh this data.",
                        ),
                    );
                },
            }),
            mutationCache: new MutationCache({
                onError: (error, _variables, _context, mutation) => {
                    if (
                        !mutation.options.onError &&
                        !shouldSuppressGlobalErrorToast(mutation.options.meta)
                    ) {
                        toast.error(
                            getApiErrorMessage(error, "We could not complete that request."),
                        );
                    }
                },
            }),
            defaultOptions: {
                queries: { staleTime: Infinity, gcTime: 600000, retry: 1 },
                mutations: { retry: 0 },
            },
        });
        persistQueryClient({
            queryClient,
            persister: createIDBPersister(),
            buster: PERSISTED_QUERY_CACHE_BUSTER,
        });
        return queryClient;
    });
    const trpcClient = useMemo(
        () => trpc.createClient(trpcClientOptions(authState.jwt)),
        [authState.jwt],
    );

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                <AuthContext.Provider value={authState}>
                    <PolyratingsRouter />
                </AuthContext.Provider>
            </QueryClientProvider>
        </trpc.Provider>
    );
}

function PolyratingsRouter() {
    const trpcContext = trpc.useUtils();

    const router = useMemo(
        () =>
            createBrowserRouter(
                createRoutesFromElements(
                    <Route path="/" element={<BaseComponent />}>
                        <Route index element={<Home />} />
                        <Route
                            path="professor/:id"
                            element={<ProfessorPageRoute />}
                            loader={professorPageLoaderFactory(trpcContext)}
                        />
                        <Route path="search/:searchType" element={<SearchWrapper />} />
                        <Route path="login" element={<Login />} />
                        <Route path="new-professor" element={<NewProfessor />} />
                        <Route path="about" element={<About />} />
                        <Route path="admin" element={<Admin />} />
                        <Route path="faq" element={<FAQ />} />
                        <Route path="*" element={<NotFoundRedirect />} />
                    </Route>,
                ),
            ),
        [trpcContext],
    );

    return <RouterProvider router={router} />;
}

function BaseComponent() {
    return (
        <>
            <ScrollRestoration />
            <ToastContainer pauseOnFocusLoss={false} pauseOnHover={false} />
            <Navbar />
            <Outlet />
        </>
    );
}
