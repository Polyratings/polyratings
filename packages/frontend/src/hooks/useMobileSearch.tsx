import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
    type ReactNode,
    type RefObject,
} from "react";
import type { SearchState } from "@/components/SearchBar";

interface CloseSearchOptions {
    /** Clear the shared query (navbar off-home dismiss). */
    clear?: boolean;
}

interface MobileSearchContextValue {
    open: boolean;
    /** Prefer closeSearch / openSearch so clear + focus restore stay consistent. */
    setOpen: (open: boolean) => void;
    /** Reveals the always-mounted panel and focuses its input in the same tap (iOS keyboard). */
    openSearch: (opener?: HTMLElement | null) => void;
    /** Closes the panel, restores opener focus, optionally clears the query. */
    closeSearch: (options?: CloseSearchOptions) => void;
    value: SearchState;
    setValue: (value: SearchState) => void;
    inputRef: RefObject<HTMLInputElement>;
    panelRef: RefObject<HTMLDivElement>;
}

const MobileSearchContext = createContext<MobileSearchContextValue | null>(null);

const EMPTY_SEARCH: SearchState = { searchValue: "", type: "name" };

function revealPanel(panel: HTMLDivElement) {
    // Imperative paint before React re-renders — avoids flushSync lag on open.
    panel.classList.remove("opacity-0", "pointer-events-none");
    panel.classList.add("opacity-100", "pointer-events-auto");
    panel.removeAttribute("aria-hidden");
    // Must clear before focus — inert blocks iOS keyboard open.
    panel.inert = false;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
}

export function MobileSearchProvider({ children }: { children: ReactNode }) {
    const [open, setOpenState] = useState(false);
    const [value, setValue] = useState<SearchState>(EMPTY_SEARCH);
    const inputRef = useRef<HTMLInputElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const openerRef = useRef<HTMLElement | null>(null);

    const closeSearch = useCallback((options?: CloseSearchOptions) => {
        inputRef.current?.blur();
        setOpenState(false);
        if (options?.clear) {
            setValue(EMPTY_SEARCH);
        }
        const opener = openerRef.current;
        openerRef.current = null;
        // After React applies inert on the panel, return focus to the control that opened it.
        window.queueMicrotask(() => {
            opener?.focus({ preventScroll: true });
        });
    }, []);

    const openSearch = useCallback((opener?: HTMLElement | null) => {
        if (opener) {
            openerRef.current = opener;
        }
        const panel = panelRef.current;
        if (panel) {
            revealPanel(panel);
        }
        // Focus in the same tap stack; do not flushSync — that blocked the main
        // thread on a full React commit before the keyboard could start.
        inputRef.current?.focus({ preventScroll: true });
        setOpenState(true);
    }, []);

    const setOpen = useCallback(
        (next: boolean) => {
            if (next) {
                openSearch();
            } else {
                closeSearch();
            }
        },
        [closeSearch, openSearch],
    );

    const contextValue = useMemo(
        () => ({
            open,
            setOpen,
            openSearch,
            closeSearch,
            value,
            setValue,
            inputRef,
            panelRef,
        }),
        [open, openSearch, closeSearch, setOpen, value],
    );

    return (
        <MobileSearchContext.Provider value={contextValue}>{children}</MobileSearchContext.Provider>
    );
}

export function useMobileSearch() {
    const context = useContext(MobileSearchContext);
    if (!context) {
        throw new Error("useMobileSearch must be used within MobileSearchProvider");
    }
    return context;
}
