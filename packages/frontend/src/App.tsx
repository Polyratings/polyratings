import { Switch, Route, Redirect, BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { QueryClient, QueryClientProvider } from "react-query";
import { persistQueryClient } from "react-query/persistQueryClient-experimental";
import { useState } from "react";
import { httpLink } from "@trpc/client";
import { Home, TeacherPage, Login, NewTeacher, About, SearchWrapper, Admin, FAQ } from "./pages";
import { Navbar } from "./components";
import "react-toastify/dist/ReactToastify.css";
import { config } from "./App.config";
import { trpc } from "./trpc";
import { createIDBPersister } from "./utils/idbPersister";
import { JWT_KEY } from "./hooks";

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

function App() {
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
                    url: config.clientEnv.url,
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

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <ToastContainer />
                    <Navbar />
                    <Switch>
                        <Route path="/professor/:id" component={TeacherPage} />
                        <Redirect from="/teacher/:id" to="/professor/:id" />
                        <Route path="/search/:searchType?" component={SearchWrapper} />
                        <Route path="/login" component={Login} />
                        <Route path="/new-professor" component={NewTeacher} />
                        <Route path="/about" component={About} />
                        <Route path="/admin" component={Admin} />
                        <Route path="/faq" component={FAQ} />
                        <Route path="/" component={Home} />
                    </Switch>
                </BrowserRouter>
            </QueryClientProvider>
        </trpc.Provider>
    );
}
export default App;
