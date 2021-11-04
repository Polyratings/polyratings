import { useObservable } from "./useObservable";
import { AuthService } from "../services";
import { useService } from "./useService";

export function useAuth() {
    let [authService] = useService(AuthService)
    let isAuthenticated = useObservable(authService.isAuthenticatedSubject, authService.getUser())
    return isAuthenticated
}