import { Outlet, useLocation, RouteObject } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { useMemo, useState } from "react";
import {
    Home,
    ProfessorPage,
    Login,
    NewProfessor,
    About,
    Admin,
    FAQ,
    professorPageLoaderFactory,
    SearchWrapper,
} from "./pages";
import { Navbar } from "./components";
import "react-toastify/dist/ReactToastify.css";
import { trpc, trpcClientOptions } from "./trpc";
import { createIDBPersister } from "./utils/idbPersister";
import { useIsomorphicLayoutEffect, AuthContext, useAuthState } from "./hooks";

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

export const routes: RouteObject[] = [
    {
        path: "/",
        element: <App />,
        children: [
            {
                index: true,
                element: <Home />,
            },
            {
                path: "professor/:id",
                element: <ProfessorPage />,
            },
            {
                path: "search/:searchType",
                element: <SearchWrapper />,
            },
            {
                path: "login",
                element: <Login />,
            },
            {
                path: "new-professor",
                element: <NewProfessor />,
            },
            {
                path: "about",
                element: <About />,
            },
            {
                path: "admin",
                element: <Admin />,
            },
            {
                path: "faq",
                element: <FAQ />,
            },
        ],
    },
];

// TODO: Fix large screen size
export default function App() {
    const authState = useAuthState();

    return (
        <AuthContext.Provider value={authState}>
            <ScrollToTop />
            <ToastContainer />
            <Navbar />
            <Outlet />
        </AuthContext.Provider>
    );
}

// From https://v5.reactrouter.com/web/guides/scroll-restoration
function ScrollToTop() {
    const { pathname } = useLocation();

    useIsomorphicLayoutEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}
