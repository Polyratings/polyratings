import jwtDecode from "jwt-decode";
import { createContext, useContext, useEffect, useState } from "react";

export const JWT_KEY = "AUTH_TOKEN" as const;

export function useAuth() {
    const { jwt, setJwt } = useContext(AuthContext);

    return { isAuthenticated: !!jwt, jwt, setJwt };
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
    const storedJwt = globalThis.localStorage?.getItem(JWT_KEY);
    if (storedJwt) {
        const user: { exp: number } = jwtDecode(storedJwt);
        if (user.exp * 1000 > Date.now()) {
            return { storedJwt, user };
        }
    }
    return { storedJwt: null, user: null };
}

export const AuthContext = createContext<{
    jwt: string | null;
    setJwt: (jwt: string | null) => void;
}>({ jwt: null, setJwt: () => {} });

// Used to hold authState that goes into the authContext
export function useAuthState() {
    const { storedJwt, user } = loadStoredJwt();
    const [jwt, setJwtMemory] = useState(storedJwt);
    const setJwt = setJwtWrapper(setJwtMemory);

    // eslint-disable-next-line consistent-return
    useEffect(() => {
        if (user) {
            const timer = setTimeout(() => {
                setJwt(null);
            }, user.exp * 1000 - Date.now());
            return () => clearTimeout(timer);
        }
    }, [user]);

    return {
        jwt,
        setJwt,
    };
}
