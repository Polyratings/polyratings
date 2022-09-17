import { Link, useLocation } from "react-router-dom";
import "@/styles/hamburgers.css";
import AnimateHeight from "react-animate-height";
import { useEffect, useState } from "react";
import { AuthService } from "@/services";
import { useService, useAuth } from "@/hooks";
import { SearchBar } from "./SearchBar";
import Logo from "@/assets/Logo.png";
import DiscordLogo from "@/assets/Discord-Logo-White.svg";
import GithubLogo from "@/assets/github.svg";

const HIDE_SEARCH_BAR_ROUTES = [
    "/",
    "/search",
    "/search/name",
    "/search/class",
    "/search/department",
];

export function Navbar() {
    const [mobileNavOpen, setMobileNav] = useState(false);
    const triggerMobileNav = () => setMobileNav(!mobileNavOpen);
    const isAuthenticated = useAuth();
    const authService = useService(AuthService);
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
            } h-12 flex justify-between px-5 items-center`}
        >
            <Link to="/" onClick={() => setMobileNav(false)}>
                <img src={Logo} alt="Polyratings logo" className="h-8" />
            </Link>

            <div
                onClick={triggerMobileNav}
                className={`hamburger hamburger--slider block md:hidden  ${
                    mobileNavOpen ? "is-active hamburgerTurn" : ""
                }`}
            >
                <div className="hamburger-box">
                    <div className="hamburger-inner bg-white" />
                </div>
            </div>

            {/* Mobile hamburger dropdown */}
            <AnimateHeight
                duration={500}
                height={mobileNavOpen ? "auto" : 0}
                className="absolute top-12 left-0 bg-cal-poly-green w-full z-50 transform -translate-y-1"
            >
                <div className="flex flex-col text-center text-xl text-white">
                    <Link className="my-1" to="/" onClick={triggerMobileNav}>
                        Home
                    </Link>
                    <Link className="my-1" to="/new-teacher" onClick={triggerMobileNav}>
                        Add a Professor
                    </Link>
                    <Link className="my-1" to="/search" onClick={triggerMobileNav}>
                        Professor List
                    </Link>
                    <Link className="my-1" to="/about" onClick={triggerMobileNav}>
                        About
                    </Link>
                    <Link className="my-1" to="/faq" onClick={triggerMobileNav}>
                        FAQ
                    </Link>
                    {/* <Link className="mr-7" to="contact">Contact</Link> */}
                    {isAuthenticated && (
                        <div
                            className="my-1"
                            onClick={() => {
                                authService.signOut();
                                triggerMobileNav();
                            }}
                        >
                            Sign Out
                        </div>
                    )}
                </div>
            </AnimateHeight>

            <div className="text-white hidden md:flex items-center text-lg font-semibold">
                {showInputBar && (
                    <div className="text-black mr-7 hidden lg:block">
                        <SearchBar showOnlyInput={false} />
                    </div>
                )}

                <Link className="mr-7" to="/new-teacher">
                    {" "}
                    Add a Professor
                </Link>
                <Link className="mr-7" to="/search">
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
                    <div
                        onClick={() => authService.signOut()}
                        className="rounded-full border-white pl-3 pr-3 border-2 pt-px pb-px cursor-pointer"
                    >
                        SIGN OUT
                    </div>
                )}
            </div>
        </div>
    );
}
