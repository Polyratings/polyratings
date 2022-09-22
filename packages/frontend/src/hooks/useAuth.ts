import jwtDecode from "jwt-decode";
import { createContext, useContext } from "react";

export const JWT_KEY = "AUTH_TOKEN" as const;

export function useAuth(): [boolean, (val: string | null) => void] {
    const { jwt, setJwt } = useContext(AuthContext);

    return [!!jwt, setJwt];
}

export function setJwtWrapper(fn: (incomingJwt: string | null) => void) {
    return (incomingJwt: string | null) => {
        if (incomingJwt) {
            window.localStorage.setItem(JWT_KEY, incomingJwt);
        } else {
            window.localStorage.removeItem(JWT_KEY);
        }
        fn(incomingJwt);
    };
}

export function loadStoredJwt() {
    const storedJwt = window.localStorage.getItem(JWT_KEY);
    if (storedJwt) {
        const user: { exp: number } = jwtDecode(storedJwt);
        if (user.exp * 1000 < Date.now()) {
            return storedJwt;
        }
    }
    return null;
}

export const AuthContext = createContext<{
    jwt: string | null;
    setJwt: (jwt: string | null) => void;
}>({ jwt: null, setJwt: () => {} });
