import { useParams } from 'react-router-dom';
import confirmEmailBackground from '../assets/home-header.png'
import { useProtectedRoute } from '../hooks/useProtectedRoute';

export function ConfirmEmailCard() {
    // Redirect to homepage if in authenticated state
    useProtectedRoute(false, '/', (user) => `Welcome ${user.email.replace('@calpoly.edu','')}!`)

    let { cpUserName } = useParams<{cpUserName:string}>()
    return(
        <div className="h-screenWoNav flex justify-center items-center" style={{
            backgroundImage:`url(${confirmEmailBackground})`,
            backgroundRepeat:'no-repeat',
            backgroundPosition:'center',
            backgroundSize: 'cover'
            }}>
            <div className="p-5 transform -translate-y-1/4" style={{width:'500px'}}>
                <div className="bg-white shadow-lg rounded p-10" >
                    <h2 className="text-3xl font-bold mb-6">Confirm Your Email</h2>
                    <p>Thank You for registering. To ensure security please confirm your email by using the link sent to: {`${cpUserName}@calpoly.edu`}</p>
                </div>
            </div>
            
        </div>
    )
}