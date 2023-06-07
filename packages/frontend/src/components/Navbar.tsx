import { Link, useLocation } from "react-router-dom";
import "@/styles/hamburgers.css";
import AnimateHeight from "react-animate-height";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks";
import Logo from "@/assets/Logo.svg";
import DiscordLogo from "@/assets/Discord-Logo-White.svg";
import GithubLogo from "@/assets/github.svg";
import { SearchBar } from "./SearchBar";

const HIDE_SEARCH_BAR_ROUTES = ["/", "/search/name", "/search/class", "/search/department"];

export function Navbar() {
    const [mobileNavOpen, setMobileNav] = useState(false);
    const triggerMobileNav = () => setMobileNav(!mobileNavOpen);
    const { isAuthenticated, setJwt } = useAuth();
    const location = useLocation();
    const [showInputBar, setShowInputBar] = useState(true);

    useEffect(() => {
        const matchingRoute = HIDE_SEARCH_BAR_ROUTES.find((route) => location.pathname === route);
        setShowInputBar(!matchingRoute);
    }, [location]);

    return (
        <div
            className={`w-full ${
                isAuthenticated ? "bg-red-800" : "bg-cal-poly-green"
            } flex h-12 items-center justify-between px-5`}
        >
            <a className="absolute z-[-1] h-[1px] w-[1px]" href="#main">
                Skip to main content
            </a>

            <Link to="/" onClick={() => setMobileNav(false)}>
                <img src={Logo} alt="Polyratings logo" className="h-8" />
            </Link>

            <button
                onClick={triggerMobileNav}
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
                className="bg-cal-poly-green absolute left-0 top-12 z-50 w-full -translate-y-1"
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
                        <SearchBar showOnlyInput={false} />
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
                        className="mr-7 mt-[0.15rem] hidden w-9 opacity-80 transition-all hover:opacity-100 lg:block"
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
                        className="cursor-pointer rounded-full border-2 border-white px-3 py-px"
                        type="button"
                    >
                        SIGN OUT
                    </button>
                )}
            </div>
        </div>
    );
}
