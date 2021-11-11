import { useEffect } from "react"
import { useHistory } from "react-router-dom"
import { toast } from "react-toastify"
import { User } from "@polyratings-revamp/shared"
import { useAuth } from "./useAuth"

export function useProtectedRoute<B extends boolean>(authenticated:B, redirect:string, toastMessage?:(user: B extends false ? User : null) => string) {
    // Redirect to home if logged in
    let user = useAuth()
    let history = useHistory()
    useEffect(() => {
        if(authenticated == !user) {
            if(toastMessage) {
                toast.info(toastMessage(user as any))
            }
            history.replace(redirect)
        }
    },[user])
}