import { BrowserRouter, Switch, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { Home, Teacher, Search, Login, NewTeacher, About } from './pages';
import { Navbar } from './components';
import 'react-toastify/dist/ReactToastify.css';
import { config } from './App.config';

function App() {
  return (
    <BrowserRouter basename={config.base}>
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
    </BrowserRouter>
  );
}

export default App;
