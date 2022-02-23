import { AuthService } from "@/services";
import { useService, useObservable } from ".";

export function useAuth() {
    const authService = useService(AuthService);
    const isAuthenticated = useObservable(
        authService.isAuthenticatedSubject,
        authService.getUser(),
    );
    return isAuthenticated;
}
