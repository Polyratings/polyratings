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
import { useEffect, useRef, useState } from 'react';
import { useBlock } from './hooks/useBlock';
import { useService } from './hooks';
import { TeacherService } from './services';

function App() {
  return(
    <BrowserRouter basename={config.base}>
      <ToastContainer />
      <Navbar />
      <RouteWrapper/>
  </BrowserRouter>
  )
}

function RouteWrapper() {
  const [preRenderData, setPreRenderData] = useState<any>()
  const [teacherService] = useService(TeacherService)

  // Can use to preload data for routes to give app an instant feeling
  useBlock(async location => {
    if(location.pathname.includes('/teacher/')) {
      const [,,teacherID] = location.pathname.split('/')
      const teacherData = await teacherService.getTeacher(teacherID) 
      setPreRenderData(teacherData)
    }
  })

  return(
    <Switch>
      <Route path="/teacher/:id" render={() => <Teacher teacherDataPreNavigation={preRenderData}/>} />
      <Route path="/search/:searchTerm" component={Search} />
      <Route path="/login" component={Login} />
      <Route path="/newTeacher" component={NewTeacher} />
      <Route path="/" component={Home} />
  </Switch>
  )
}



export default App
