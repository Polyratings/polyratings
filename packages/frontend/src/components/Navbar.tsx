import { Link, useLocation } from "react-router";
import { useEffect, useState, type MouseEvent } from "react";
import { MenuIcon, XIcon } from "lucide-react";
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

export function Navbar() {
    const [mobileNavOpen, setMobileNav] = useState(false);
    const { isAuthenticated, setJwt } = useAuth();
    const location = useLocation();
    const [showInputBar, setShowInputBar] = useState(true);

    useEffect(() => {
        const matchingRoute = HIDE_SEARCH_BAR_ROUTES.find((route) => location.pathname === route);
        setShowInputBar(!matchingRoute);
    }, [location]);

    const [searchState, setSearchState] = useState<SearchState>({ searchValue: "", type: "name" });

    const closeMobileNav = () => setMobileNav(false);

    return (
        <header
            className={cn(
                "relative z-[60] flex h-14 w-full shrink-0 items-center justify-between px-5",
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

            <Link to="/" onClick={closeMobileNav}>
                <img src={Logo} alt="Polyratings logo" className="h-8" />
            </Link>

            <Sheet modal={false} open={mobileNavOpen} onOpenChange={setMobileNav}>
                <SheetTrigger asChild>
                    <button
                        aria-label="Open Navbar"
                        aria-expanded={mobileNavOpen}
                        className={cn(
                            "relative z-10 grid size-11 place-items-center rounded-md text-white md:hidden",
                            "hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2",
                            "focus-visible:outline-white",
                        )}
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
                    overlayClassName="top-14"
                    className={cn(
                        "top-14 gap-0 border-none p-4 text-white data-[side=top]:top-14",
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

            {showInputBar && (
                <div className="absolute left-1/2 hidden -translate-x-1/2 text-foreground xl:block">
                    <TruncatedSearchBar value={searchState} onChange={setSearchState} />
                </div>
            )}

            <div className="text-white hidden md:flex items-center gap-x-5 text-lg font-semibold">
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
                        className="w-9 opacity-80 hover:opacity-100 transition-all mt-[0.15rem]"
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
                        className="w-8 opacity-80 hover:opacity-100 transition-all"
                    />
                </a>
                <ThemeToggle className="-mx-2" />
                {isAuthenticated && <Link to="/admin">Admin</Link>}
                {isAuthenticated && (
                    <button
                        onClick={() => setJwt(null)}
                        className="rounded-full border-white pl-3 pr-3 border-2 pt-px pb-px cursor-pointer"
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
