import {
    Route,
    createBrowserRouter,
    createRoutesFromElements,
    RouterProvider,
    Outlet,
    useLocation,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { QueryClient, QueryClientProvider } from "react-query";
import { persistQueryClient } from "react-query/persistQueryClient-experimental";
import { useLayoutEffect, useMemo, useState } from "react";
import { httpLink } from "@trpc/client";
import { DEV_ENV } from "@backend/generated/tomlGenerated";
import {
    Home,
    TeacherPage,
    Login,
    NewTeacher,
    About,
    Admin,
    FAQ,
    teacherPageLoaderFactory,
    SearchWrapper,
} from "./pages";
import { Navbar } from "./components";
import "react-toastify/dist/ReactToastify.css";
import { trpc } from "./trpc";
import { createIDBPersister } from "./utils/idbPersister";
import { AuthContext, JWT_KEY, setJwtWrapper } from "./hooks";

// Lazy load error logger to save bundle size
if (process.env.NODE_ENV === "production") {
    const captureError = async (error: unknown) => {
        try {
            // eslint-disable-next-line no-console
            console.error(error); // Log error to console for clarification
            const Sentry = await import("@sentry/browser");
            Sentry.init({
                dsn: "https://c9fe8d8e92a04bb585b15499bff924c5@o1195960.ingest.sentry.io/6319109",
                // 20% of transactions get sent to Sentry
                tracesSampleRate: 0.2,
            });
            Sentry.captureException(error);
        } catch (e) {
            // all fails, reset window.onerror to prevent infinite loop on window.onerror
            // eslint-disable-next-line no-console
            console.error("Logging to Sentry failed", e);
            window.onerror = null;
        }
    };
    window.onerror = (message, url, line, column, error) => captureError(error);
    window.onunhandledrejection = (event) => captureError(event.reason);
}

// TODO: Fix large screen size
export default function App() {
    const [queryClient] = useState(() => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { staleTime: Infinity, cacheTime: 600000 } },
        });
        persistQueryClient({
            queryClient,
            persistor: createIDBPersister(),
        });
        return queryClient;
    });
    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpLink({
                    // TODO: Change Back to config
                    url: DEV_ENV.url,
                }),
            ],
            headers() {
                const jwt = window.localStorage.getItem(JWT_KEY);
                return {
                    authorization: jwt ? `Bearer ${jwt}` : "",
                };
            },
        }),
    );

    const [jwt, setJwtMemory] = useState(window.localStorage.getItem(JWT_KEY));
    const contextObj = useMemo(
        () => ({
            jwt,
            setJwt: setJwtWrapper(setJwtMemory),
        }),
        [jwt, setJwtMemory],
    );

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                <AuthContext.Provider value={contextObj}>
                    <PolyratingsRouter />
                </AuthContext.Provider>
            </QueryClientProvider>
        </trpc.Provider>
    );
}

function PolyratingsRouter() {
    const trpcContext = trpc.useContext();

    const router = createBrowserRouter(
        createRoutesFromElements(
            <Route path="/" element={<BaseComponent />}>
                <Route index element={<Home />} />
                <Route
                    path="professor/:id"
                    element={<TeacherPage />}
                    loader={teacherPageLoaderFactory(trpcContext)}
                />
                <Route path="search/:searchType?" element={<SearchWrapper />} />
                <Route path="search" element={<SearchWrapper />} />
                <Route path="login" element={<Login />} />
                <Route path="new-professor" element={<NewTeacher />} />
                <Route path="about" element={<About />} />
                <Route path="admin" element={<Admin />} />
                <Route path="faq" element={<FAQ />} />
            </Route>,
        ),
    );

    return <RouterProvider router={router} />;
}

function BaseComponent() {
    return (
        <>
            <ScrollToTop />
            <ToastContainer />
            <Navbar />
            <Outlet />
        </>
    );
}

// From https://v5.reactrouter.com/web/guides/scroll-restoration
function ScrollToTop() {
    const { pathname } = useLocation();

    useLayoutEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}
