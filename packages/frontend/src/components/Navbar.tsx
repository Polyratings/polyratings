import { Link } from "react-router-dom"
import Logo from '../assets/Logo.png'
import '../styles/hamburgers.css'
import AnimateHeight from 'react-animate-height';
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { AuthService } from "../services";
import { useService } from "../hooks/useService";

export function Navbar() {
    let [mobileNavOpen, setMobileNav] = useState(false)
    const triggerMobileNav = () => setMobileNav(!mobileNavOpen)
    let isAuthenticated = useAuth()
    const [authService] = useService(AuthService)

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

            <AnimateHeight duration={500} height={mobileNavOpen ? 'auto' : 0} className="absolute top-12 left-0 bg-cal-poly-green w-full z-50 transform -translate-y-1">
                <div className="flex flex-col text-center text-xl text-white">
                    <Link className="my-1" to="/search/__all" onClick={triggerMobileNav} > Professor List</Link>
                    {/* <Link className="mr-7" to="contact">Contact</Link> */}
                    {!isAuthenticated &&
                    <div>
                        <Link to="/login" className="my-1" onClick={triggerMobileNav} >Login</Link>
                        <Link to="/register" className="my-1" onClick={triggerMobileNav} >Register</Link>
                    </div>
                    }
                </div>
            </AnimateHeight>

            <div className="text-white hidden md:flex items-center text-lg font-semibold">
                <Link className="mr-7" to="/search/__all"> Professor List</Link>
                {/* <Link className="mr-7" to="contact">Contact</Link> */}
                {!isAuthenticated &&
                    <Link to="/login" className="mr-7 rounded-full bg-white bg-opacity-50 px-3 py-px">LOGIN</Link>    
                }
                {!isAuthenticated &&
                    <Link to="/register" className="rounded-full border-white px-3 border-2">SIGN UP</Link>   
                }
                
                {isAuthenticated &&
                <div onClick={() => authService.signOut()} className="rounded-full border-white pl-3 pr-3 border-2 pt-px pb-px cursor-pointer">SIGN OUT</div>
                }
            </div>
        </div>
    )
}