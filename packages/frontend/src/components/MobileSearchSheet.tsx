import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utils";
import { useMobileSearch } from "@/hooks";
import { FullScreenSearch, type SearchState } from "./SearchBar";

export interface MobileSearchSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    value: SearchState;
    onChange: (value: SearchState) => void;
    /** Optional control that opens search (e.g. navbar icon). */
    trigger?: ReactNode;
}

/**
 * Full-bleed search under the masthead. Panel stays mounted (opacity-hidden + inert
 * when closed) so the first tap can focus an existing input — required for iOS keyboard.
 * Extends to bottom:0 (layout viewport) so the blanket never gaps when the keyboard opens;
 * interactive-widget=resizes-content shrinks that viewport where the browser supports it.
 */
export function MobileSearchSheet({
    open,
    onOpenChange,
    value,
    onChange,
    trigger,
}: MobileSearchSheetProps) {
    const titleId = useId();
    const descriptionId = useId();
    const { inputRef, panelRef } = useMobileSearch();
    const onOpenChangeRef = useRef(onOpenChange);

    useEffect(() => {
        onOpenChangeRef.current = onOpenChange;
    }, [onOpenChange]);

    // Scroll lock + Escape. Depend only on `open` so typing does not thrash the lock.
    useEffect(() => {
        if (!open) {
            return;
        }
        const scroller = document.getElementById("app-scroll");
        const previousOverflow = scroller?.style.overflow ?? "";
        const previouslyInert = scroller?.inert ?? false;
        if (scroller) {
            scroller.style.overflow = "hidden";
            // Keep Tab out of page content under the opaque panel (aria-modal contract).
            scroller.inert = true;
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onOpenChangeRef.current(false);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => {
            if (scroller) {
                scroller.style.overflow = previousOverflow;
                scroller.inert = previouslyInert;
            }
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    const panel =
        typeof document !== "undefined"
            ? createPortal(
                  <div
                      ref={panelRef}
                      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- fixed overlay; native dialog UA shrink-wrap breaks the blanket
                      role={open ? "dialog" : undefined}
                      aria-modal={open ? true : undefined}
                      data-slot="mobile-search"
                      aria-hidden={!open}
                      // React 18 treats `inert` as a custom attr; omit when open.
                      {...(!open ? { inert: "" } : {})}
                      aria-labelledby={open ? titleId : undefined}
                      aria-describedby={open ? descriptionId : undefined}
                      className={cn(
                          // Under the masthead (h-14 / z-60). opacity (not display/visibility)
                          // keeps the node mounted; inert removes it from the tab order when closed.
                          // openSearch reveals classes + clears inert imperatively for zero lag.
                          "fixed top-14 right-0 bottom-0 left-0 z-[55] flex flex-col",
                          "bg-background text-foreground",
                          "pb-[env(safe-area-inset-bottom)]",
                          open
                              ? "pointer-events-auto opacity-100"
                              : "pointer-events-none opacity-0",
                      )}
                  >
                      <h2 id={titleId} className="sr-only">
                          Search professors
                      </h2>
                      <p id={descriptionId} className="sr-only">
                          Search for a professor by name. Suggestions update as you type.
                      </p>
                      <FullScreenSearch
                          value={value}
                          onChange={onChange}
                          inputRef={inputRef}
                          className="min-h-0 flex-1"
                      />
                  </div>,
                  document.body,
              )
            : null;

    return (
        <>
            {trigger}
            {panel}
        </>
    );
}
