import { useEffect, useState } from "react"
import { useHistory, useParams } from "react-router"
import { toast } from "react-toastify"
import { useService } from "../hooks/useService"
import { AuthService } from "../services"

export function ConfirmEmail() {
    const { otp, userId } = useParams<{userId:string ,otp:string}>()
    let [authService] = useService(AuthService)
    let [errorMessage, setErrorMessage] = useState('')
    let history = useHistory()
    useEffect(() => {
        const confirmEmail = async () => {
            try {
                await authService.confirmEmail(userId, otp)
                toast.success('Thank you for confirming your email')
                history.replace('/')
            } catch(e) {
                setErrorMessage(e as string)
            }
        }
        confirmEmail()
    })   
    return(
        <div>{errorMessage}</div>
    )
}