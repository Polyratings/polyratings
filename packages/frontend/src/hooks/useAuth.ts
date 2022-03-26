import { AuthService } from "@/services";
import { useBasicBehaviorSubject } from "./useBasicBehaviorSubject";
import { useService } from "./useService";

export function useAuth() {
    const authService = useService(AuthService);
    const isAuthenticated = useBasicBehaviorSubject(authService.user$);
    return isAuthenticated;
}
