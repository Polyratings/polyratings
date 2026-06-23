import {
    Route,
    createBrowserRouter,
    createRoutesFromElements,
    RouterProvider,
    Outlet,
    ScrollRestoration,
} from "react-router";
import { ToastContainer } from "react-toastify";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { AuthContext, useAuthState } from "./hooks";

// TODO: Fix large screen size
export default function App() {
    const authState = useAuthState();

    const [queryClient] = useState(() => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { staleTime: Infinity, gcTime: 600000 } },
        });
        persistQueryClient({
            queryClient,
            persister: createIDBPersister(),
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
