import { Router, Switch, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { createBrowserHistory } from "history";
import ReactGA from "react-ga4";
import { useEffect } from "react";
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";
import { Home, TeacherPage, Login, NewTeacher, About, SearchWrapper, Admin } from "./pages";
import { Navbar } from "./components";
import "react-toastify/dist/ReactToastify.css";
import { config } from "./App.config";

const history = createBrowserHistory({ basename: config.base });
const SentryRoute = Sentry.withSentryRouting(Route);

Sentry.init({
    dsn: "https://150f4ee898954b91aac4834cace32008@o1154721.ingest.sentry.io/6234908",
    integrations: [
        new BrowserTracing({
            routingInstrumentation: Sentry.reactRouterV5Instrumentation(history),
        }),
    ],

    // 20% of transactions get sent to Sentry
    tracesSampleRate: 0.2,
});

function App() {
    useEffect(() => {
        ReactGA.initialize("G-784BKPF31W");
    }, []);

    history.listen((location) => {
        ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
    });
    return (
        <Sentry.ErrorBoundary showDialog>
            <Router history={history}>
                <ToastContainer />
                <Navbar />
                <Switch>
                    <SentryRoute path="/teacher/:id" component={TeacherPage} />
                    <SentryRoute path="/search/:searchType" component={SearchWrapper} />
                    <SentryRoute path="/login" component={Login} />
                    <SentryRoute path="/new-teacher" component={NewTeacher} />
                    <SentryRoute path="/about" component={About} />
                    <SentryRoute path="/admin" component={Admin} />
                    <SentryRoute path="/" component={Home} />
                </Switch>
            </Router>
        </Sentry.ErrorBoundary>
    );
}
export default App;
