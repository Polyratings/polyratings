import { Router, Switch, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { createBrowserHistory } from "history";
import ReactGA from "react-ga4";
import { Component, useEffect } from "react";
import { Home, TeacherPage, Login, NewTeacher, About, SearchWrapper, Admin } from "./pages";
import { Navbar } from "./components";
import "react-toastify/dist/ReactToastify.css";
import { config } from "./App.config";
import { useService } from "./hooks";
import { Logger } from "./services";

function App() {
    useEffect(() => {
        ReactGA.initialize("G-784BKPF31W");
    }, []);

    const history = createBrowserHistory({ basename: config.base });
    history.listen((location) => {
        ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
    });
    return (
        <GlobalErrorBoundary>
            <Router history={history}>
                <ToastContainer />
                <Navbar />
                <Switch>
                    <Route path="/teacher/:id" component={TeacherPage} />
                    <Route path="/search/:searchType" component={SearchWrapper} />
                    <Route path="/login" component={Login} />
                    <Route path="/new-teacher" component={NewTeacher} />
                    <Route path="/about" component={About} />
                    <Route path="/admin" component={Admin} />
                    <Route path="/" component={Home} />
                </Switch>
            </Router>
        </GlobalErrorBoundary>
    );
}

class GlobalErrorBoundary extends Component {
    componentDidMount() {
        // Add an event listener to the window to catch unhandled promise rejections & stash the error in the state
        window.addEventListener("unhandledrejection", this.promiseRejectionHandler);
    }

    componentDidCatch(error: Error) {
        this.logError(error);
    }

    componentWillUnmount() {
        window.removeEventListener("unhandledrejection", this.promiseRejectionHandler);
    }

    private promiseRejectionHandler = (event: PromiseRejectionEvent) => {
        event.preventDefault();
        this.logError(event.reason);
    };

    // eslint-disable-next-line class-methods-use-this
    private logError(error: Error) {
        const logger = useService(Logger);
        const errorPlain = JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)));
        logger.error(errorPlain);
    }

    render() {
        const { children } = this.props;
        return children;
    }
}

export default App;
