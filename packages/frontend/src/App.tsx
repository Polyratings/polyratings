import { Home } from './pages/Home';
import {
  BrowserRouter,
  Switch,
  Route,
} from "react-router-dom";
import { Navbar } from './components/Navbar';
import { Teacher } from './pages/Teacher';
import { Search } from './pages/Search';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ConfirmEmailCard } from './pages/ConfirmEmailCard';
import { ConfirmEmail } from './pages/ConfrimEmail';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import { NewTeacher } from './pages/NewTeacher';
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
      <Route path="/register" component={Register} />
      <Route path="/confirmEmailCard/:cpUserName" component={ConfirmEmailCard} />
      <Route path="/confirmEmail/:userId/:otp" component={ConfirmEmail} />
      <Route path="/newTeacher" component={NewTeacher} />
      <Route path="/" component={Home} />
    </Switch>
  </BrowserRouter>
  )
}

export default App
