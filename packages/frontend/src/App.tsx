import { Router, Switch, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { createBrowserHistory } from "history";
import * as Sentry from "@sentry/react";
import { Home, TeacherPage, Login, NewTeacher, About, SearchWrapper, Admin, FAQ } from "./pages";
import { Navbar } from "./components";
import "react-toastify/dist/ReactToastify.css";
import { config } from "./App.config";

const history = createBrowserHistory({ basename: config.base });
const SentryRoute = Sentry.withSentryRouting(Route);

Sentry.init({
    dsn: "https://150f4ee898954b91aac4834cace32008@o1154721.ingest.sentry.io/6234908",
    // 20% of transactions get sent to Sentry
    tracesSampleRate: 0.2,
});

function App() {
    return (
        <Sentry.ErrorBoundary showDialog>
            <Router history={history}>
                <ToastContainer />
                <Navbar />
                <Switch>
                    <SentryRoute path="/professor/:id" component={TeacherPage} />
                    <SentryRoute path="/search/:searchType?" component={SearchWrapper} />
                    <SentryRoute path="/login" component={Login} />
                    <SentryRoute path="/new-teacher" component={NewTeacher} />
                    <SentryRoute path="/about" component={About} />
                    <SentryRoute path="/admin" component={Admin} />
                    <SentryRoute path="/faq" component={FAQ} />
                    <SentryRoute path="/" component={Home} />
                </Switch>
            </Router>
        </Sentry.ErrorBoundary>
    );
}
export default App;
