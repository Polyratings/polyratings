import { Router, Switch, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { createBrowserHistory } from 'history'
import ReactGA from 'react-ga4';
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
    ReactGA.send({ hitType: 'pageview', page: location.pathname + location.search})
  })
  return (
    <Router history={history}>
      <ToastContainer />
      <Navbar />
      <Switch>
        {/* Set key to Date.now() to refresh each time Link is triggered */}
        <Route path="/teacher/:id"  render={() => <Teacher key={Date.now()}/>} />
        <Route path="/search/:searchType" render={({location}) => <Search location={location} key={Date.now()}/>} />
        <Route path="/login" render={() => <Login key={Date.now()}/>} />
        <Route path="/newTeacher"  render={() => <NewTeacher key={Date.now()}/>} />
        <Route path="/about"  render={() => <About key={Date.now()}/>} />
        <Route path="/"  render={() => <Home key={Date.now()}/>} />
      </Switch>
    </Router>
  );
}

export default App;
