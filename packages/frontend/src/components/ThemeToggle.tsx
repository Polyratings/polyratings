import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "@/hooks";
import { cn } from "@/utils";

export type ThemeToggleProps = {
    className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
    const { theme, toggleTheme } = useTheme();
    // Icon and label both describe the theme the click switches to.
    const target = theme === "dark" ? "light" : "dark";
    const Icon = target === "dark" ? MoonIcon : SunIcon;

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${target} theme`}
            title={`Switch to ${target} theme`}
            className={cn(
                "grid size-10 shrink-0 cursor-pointer place-items-center rounded-md",
                "text-white transition-colors hover:bg-white/15",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                className,
            )}
        >
            <Icon aria-hidden className="size-5" />
        </button>
    );
}
