import { useState } from "react";
import { useHistory } from "react-router";
import { Link } from "react-router-dom";
import loginBackground from '../assets/home-header.png'
import { useProtectedRoute } from "../hooks/useProtectedRoute";
import { useService } from "../hooks/useService";
import { AuthService } from "../services";

export function Register() {
    let [calPolyUsername, setCalPolyUsername] = useState('')
    let [password, setPassword] = useState('')
    let [confirmPassword, setConfirmPassword] = useState('')
    let [errorText, setErrorText] = useState('')
    let [authService] = useService(AuthService)
    let history = useHistory()

    //TODO: Toast on protected route
    const registerUser = async (event:React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if(password != confirmPassword) {
            setErrorText('Passwords do not match')
            return
        }

        try {
            await authService.register(calPolyUsername, password)
            history.push(`/confirmEmailCard/${encodeURIComponent(calPolyUsername)}`)
        } catch(e) {
            setErrorText(e as string)
        }
    }

    // Redirect to homepage if in authenticated state
    useProtectedRoute(false, '/', (user) => `Welcome ${user.email.replace('@calpoly.edu','')}!`)

    return(
        <div className="h-screenWoNav flex justify-center items-center" style={{
            backgroundImage:`url(${loginBackground})`,
            backgroundRepeat:'no-repeat',
            backgroundPosition:'center',
            backgroundSize: 'cover'
            }}>
            <div className="p-5 transform md:-translate-y-1/4" style={{width:'500px'}}>
                <div className="bg-white shadow-lg rounded p-10" >
                    <h2 className="text-3xl font-bold mb-6">Register</h2>
                    <form onSubmit={(e) => registerUser(e)}>
                        <h3 className="font-semibold">Cal Poly Username</h3>
                        <div className="h-10 mb-4 flex">
                            <input 
                                type="text" 
                                className="border-gray-300 border w-full rounded-l h-full pl-2"
                                value={calPolyUsername} 
                                onChange={e => setCalPolyUsername(e.target.value)}
                            />
                            <div className="bg-gray-400 rounded-r py-1 px-2 text-center flex items-center">
                                <div className="text-lg">@calpoly.edu</div>
                            </div>
                        </div>
                        
                        <h3 className="font-semibold">Password</h3>
                        <div className="mb-4">                            
                            <input 
                                type="password" 
                                className="h-10 border-gray-300 border w-full rounded"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>

                        <h3 className="font-semibold">Confirm Password</h3>
                        <div className="mb-8">                            
                            <input 
                                type="password" 
                                className="h-10 border-gray-300 border w-full rounded"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                            />
                            <p className="text-red-600">{errorText}</p>
                        </div>
                        <button className="w-full h-11 rounded bg-cal-poly-green text-white" type="submit" >Continue</button>
                        <div className="text-center mt-1">Already have an account? <Link to="/login" style={{ color: '#0000EE' }}>Login</Link></div>
                    </form>
                </div>
            </div>
            
        </div>
    )
}