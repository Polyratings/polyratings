import {
    Route,
    createBrowserRouter,
    createRoutesFromElements,
    RouterProvider,
    Outlet,
    ScrollRestoration,
    useLocation,
    Link,
} from "react-router";
import { toast } from "sonner";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { Suspense, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { professorPageLoaderFactory } from "./pages/professorPageLoader";
import { Footer } from "./components/Footer";
import { Navbar } from "./components/Navbar";
import { trpc, trpcClientOptions } from "./trpc";
import { Toaster } from "./components/ui/sonner";
import { createIDBPersister } from "./utils/idbPersister";
import { getApiErrorMessage, isExpectedSilentQueryError } from "./utils";
import { AuthContext, ThemeContext, useAuthState, useTheme, useThemeState } from "./hooks";

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
    const themeState = useThemeState();

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
        const [, persistPromise] = persistQueryClient({
            queryClient,
            persister: createIDBPersister(),
            buster: PERSISTED_QUERY_CACHE_BUSTER,
        });
        void persistPromise.catch(() => {
            // IndexedDB persistence is best-effort; failures should not break the app.
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
                    <ThemeContext.Provider value={themeState}>
                        <PolyratingsRouter />
                    </ThemeContext.Provider>
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
                        <Route errorElement={<RouteError />}>
                            <Route index element={<Home />} />
                            <Route
                                path="professor/:id"
                                loader={professorPageLoaderFactory(trpcContext)}
                                lazy={() =>
                                    import("./pages/ProfessorPage").then((module) => ({
                                        Component: module.ProfessorPageRoute,
                                    }))
                                }
                            />
                            <Route
                                path="professor/:id/eval"
                                loader={professorPageLoaderFactory(trpcContext)}
                                lazy={() =>
                                    import("./pages/EvaluateProfessor").then((module) => ({
                                        Component: module.EvaluateProfessorRoute,
                                    }))
                                }
                            />
                            <Route
                                path="search/:searchType"
                                lazy={() =>
                                    import("./pages/Search").then((module) => ({
                                        Component: module.SearchWrapper,
                                    }))
                                }
                            />
                            <Route
                                path="login"
                                lazy={() =>
                                    import("./pages/Login").then((module) => ({
                                        Component: module.Login,
                                    }))
                                }
                            />
                            <Route
                                path="new-professor"
                                lazy={() =>
                                    import("./pages/NewProfessor").then((module) => ({
                                        Component: module.NewProfessor,
                                    }))
                                }
                            />
                            <Route
                                path="about"
                                lazy={() =>
                                    import("./pages/About").then((module) => ({
                                        Component: module.About,
                                    }))
                                }
                            />
                            <Route
                                path="admin"
                                lazy={() =>
                                    import("./pages/Admin").then((module) => ({
                                        Component: module.Admin,
                                    }))
                                }
                            />
                            <Route
                                path="faq"
                                lazy={() =>
                                    import("./pages/FAQ").then((module) => ({
                                        Component: module.FAQ,
                                    }))
                                }
                            />
                            <Route path="*" element={<NotFound />} />
                        </Route>
                    </Route>,
                ),
            ),
        [trpcContext],
    );

    return <RouterProvider router={router} />;
}

function RouteFallback() {
    return <output className="block px-5 py-16 text-center text-foreground">Loading</output>;
}

function RouteError() {
    return (
        <div className="px-5 py-16 text-center text-foreground">
            <p className="text-lg">This page did not load.</p>
            <Link
                to="/"
                className="mt-4 inline-block font-semibold text-brand underline decoration-accent decoration-2 underline-offset-4"
            >
                Back to home
            </Link>
        </div>
    );
}

function BaseComponent() {
    // Sonner's own "system" theme reads prefers-color-scheme directly, which
    // would ignore the navbar toggle, so feed it the theme we resolved.
    const { theme } = useTheme();

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <ScrollRestoration />
            <Toaster theme={theme} />
            <Navbar />
            <AppScroll>
                {/* Fills the scroll viewport so the footer sits at the bottom on short pages. The
                    page row is a definite height, so pages can use `h-full` / `min-h-full`. */}
                <div className="grid min-h-full grid-rows-[1fr_auto]">
                    <div className="min-w-0">
                        <Suspense fallback={<RouteFallback />}>
                            <Outlet />
                        </Suspense>
                    </div>
                    <Footer />
                </div>
            </AppScroll>
        </div>
    );
}

function AppScroll({ children }: { children: ReactNode }) {
    const location = useLocation();
    const scrollRef = useRef<HTMLDivElement>(null);
    const positions = useRef(new Map<string, number>());

    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el) {
            return undefined;
        }
        const { key } = location;
        const onScroll = () => {
            positions.current.set(key, el.scrollTop);
        };
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, [location]);

    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el) {
            return;
        }
        el.scrollTop = positions.current.get(location.key) ?? 0;
    }, [location.key]);

    return (
        <div ref={scrollRef} id="app-scroll" className="min-h-0 flex-1 overflow-y-auto">
            {children}
        </div>
    );
}
