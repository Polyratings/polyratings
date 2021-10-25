import { useEffect } from "react"
import { useHistory } from "react-router-dom"
import { useAuth } from "./useAuth"

export function useProtectedRoute(authenticated:boolean, redirect:string) {
    // Redirect to home if logged in
    let isAuthenticated = useAuth()
    let history = useHistory()
    useEffect(() => {
        if(!isAuthenticated == authenticated) {
            history.replace(redirect)
        }
    },[isAuthenticated])
}