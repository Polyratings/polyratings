import { useEffect, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion(): boolean {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
        typeof window !== "undefined" ? window.matchMedia(REDUCED_MOTION_QUERY).matches : false,
    );

    useEffect(() => {
        const media = window.matchMedia(REDUCED_MOTION_QUERY);
        const sync = () => setPrefersReducedMotion(media.matches);
        sync();
        media.addEventListener("change", sync);
        return () => media.removeEventListener("change", sync);
    }, []);

    return prefersReducedMotion;
}
