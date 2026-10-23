import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

export type ParallaxMode = "exit" | "through";

export type UseParallaxOptions = {
    /**
     * `exit` (default): hero-style — layer only moves after the container's top leaves the
     * viewport. `through`: layer drifts for the whole time the section crosses the viewport
     * (needed for mid-page blocks like Best of the Best).
     */
    mode?: ParallaxMode;
};

/**
 * Moves `layerRef` slower than the page scroll so it reads as further away.
 *
 * The layer must be taller than its container by enough to cover the max translation for the
 * chosen mode and speed, otherwise edges show through.
 */
export function useParallax<
    TContainer extends HTMLElement = HTMLDivElement,
    TLayer extends HTMLElement = HTMLDivElement,
>(speed: number, options: UseParallaxOptions = {}) {
    const mode = options.mode ?? "exit";
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

            if (mode === "through") {
                // 0 when the section's top hits the bottom of the viewport; 1 when its bottom
                // clears the top — so the layer keeps moving the whole time it's on screen.
                const viewH = window.innerHeight;
                const travel = viewH + height;
                const progress = travel > 0 ? (viewH - top) / travel : 0;
                const clamped = Math.min(1, Math.max(0, progress));
                const range = height * speed;
                const offset = (clamped - 0.5) * 2 * range;
                layer.style.transform = `translate3d(0, ${offset}px, 0)`;
                return;
            }

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
    }, [mode, prefersReducedMotion, speed]);

    return { containerRef, layerRef };
}
