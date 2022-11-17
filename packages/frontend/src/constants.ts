import { httpLink } from "@trpc/client";
import { config } from "./App.config";

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

export const trpcClientOptions = (jwt: string | null) => ({
    links: [
        httpLink({
            url: config.clientEnv.url,
            headers() {
                return {
                    authorization: jwt ? `Bearer ${jwt}` : "",
                };
            },
        }),
    ],
});
