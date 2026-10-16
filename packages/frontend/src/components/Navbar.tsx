import { Link, useLocation } from "react-router";
import "@/styles/hamburgers.css";
import AnimateHeight from "react-animate-height";
import { useState } from "react";
import { useAuth } from "@/hooks";
import { SearchState, TruncatedSearchBar } from "./SearchBar";
import Logo from "@/assets/Logo.svg";
import DiscordLogo from "@/assets/Discord-Logo-White.svg";
import GithubLogo from "@/assets/github.svg";

const HIDE_SEARCH_BAR_ROUTES = ["/", "/search/name", "/search/class", "/search/department"];

export function Navbar() {
    const [mobileNavOpen, setMobileNav] = useState(false);
    const triggerMobileNav = () => setMobileNav(!mobileNavOpen);
    const { isAuthenticated, setJwt } = useAuth();
    const location = useLocation();
    const showInputBar = !HIDE_SEARCH_BAR_ROUTES.some((route) => location.pathname === route);

    const [searchState, setSearchState] = useState<SearchState>({ searchValue: "", type: "name" });

    return (
        <div
            className={`w-full ${
                isAuthenticated ? "bg-red-800" : "bg-cal-poly-green"
            } flex h-14 items-center justify-between px-5`}
        >
            <a className="absolute z-[-1] h-px w-px" href="#main">
                Skip to main content
            </a>

            <Link to="/" onClick={() => setMobileNav(false)}>
                <img src={Logo} alt="Polyratings logo" className="h-8" />
            </Link>

            <button
                onClick={triggerMobileNav}
                aria-label="Open Navbar"
                className={`hamburger hamburger--slider block md:hidden ${
                    mobileNavOpen ? "is-active hamburgerTurn" : ""
                }`}
                type="button"
            >
                <div className="hamburger-box">
                    <div className="hamburger-inner bg-white" />
                </div>
            </button>

            {/* Mobile hamburger dropdown */}
            <AnimateHeight
                duration={500}
                height={mobileNavOpen ? "auto" : 0}
                className="absolute top-12 left-0 z-50 w-full -translate-y-1 transform bg-cal-poly-green"
            >
                <button
                    className="flex w-full flex-col items-center text-xl text-white"
                    onClick={triggerMobileNav}
                    type="button"
                >
                    <Link className="my-1" to="/">
                        Home
                    </Link>
                    <Link className="my-1" to="/new-professor">
                        {" "}
                        Add a Professor
                    </Link>
                    <Link className="my-1" to="/search/name">
                        Professor List
                    </Link>
                    <Link className="my-1" to="/about">
                        About
                    </Link>
                    <Link className="my-1" to="/faq">
                        FAQ
                    </Link>
                </button>
            </AnimateHeight>

            <div className="hidden items-center text-lg font-semibold text-white md:flex">
                {showInputBar && (
                    <div className="mr-7 hidden text-black lg:block">
                        <TruncatedSearchBar value={searchState} onChange={setSearchState} />
                    </div>
                )}

                <Link className="mr-7" to="/new-professor">
                    {" "}
                    Add a Professor
                </Link>
                <Link className="mr-7" to="/search/name">
                    {" "}
                    Professor List
                </Link>
                <Link className="mr-7" to="/about">
                    {" "}
                    About
                </Link>
                <Link className="mr-7" to="/faq">
                    {" "}
                    FAQ
                </Link>
                <a href="https://discord.gg/jD4mfMugYN" target="_blank" rel="noreferrer">
                    <img
                        src={DiscordLogo}
                        alt="Discord Link"
                        className="mt-[0.15rem] mr-7 hidden w-9 opacity-80 transition-all hover:opacity-100 lg:block"
                    />
                </a>
                <a
                    href="https://github.com/Polyratings/polyratings"
                    target="_blank"
                    rel="noreferrer"
                >
                    <img
                        src={GithubLogo}
                        alt="Github Link"
                        className="mr-1 hidden w-8 opacity-80 transition-all hover:opacity-100 lg:block"
                    />
                </a>
                {isAuthenticated && (
                    <Link className="mr-7" to="/admin">
                        {" "}
                        Admin
                    </Link>
                )}
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
        </div>
    );
}
