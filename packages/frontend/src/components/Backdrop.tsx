import { ReactNode } from "react";

export function Backdrop({children, onClick}:{children:ReactNode, onClick:() => void}) {
    return (
        <div 
            className="bg-black bg-opacity-80 flex justify-center items-center absolute left-0 top-0 w-screen h-screen z-10"
            onClick={onClick}
            >
            {children}
        </div>
    )
}