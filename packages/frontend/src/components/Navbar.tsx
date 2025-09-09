import { Link, useLocation } from "react-router";
import "@/styles/hamburgers.css";
import AnimateHeight from "react-animate-height";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks";
import { trpc } from "@/trpc";
import { SearchState, TruncatedSearchBar } from "./SearchBar";
import Logo from "@/assets/Logo.svg";
import DiscordLogo from "@/assets/Discord-Logo-White.svg";
import GithubLogo from "@/assets/github.svg";

const HIDE_SEARCH_BAR_ROUTES = ["/", "/search/name", "/search/class", "/search/department"];

export function Navbar() {
    const [mobileNavOpen, setMobileNav] = useState(false);
    const triggerMobileNav = () => setMobileNav(!mobileNavOpen);
    const { isAuthenticated, setIsAuthenticated } = useAuth();
    const location = useLocation();
    const [showInputBar, setShowInputBar] = useState(true);

    const { mutateAsync: logout } = trpc.auth.logout.useMutation({
        onSuccess: () => {
            setIsAuthenticated(false);
        },
    });

    const handleLogout = () => {
        logout();
    };

    useEffect(() => {
        const matchingRoute = HIDE_SEARCH_BAR_ROUTES.find((route) => location.pathname === route);
        setShowInputBar(!matchingRoute);
    }, [location]);

    const [searchState, setSearchState] = useState<SearchState>({ searchValue: "", type: "name" });

    return (
        <div
            className={`w-full ${
                isAuthenticated ? "bg-red-800" : "bg-cal-poly-green"
            } h-14 flex justify-between px-5 items-center`}
        >
            <a className="absolute w-px h-px z-[-1]" href="#main">
                Skip to main content
            </a>

            <Link to="/" onClick={() => setMobileNav(false)}>
                <img src={Logo} alt="Polyratings logo" className="h-8" />
            </Link>

            <button
                onClick={triggerMobileNav}
                aria-label="Open Navbar"
                className={`hamburger hamburger--slider block md:hidden  ${
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
                className="absolute top-12 left-0 bg-cal-poly-green w-full z-50 transform -translate-y-1"
            >
                <button
                    className="flex flex-col items-center w-full text-xl text-white"
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

            <div className="text-white hidden md:flex items-center text-lg font-semibold">
                {showInputBar && (
                    <div className="text-black mr-7 hidden lg:block">
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
                        className="w-9 opacity-80 hover:opacity-100 transition-all mr-7 hidden lg:block mt-[0.15rem]"
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
                        className="w-8 opacity-80 hover:opacity-100 transition-all mr-1 hidden lg:block"
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
                        onClick={handleLogout}
                        className="rounded-full border-white pl-3 pr-3 border-2 pt-px pb-px cursor-pointer"
                        type="button"
                    >
                        SIGN OUT
                    </button>
                )}
            </div>
        </div>
    );
}
