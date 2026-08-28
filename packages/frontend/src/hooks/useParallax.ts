import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Holds `layerRef` back by a fraction of the page's scroll while `containerRef` is leaving the top
 * of the viewport, so the layer drifts down relative to the content and reads as further away. The
 * layer must be taller than its container by at least `speed` of the container height in each
 * direction, otherwise the translation will expose an edge.
 */
export function useParallax<
    TContainer extends HTMLElement = HTMLDivElement,
    TLayer extends HTMLElement = HTMLDivElement,
>(speed: number) {
    const containerRef = useRef<TContainer>(null);
    const layerRef = useRef<TLayer>(null);
    const prefersReducedMotion = usePrefersReducedMotion();

    useEffect(() => {
        const layer = layerRef.current;
        if (!layer) {
            return undefined;
        }

        if (prefersReducedMotion) {
            layer.style.transform = "";
            return undefined;
        }

        let frame: number | null = null;

        const apply = () => {
            frame = null;
            const container = containerRef.current;
            if (!container) {
                return;
            }
            const { top, height } = container.getBoundingClientRect();
            const scrolled = Math.min(Math.max(-top, 0), height);
            layer.style.transform = `translate3d(0, ${scrolled * speed}px, 0)`;
        };

        const schedule = () => {
            frame ??= requestAnimationFrame(apply);
        };

        apply();
        // Scroll events do not bubble, and the app scrolls an inner container rather than the
        // window, so listen during the capture phase to catch whichever element actually scrolls.
        window.addEventListener("scroll", schedule, { capture: true, passive: true });
        window.addEventListener("resize", schedule);

        return () => {
            if (frame !== null) {
                cancelAnimationFrame(frame);
            }
            window.removeEventListener("scroll", schedule, { capture: true });
            window.removeEventListener("resize", schedule);
        };
    }, [prefersReducedMotion, speed]);

    return { containerRef, layerRef };
}
