import { Link, useLocation } from "react-router";
import { useState, type MouseEvent } from "react";
import { MenuIcon, SearchIcon, XIcon } from "lucide-react";
import { useAuth } from "@/hooks";
import { cn } from "@/utils";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import Logo from "@/assets/Logo.svg";
import DiscordLogo from "@/assets/Discord-Logo-White.svg";
import GithubLogo from "@/assets/github.svg";
import { SearchState, TruncatedSearchBar } from "./SearchBar";
import { ThemeToggle } from "./ThemeToggle";

const HIDE_SEARCH_BAR_ROUTES = ["/", "/search/name", "/search/class", "/search/department"];

const mobileNavLinkClassName = cn(
    "flex min-h-11 w-full items-center justify-center rounded-md px-3 py-2",
    "text-lg font-semibold text-white",
    "hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
);

const headerIconButtonClassName = cn(
    "relative z-10 grid size-11 shrink-0 place-items-center rounded-md text-white",
    "hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2",
    "focus-visible:outline-white",
);

export function Navbar() {
    const [mobileNavOpen, setMobileNav] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const { isAuthenticated, setJwt } = useAuth();
    const location = useLocation();
    const showSearchChrome = !HIDE_SEARCH_BAR_ROUTES.includes(location.pathname);
    const [menuPath, setMenuPath] = useState(location.pathname);

    const [searchState, setSearchState] = useState<SearchState>({ searchValue: "", type: "name" });

    const closeMobileNav = () => setMobileNav(false);

    // Close overlay menus when the route changes (including browser back/forward).
    if (menuPath !== location.pathname) {
        setMenuPath(location.pathname);
        setSearchOpen(false);
        setMobileNav(false);
    }

    return (
        <header
            className={cn(
                "relative z-[60] flex h-14 w-full shrink-0 items-center gap-2 px-4 sm:gap-3 sm:px-5",
                "pt-[env(safe-area-inset-top)]",
                isAuthenticated ? "bg-red-800" : "bg-cal-poly-green",
            )}
        >
            <a
                href="#main"
                className={cn(
                    "sr-only z-50 rounded-md bg-white px-3 py-2 text-sm font-semibold",
                    "text-cal-poly-green shadow-md focus:not-sr-only focus:absolute focus:left-3",
                    "focus:top-2 focus:m-0 focus:outline-2 focus:outline-offset-2 focus:outline-white",
                )}
                onClick={skipToMainContent}
            >
                Skip to main content
            </a>

            <Link
                to="/"
                onClick={closeMobileNav}
                className="grid h-11 shrink-0 place-items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
                <img src={Logo} alt="Polyratings logo" className="h-8" />
            </Link>

            {showSearchChrome ? (
                <div className="mx-auto hidden min-w-0 flex-1 text-foreground xl:block xl:max-w-md">
                    <TruncatedSearchBar
                        fill
                        forceDropdown
                        value={searchState}
                        onChange={setSearchState}
                    />
                </div>
            ) : null}
            {/* Grow so the search icon / hamburger sit on the right below xl. */}
            <div className={cn("min-w-0 flex-1", showSearchChrome && "xl:hidden")} aria-hidden />

            {showSearchChrome ? (
                <Sheet
                    open={searchOpen}
                    onOpenChange={(open) => {
                        setSearchOpen(open);
                        if (open) {
                            setMobileNav(false);
                        }
                    }}
                >
                    <SheetTrigger asChild>
                        <button
                            type="button"
                            aria-label="Search professors"
                            aria-expanded={searchOpen}
                            className={cn(headerIconButtonClassName, "xl:hidden")}
                        >
                            <SearchIcon className="size-6" aria-hidden />
                        </button>
                    </SheetTrigger>
                    <SheetContent
                        side="top"
                        showCloseButton={false}
                        overlayClassName="top-14 bg-black/40 dark:bg-black/60"
                        className={cn(
                            "top-14 gap-3 border-none p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-foreground",
                            "data-[side=top]:top-14",
                            isAuthenticated ? "!bg-red-800" : "!bg-cal-poly-green",
                        )}
                    >
                        <SheetTitle className="text-base font-semibold text-white">
                            Search professors
                        </SheetTitle>
                        <SheetDescription className="sr-only">
                            Search for a professor by name
                        </SheetDescription>
                        <TruncatedSearchBar
                            fill
                            // No mobile suggestions until a full-screen search surface (keyboard conflict).
                            disableAutoComplete
                            placeholder="Search professors"
                            value={searchState}
                            onChange={setSearchState}
                        />
                    </SheetContent>
                </Sheet>
            ) : null}

            {/* modal=false keeps the header hamburger above the sheet; stronger overlay for dimming. */}
            <Sheet
                modal={false}
                open={mobileNavOpen}
                onOpenChange={(open) => {
                    setMobileNav(open);
                    if (open) {
                        setSearchOpen(false);
                    }
                }}
            >
                <SheetTrigger asChild>
                    <button
                        aria-label="Open Navbar"
                        aria-expanded={mobileNavOpen}
                        className={cn(headerIconButtonClassName, "md:hidden")}
                        type="button"
                    >
                        {mobileNavOpen ? (
                            <XIcon className="size-7" />
                        ) : (
                            <MenuIcon className="size-7" />
                        )}
                    </button>
                </SheetTrigger>
                <SheetContent
                    side="top"
                    showCloseButton={false}
                    overlayClassName="top-14 bg-black/40 dark:bg-black/60"
                    className={cn(
                        "top-14 gap-0 border-none p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-white",
                        "data-[side=top]:top-14",
                        isAuthenticated ? "!bg-red-800" : "!bg-cal-poly-green",
                    )}
                >
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <SheetDescription className="sr-only">Site navigation links</SheetDescription>
                    <nav className="flex flex-col items-stretch text-white">
                        <Link className={mobileNavLinkClassName} to="/" onClick={closeMobileNav}>
                            Home
                        </Link>
                        <Link
                            className={mobileNavLinkClassName}
                            to="/new-professor"
                            onClick={closeMobileNav}
                        >
                            Add a Professor
                        </Link>
                        <Link
                            className={mobileNavLinkClassName}
                            to="/search/name"
                            onClick={closeMobileNav}
                        >
                            Professor List
                        </Link>
                        <Link
                            className={mobileNavLinkClassName}
                            to="/about"
                            onClick={closeMobileNav}
                        >
                            About
                        </Link>
                        <Link className={mobileNavLinkClassName} to="/faq" onClick={closeMobileNav}>
                            FAQ
                        </Link>
                        {isAuthenticated && (
                            <Link
                                className={mobileNavLinkClassName}
                                to="/admin"
                                onClick={closeMobileNav}
                            >
                                Admin
                            </Link>
                        )}
                        <div className="flex justify-center py-1">
                            <ThemeToggle className="my-1" />
                        </div>
                        {isAuthenticated && (
                            <button
                                onClick={() => {
                                    setJwt(null);
                                    closeMobileNav();
                                }}
                                className={cn(mobileNavLinkClassName, "mt-2 border-2 border-white")}
                                type="button"
                            >
                                SIGN OUT
                            </button>
                        )}
                    </nav>
                </SheetContent>
            </Sheet>

            <div className="hidden shrink-0 items-center gap-x-5 text-lg font-semibold text-white md:flex">
                <Link to="/new-professor">Add a Professor</Link>
                <Link to="/search/name">Professor List</Link>
                <Link to="/about">About</Link>
                <Link to="/faq">FAQ</Link>
                <a
                    href="https://discord.gg/jD4mfMugYN"
                    target="_blank"
                    rel="noreferrer"
                    className="hidden 2xl:block"
                >
                    <img
                        src={DiscordLogo}
                        alt="Discord Link"
                        className="mt-[0.15rem] w-9 opacity-80 transition-all hover:opacity-100"
                    />
                </a>
                <a
                    href="https://github.com/Polyratings/polyratings"
                    target="_blank"
                    rel="noreferrer"
                    className="hidden 2xl:block"
                >
                    <img
                        src={GithubLogo}
                        alt="Github Link"
                        className="w-8 opacity-80 transition-all hover:opacity-100"
                    />
                </a>
                <ThemeToggle className="-mx-2" />
                {isAuthenticated && <Link to="/admin">Admin</Link>}
                {isAuthenticated && (
                    <button
                        onClick={() => setJwt(null)}
                        className="cursor-pointer rounded-full border-2 border-white pt-px pr-3 pb-px pl-3"
                        type="button"
                    >
                        SIGN OUT
                    </button>
                )}
            </div>
        </header>
    );
}

function skipToMainContent(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const main = document.getElementById("main");
    const scroller = document.getElementById("app-scroll");
    scroller?.scrollTo({ top: 0 });
    main?.focus({ preventScroll: true });
}
