import { DEV_ENV } from "@backend/generated/tomlGenerated";
import { httpLink } from "@trpc/client";
import { JWT_KEY } from "./hooks";

export const REACT_MODAL_STYLES = {
    content: {
        padding: 0,
        display: "absolute",
        top: "50%",
        left: "50%",
        right: "unset",
        bottom: "unset",
        transform: "translate(-50%, -50%)",
    },
    overlay: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
    },
} as const;

export const trpcClientOptions = {
    links: [
        httpLink({
            // TODO: Change Back to config
            url: DEV_ENV.url,
            headers() {
                const jwt = window.localStorage.getItem(JWT_KEY);
                return {
                    authorization: jwt ? `Bearer ${jwt}` : "",
                };
            },
        }),
    ],
};
