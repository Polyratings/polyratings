import { ReactNode } from "react";

export function Backdrop({children}:{children:ReactNode}) {
    return (
        <div 
            className="bg-black bg-opacity-80 flex justify-center items-center absolute left-0 w-screen h-screen z-10"
            style={{top:window.pageYOffset}}
        >
            {children}
        </div>
    )
}