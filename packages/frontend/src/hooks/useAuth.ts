import { useEffect, useState } from "react";
import { BasicBehaviorSubject } from "@/utils";

export const JWT_KEY = "AUTH_TOKEN" as const;
const authState = new BasicBehaviorSubject<string | null>(window.localStorage.getItem(JWT_KEY));

export function useAuth(): [boolean, (val: string | null) => void] {
    const [isAuthed, setIsAuthed] = useState(false);
    const setAuthToken = (jwt: string | null) => {
        if (jwt) {
            window.localStorage.setItem(JWT_KEY, jwt);
        } else {
            window.localStorage.removeItem(JWT_KEY);
        }
        authState.next(jwt);
    };

    useEffect(() => {
        const sub = authState.subscribe((val) => {
            setIsAuthed(!!val);
            return () => sub.unsubscribe();
        });
    }, []);

    return [isAuthed, setAuthToken];
}
