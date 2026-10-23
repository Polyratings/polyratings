import { Link, useLocation } from "react-router";
import { PageMeta, StaticPageHeader } from "@/components";
import { cn } from "@/utils";

type NotFoundVariant = "page" | "professor";

const COPY: Record<NotFoundVariant, { title: string; description: string; body: string }> = {
    page: {
        title: "Page not found",
        description: "That page does not exist on Polyratings.",
        body: "That page does not exist. It may have moved, or the link may be wrong.",
    },
    professor: {
        title: "Professor not found",
        description: "This professor is not in Polyratings.",
        body: "This professor is not in Polyratings. They may have been removed, or the link may be wrong.",
    },
};

const linkClassName = cn(
    "font-semibold text-brand underline decoration-accent decoration-2 underline-offset-4",
    "transition-colors hover:text-brand/75 focus-visible:rounded-sm",
    "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring",
);

interface NotFoundProps {
    variant?: NotFoundVariant;
}

export function NotFound({ variant = "page" }: NotFoundProps) {
    const { pathname } = useLocation();
    const copy = COPY[variant];

    return (
        <main
            id="main"
            tabIndex={-1}
            className="mx-auto w-full max-w-5xl px-4 py-8 outline-none md:py-16"
        >
            <PageMeta title={copy.title} description={copy.description} path={pathname} noindex />
            <StaticPageHeader>{copy.title}</StaticPageHeader>
            <p className="max-w-xl text-[1.05rem] leading-8 text-foreground">{copy.body}</p>
            <p className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
                <Link className={linkClassName} to="/">
                    Back to home
                </Link>
                {variant === "professor" ? (
                    <Link className={linkClassName} to="/search/name">
                        Browse professors
                    </Link>
                ) : null}
            </p>
        </main>
    );
}
