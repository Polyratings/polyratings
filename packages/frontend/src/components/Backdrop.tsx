import { ReactNode, useEffect } from "react";

export function Backdrop({ children }: { children: ReactNode }) {
    // Fix scroll position
    useEffect(() => {
        const initialY = window.scrollY;
        window.scrollTo(0, 0);
        document.body.style.height = "100vh";
        document.body.style.overflowY = "hidden";
        return () => {
            document.body.style.height = "auto";
            document.body.style.overflowY = "auto";
            window.scrollTo(0, initialY);
        };
    }, []);

    return (
        <div className="bg-gray-800 bg-opacity-80 flex justify-center items-center fixed left-0 top-0 w-screen h-screen z-50">
            {children}
        </div>
    );
}
