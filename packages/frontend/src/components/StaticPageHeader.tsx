import type { ReactNode } from "react";
import { cn } from "@/utils";

interface StaticPageHeaderProps {
    children: ReactNode;
    className?: string;
}

export function StaticPageHeader({ children, className }: StaticPageHeaderProps) {
    return (
        <header className={cn("mb-8 border-brand md:mb-10", className)}>
            <h1 className="text-4xl font-bold tracking-tight text-brand md:text-5xl">{children}</h1>
            <div aria-hidden="true" className="mt-4 h-1 w-16 rounded-full bg-accent" />
        </header>
    );
}
