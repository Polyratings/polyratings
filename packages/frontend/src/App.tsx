import { Home, Teacher, Search, Login, NewTeacher } from './pages';
import {
  BrowserRouter,
  Switch,
  Route,
} from "react-router-dom";
import { Navbar } from './components';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import { config } from './App.config';

function App() {
  return(
    <BrowserRouter basename={config.base}>
      <ToastContainer />
      <Navbar />
      <Switch>
        <Route path="/teacher/:id" component={Teacher} />
        <Route path="/search/:searchTerm" component={Search} />
        <Route path="/login" component={Login} />
        <Route path="/newTeacher" component={NewTeacher} />
        <Route path="/" component={Home} />
    </Switch>
  </BrowserRouter>
  )
}

export default App
