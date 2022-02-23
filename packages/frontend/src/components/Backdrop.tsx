import { ReactNode, useEffect } from 'react';

export function Backdrop({ children }: { children: ReactNode }) {
    window.scrollTo(0, 0);

    // Fix scroll position
    useEffect(() => {
        document.body.style.height = '100vh';
        document.body.style.overflowY = 'hidden';
        return () => {
            document.body.style.height = 'auto';
            document.body.style.overflowY = 'auto';
        };
    }, []);

    return (
        <div
            className="bg-black bg-opacity-80 flex justify-center items-center absolute left-0 w-screen h-screen z-10"
            style={{ top: window.pageYOffset }}
        >
            {children}
        </div>
    );
}
