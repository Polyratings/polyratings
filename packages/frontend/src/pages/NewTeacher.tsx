import loginBackground from '../assets/home-header.png'
import { NewTeacherForm } from '../components/NewTeacherForm'
export function NewTeacher() {
    return(
        <div>            
            <div className="h-screenWoNav justify-center items-center hidden sm:flex" style={{
                backgroundImage:`url(${loginBackground})`,
                backgroundRepeat:'no-repeat',
                backgroundPosition:'center',
                backgroundSize: 'cover'
            }}>
                <div className="shadow">
                    <NewTeacherForm/>
                </div>
            </div>
            <div className="sm:hidden flex justify-center bg-gray-300 min-h-screenWoNav">
                <NewTeacherForm/>
            </div>
        </div>
    )
}