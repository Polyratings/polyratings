import { Router, Switch, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { createBrowserHistory } from 'history'
import ReactGA from 'react-ga';
import { useEffect } from 'react';
import { Home, Teacher, Search, Login, NewTeacher, About } from './pages';
import { Navbar } from './components';
import 'react-toastify/dist/ReactToastify.css';
import { config } from './App.config';

function App() {
  useEffect(() => {
    ReactGA.initialize('G-784BKPF31W')
  }, [])

  const history = createBrowserHistory({basename:config.base})
  history.listen((location) => {
    ReactGA.pageview(location.pathname + location.search)
  })
  return (
    <Router history={history}>
      <ToastContainer />
      <Navbar />
      <Switch>
        <Route path="/teacher/:id" component={Teacher} />
        <Route path="/search/:searchType" component={Search} />
        <Route path="/login" component={Login} />
        <Route path="/newTeacher" component={NewTeacher} />
        <Route path="/about" component={About} />
        <Route path="/" component={Home} />
      </Switch>
    </Router>
  );
}

export default App;
