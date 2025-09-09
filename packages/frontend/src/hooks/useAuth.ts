import { createContext, useContext, useState, useCallback } from "react";

export function useAuth() {
    const { isAuthenticated, setIsAuthenticated } = useContext(AuthContext);

    return { isAuthenticated, setIsAuthenticated };
}

export const AuthContext = createContext<{
    isAuthenticated: boolean;
    setIsAuthenticated: (isAuthenticated: boolean) => void;
}>({ isAuthenticated: false, setIsAuthenticated: () => {} });

// Used to hold authState that goes into the authContext
export function useAuthState() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const handleSetAuthenticated = useCallback((value: boolean) => {
        setIsAuthenticated(value);
    }, []);

    return {
        isAuthenticated,
        setIsAuthenticated: handleSetAuthenticated,
    };
}
