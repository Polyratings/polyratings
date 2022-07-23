import { Switch, Route, Redirect, BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import * as Sentry from "@sentry/react";
import { QueryClient, QueryClientProvider } from "react-query";
import { persistQueryClient } from "react-query/persistQueryClient-experimental";

import { useState } from "react";
import { Home, TeacherPage, Login, NewTeacher, About, SearchWrapper, FAQ } from "./pages";
// import { Navbar } from "./components";
import "react-toastify/dist/ReactToastify.css";
import { config } from "./App.config";
import { trpc } from "./trpc";
import { createIDBPersister } from "./utils/idbPersister";

const SentryRoute = Sentry.withSentryRouting(Route);

// Do not init while developing in order to have less clutter in logs
if (process.env.NODE_ENV !== "development") {
    Sentry.init({
        dsn: "https://c9fe8d8e92a04bb585b15499bff924c5@o1195960.ingest.sentry.io/6319109",
        // 20% of transactions get sent to Sentry
        tracesSampleRate: 0.2,
    });
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
            url: config.clientEnv.url,

            // optional
            headers() {
                const jwt = window.localStorage.getItem("AUTH_TOKEN");
                return {
                    authorization: jwt ? `Bearer ${jwt}` : "",
                };
            },
        }),
    );

    return (
        <Sentry.ErrorBoundary showDialog>
            <trpc.Provider client={trpcClient} queryClient={queryClient}>
                <QueryClientProvider client={queryClient}>
                    <BrowserRouter basename={config.base}>
                        <ToastContainer />
                        {/* <Navbar /> */}
                        <Switch>
                            <SentryRoute path="/professor/:id" component={TeacherPage} />
                            <Redirect from="/teacher/:id" to="/professor/:id" />
                            <SentryRoute path="/search/:searchType?" component={SearchWrapper} />
                            <SentryRoute path="/login" component={Login} />
                            <SentryRoute path="/new-teacher" component={NewTeacher} />
                            <SentryRoute path="/about" component={About} />
                            {/* <SentryRoute path="/admin" component={Admin} /> */}
                            <SentryRoute path="/faq" component={FAQ} />
                            <SentryRoute path="/" component={Home} />
                        </Switch>
                    </BrowserRouter>
                </QueryClientProvider>
            </trpc.Provider>
        </Sentry.ErrorBoundary>
    );
}
export default App;
