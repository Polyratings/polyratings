import { Link, useLocation } from "react-router-dom"
import Logo from '../assets/Logo.png'
import '../styles/hamburgers.css'
import AnimateHeight from 'react-animate-height';
import { useEffect, useState } from "react";
import { AuthService } from "../services";
import { useService, useAuth } from "../hooks";
import { SearchBar } from "./SearchBar";

const HIDE_SEARCH_BAR_ROUTES = ['/', '/search/name', '/search/class', '/search/department']

export function Navbar() {
    let [mobileNavOpen, setMobileNav] = useState(false)
    const triggerMobileNav = () => setMobileNav(!mobileNavOpen)
    let isAuthenticated = useAuth()
    const [authService] = useService(AuthService)
    const location = useLocation()
    const [showInputBar, setShowInputBar] = useState(true)
    
    useEffect(() => {
        const matchingRoute = HIDE_SEARCH_BAR_ROUTES.find(route => location.pathname == route)
        setShowInputBar(!matchingRoute)
    }, [location])

    return (
        <div className="w-screen bg-cal-poly-green h-12 flex justify-between px-5 items-center">
            <Link to="/" onClick={() => setMobileNav(false)}>
                <img src={Logo} alt="Polyratings logo" className="h-8"/>
            </Link>


            <div 
                onClick={triggerMobileNav} 
                className={`hamburger hamburger--slider block md:hidden  ${mobileNavOpen ? 'is-active hamburgerTurn' : ''}`}
            >
                <div className="hamburger-box">
                    <div className="hamburger-inner bg-white"></div>
                </div>
            </div>

            {/* Mobile hamburger dropdown */}
            <AnimateHeight duration={500} height={mobileNavOpen ? 'auto' : 0} className="absolute top-12 left-0 bg-cal-poly-green w-full z-50 transform -translate-y-1">
                <div className="flex flex-col text-center text-xl text-white">
                    <Link className="my-1" to="/" onClick={triggerMobileNav} >Home</Link>
                    <Link className="my-1" to="/newTeacher" onClick={triggerMobileNav}> Add a Teacher</Link>
                    <Link className="my-1" to="/search/name" onClick={triggerMobileNav} >Professor List</Link>
                    {/* <Link className="mr-7" to="contact">Contact</Link> */}
                    {isAuthenticated &&
                        <div 
                            className="my-1" 
                            onClick={() => {
                                authService.signOut()
                                triggerMobileNav()
                            }} 
                        >
                            Sign Out
                        </div>
                    }
                </div>
            </AnimateHeight>

            <div className="text-white hidden md:flex items-center text-lg font-semibold">
                {showInputBar && 
                    <div className="text-black mr-7">
                        <SearchBar showOnlyInput={false}/>
                    </div>
                }
                
                <Link className="mr-7" to="/newTeacher"> Add a Teacher</Link>
                <Link className="mr-7" to="/search/name"> Professor List</Link>
                {/* <Link className="mr-7" to="contact">Contact</Link> */}
                {isAuthenticated &&
                <div onClick={() => authService.signOut()} className="rounded-full border-white pl-3 pr-3 border-2 pt-px pb-px cursor-pointer">SIGN OUT</div>
                }
            </div>
        </div>
    )
}