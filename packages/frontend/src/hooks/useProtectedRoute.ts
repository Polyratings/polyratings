import { useEffect } from "react";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import { UserToken } from "@polyratings/client";
import { useAuth } from "./useAuth";

export function useProtectedRoute<B extends boolean>(
    authenticated: B,
    redirect: string,
    toastMessage?: (user: B extends false ? UserToken : null) => string,
) {
    // Redirect to home if logged in
    const user = useAuth();
    const history = useHistory();
    useEffect(() => {
        if (authenticated === !user) {
            if (toastMessage) {
                // Typescript can not properly deduce that the type has to be User
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                toast.info(toastMessage(user as any));
            }
            history.replace(redirect);
        }
    }, [user]);
}
