import { ReactNode } from "react";

export function Backdrop({children, onClick}:{children:ReactNode, onClick:() => void}) {
    return (
        <div 
            className="bg-black bg-opacity-80 flex justify-center items-center absolute left-0 w-screen h-screen z-10 cursor-pointer"
            style={{top:window.pageYOffset}}
            onClick={(e) => {
                if(e.target === e.currentTarget) {
                    onClick()
                }
            }}
            >
            {children}
        </div>
    )
}