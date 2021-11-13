import loginBackground from '../assets/home-header.webp'
import { NewTeacherForm } from '../components'
import { useProtectedRoute } from '../hooks'
export function NewTeacher() {
    // Redirect to homepage if in authenticated state
    useProtectedRoute(true, '/login', () => 'To add a teacher please sign in or create an account')
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