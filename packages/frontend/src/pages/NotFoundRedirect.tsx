import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { toast } from "react-toastify";

const REDIRECT_DELAY_SECONDS = 3;
const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

type NotFoundRedirectVariant = "page" | "professor";

const MESSAGES: Record<NotFoundRedirectVariant, { title: string; toast: string }> = {
    page: {
        title: "Page not found",
        toast: "Page not found. Returning to the home page.",
    },
    professor: {
        title: "Professor not found",
        toast: "Professor not found. Returning to the home page.",
    },
};

function getIsMobileViewport() {
    return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

interface NotFoundRedirectProps {
    variant?: NotFoundRedirectVariant;
}

export function NotFoundRedirect({ variant = "page" }: NotFoundRedirectProps) {
    const { title, toast: toastMessage } = MESSAGES[variant];
    const [isMobile, setIsMobile] = useState(getIsMobileViewport);
    const [secondsRemaining, setSecondsRemaining] = useState(REDIRECT_DELAY_SECONDS);
    const [shouldRedirectHome, setShouldRedirectHome] = useState(() => !getIsMobileViewport());

    useEffect(() => {
        const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
        const handleChange = () => setIsMobile(mediaQuery.matches);
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    useEffect(() => {
        if (!isMobile) {
            toast.info(toastMessage);
        }
    }, [isMobile, toastMessage]);

    useEffect(() => {
        if (!isMobile) {
            return undefined;
        }

        const tickInterval = window.setInterval(() => {
            setSecondsRemaining((current) => Math.max(current - 1, 0));
        }, 1000);

        const redirectTimeout = window.setTimeout(() => {
            setShouldRedirectHome(true);
        }, REDIRECT_DELAY_SECONDS * 1000);

        return () => {
            window.clearInterval(tickInterval);
            window.clearTimeout(redirectTimeout);
        };
    }, [isMobile]);

    if (shouldRedirectHome) {
        return <Navigate to="/" replace />;
    }

    return (
        <main className="flex flex-col items-center justify-center min-h-screen-wo-nav px-6 text-center">
            <h1 className="text-4xl font-semibold text-cal-poly-green mb-4">{title}</h1>
            <p className="sr-only">
                We will redirect you to the home page in {REDIRECT_DELAY_SECONDS} seconds.
            </p>
            <p className="text-lg text-gray-700">
                We&apos;ll redirect you to the home page in {secondsRemaining}{" "}
                {secondsRemaining === 1 ? "second" : "seconds"}.
            </p>
        </main>
    );
}
