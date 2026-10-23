import { createContext, useContext, useEffect, useState } from "react";

/** Keep in sync with the pre-paint script in index.html. */
export const THEME_STORAGE_KEY = "polyratings-theme" as const;

const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export type Theme = "light" | "dark";

function isTheme(value: string | null): value is Theme {
    return value === "light" || value === "dark";
}

/**
 * The OS setting seeds the first visit only. Once the toggle has been used the
 * stored value wins, so there is no separate "follow the system" mode.
 */
function readInitialTheme(): Theme {
    try {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (isTheme(stored)) {
            return stored;
        }
    } catch {
        // Private-mode localStorage access can throw; fall through to the OS.
    }
    return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
}

export type ThemeState = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeState>({
    theme: "light",
    setTheme: () => {},
    toggleTheme: () => {},
});

export function useTheme() {
    return useContext(ThemeContext);
}

// Used to hold the theme state that goes into the ThemeContext.
export function useThemeState(): ThemeState {
    const [theme, setThemeMemory] = useState(readInitialTheme);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle("dark", theme === "dark");
        // Mirrors the class so UA-rendered scrollbars and form controls follow.
        root.style.colorScheme = theme;
    }, [theme]);

    const setTheme = (next: Theme) => {
        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
            // Still applied for this session.
        }
        setThemeMemory(next);
    };

    return {
        theme,
        setTheme,
        toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
    };
}
