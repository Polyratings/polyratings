import { Switch, Route, Redirect, BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import * as Sentry from "@sentry/react";
import { Home, TeacherPage, Login, NewTeacher, About, SearchWrapper, Admin, FAQ } from "./pages";
import { Navbar } from "./components";
import "react-toastify/dist/ReactToastify.css";
import { config } from "./App.config";

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
    return (
        <Sentry.ErrorBoundary showDialog>
            <BrowserRouter basename={config.base}>
                <ToastContainer />
                <Navbar />
                <Switch>
                    <SentryRoute path="/professor/:id" component={TeacherPage} />
                    <Redirect from="/teacher/:id" to="/professor/:id" />
                    <SentryRoute path="/search/:searchType?" component={SearchWrapper} />
                    <SentryRoute path="/login" component={Login} />
                    <SentryRoute path="/new-teacher" component={NewTeacher} />
                    <SentryRoute path="/about" component={About} />
                    <SentryRoute path="/admin" component={Admin} />
                    <SentryRoute path="/faq" component={FAQ} />
                    <SentryRoute path="/" component={Home} />
                </Switch>
            </BrowserRouter>
        </Sentry.ErrorBoundary>
    );
}
export default App;
