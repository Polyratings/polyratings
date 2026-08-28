import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@backend/index";
import { CalendarRange, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router";
import { cn, DEFAULT_DESCRIPTION, getRandomSubarray } from "@/utils";
import Logo from "@/assets/Logo.svg";
import homeHeader from "@/assets/home-header.webp";
import duskCampus from "@/assets/worst-of-worst-background.webp";
import { BestOfTheBestCarousel, PageMeta, SearchBar, SearchState } from "@/components";
import { useParallax } from "@/hooks";
import { trpc } from "@/trpc";

const HERO_PARALLAX_SPEED = 0.25;

const linkClassName = cn(
    "font-semibold text-brand underline decoration-accent decoration-2 underline-offset-4",
    "transition-colors hover:text-brand/75 focus-visible:rounded-sm",
    "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring",
);

export function Home() {
    const {
        data: allProfessors,
        isPending: isProfessorsPending,
        error: professorsError,
    } = trpc.professors.all.useQuery(undefined, { meta: { suppressGlobalErrorToast: true } });

    const bestOfTheBest = useMemo(
        () => (allProfessors ? getBestProfessors(allProfessors) : []),
        [allProfessors],
    );

    const [searchState, setSearchState] = useState<SearchState>({ searchValue: "", type: "name" });

    const { containerRef: heroRef, layerRef: heroImageRef } = useParallax(HERO_PARALLAX_SPEED);

    return (
        <div id="main" tabIndex={-1} className="outline-none">
            <PageMeta description={DEFAULT_DESCRIPTION} path="/" />
            <div ref={heroRef} className="relative h-screen-wo-nav min-h-120 lg:h-screen3/5">
                <div className="absolute inset-0 overflow-hidden">
                    <div
                        ref={heroImageRef}
                        aria-hidden
                        className={cn(
                            "absolute inset-x-0 top-[-25%] h-[150%] bg-cover bg-center",
                            "bg-no-repeat will-change-transform",
                            // Swapped with the carousel art per scheme. Driven by custom
                            // properties so the parallax ref stays on a single element and
                            // only the applied image is fetched.
                            "bg-[image:var(--hero-photo)] dark:bg-[image:var(--hero-photo-dark)]",
                        )}
                        style={
                            {
                                "--hero-photo": `url(${homeHeader})`,
                                "--hero-photo-dark": `url(${duskCampus})`,
                            } as CSSProperties
                        }
                    />
                </div>
                <div className="absolute inset-0 flex items-center justify-center px-4 lg:pb-36">
                    <div className="flex flex-col items-center gap-3">
                        <h1 className="relative flex justify-center">
                            {/* Lifts the logo off the bright photo. The dark hero art is
                                already dark enough, so this is light-mode only. */}
                            <span
                                aria-hidden
                                className="pointer-events-none absolute inset-x-0 -inset-y-1 rounded-full bg-white/70 blur-sm dark:hidden"
                            />
                            <span
                                role="img"
                                aria-label="Polyratings"
                                className="relative block h-14 aspect-397/78 bg-primary md:h-20 lg:h-24 dark:bg-brand"
                                style={{
                                    mask: `url(${Logo}) center / contain no-repeat`,
                                    WebkitMask: `url(${Logo}) center / contain no-repeat`,
                                }}
                            />
                        </h1>
                        <div className="w-full sm:w-auto">
                            <SearchBar size="hero" value={searchState} onChange={setSearchState} />
                        </div>
                    </div>
                </div>
                {/* The wave keeps its natural width and is cropped from the left as the viewport
                    narrows, so its steep left tail never dips into the heading below. */}
                <div className="pointer-events-none absolute inset-x-0 -bottom-7 hidden justify-end overflow-hidden lg:flex">
                    <HeroCurve className="h-auto w-full max-w-none min-w-[90rem] select-none" />
                </div>
            </div>

            <section
                aria-labelledby="home-trust-heading"
                className="relative z-10 -mt-4 px-5 pt-6 pb-16 text-foreground md:px-12 md:pb-20 lg:-mt-15"
            >
                <div className="relative z-10 m-auto w-full max-w-7xl">
                    <h2
                        id="home-trust-heading"
                        className="text-4xl font-bold tracking-tight text-brand md:text-5xl"
                    >
                        Recent Updates
                    </h2>
                    <p className="mt-6 text-xl font-medium md:text-2xl">
                        We&apos;ve added some new features to improve the site and rating integrity.
                    </p>
                </div>
                <ul className="relative z-10 m-auto mt-10 grid w-full max-w-7xl list-none gap-6 p-0 md:grid-cols-3 md:items-stretch">
                    <LatestUpdateCard
                        icon={<Search aria-hidden className="size-6" />}
                        title="Professor Search"
                    >
                        We sped up professor search and tightened how results are ranked. Recently
                        rated professors rise to the top, and professors without ratings in years no
                        longer dominate the list.
                    </LatestUpdateCard>
                    <LatestUpdateCard
                        icon={<CalendarRange aria-hidden className="size-6" />}
                        title="Semester Conversion"
                    >
                        Cal Poly is moving from quarters to semesters. You may now submit ratings
                        under the new semester catalog. Course search and rating submission accept
                        the new 4-digit numbers, while existing ratings stay attached to the the
                        quarter catalog&apos;s 3-digit numbers.
                    </LatestUpdateCard>
                    <LatestUpdateCard
                        icon={<ShieldCheck aria-hidden className="size-6" />}
                        title="Spam and Abuse Protections"
                    >
                        We are committed to ensuring student written ratings are objective and
                        valuable, and to preventing those that harm the community or integrity of
                        the site. Spam, AI-generated junk, and ratings without value are removed.
                        Please continue to report abusive ratings.
                    </LatestUpdateCard>
                </ul>
                <p className="relative z-10 m-auto mt-10 w-full max-w-7xl text-center text-lg leading-8">
                    Ratings that should not be on the site can be reported, and those reports are
                    reviewed.
                    <br />
                    Learn more about{" "}
                    <Link className={linkClassName} to="/faq">
                        how reporting works
                    </Link>
                    .
                </p>
            </section>

            <BestOfTheBestCarousel
                professors={bestOfTheBest}
                isPending={isProfessorsPending}
                error={professorsError}
            />
        </div>
    );
}

/*
  Inlined rather than an <img> so the lower band can be filled with the page
  background token, which an external asset cannot follow into dark mode.
*/
function HeroCurve({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 1440 179"
            className={className}
            aria-hidden
            focusable="false"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M1440 29.5C961 273.5 449.5 -110.5 0 179V149C449.5 -140 961 244 1440 0V29.5Z"
                className="fill-cal-poly-gold"
            />
            <path
                d="M1440 29.5C961 273.5 449.5 -110.5 0 179H1440V29.5Z"
                className="fill-background"
            />
        </svg>
    );
}

function LatestUpdateCard({
    icon,
    title,
    children,
}: {
    icon: ReactNode;
    title: string;
    children: ReactNode;
}) {
    return (
        <li className="flex h-full flex-col rounded-lg border border-border bg-card p-6 text-left shadow-sm">
            <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-muted text-brand">
                    {icon}
                </div>
                <h3 className="text-xl font-bold tracking-tight text-brand">{title}</h3>
            </div>
            <p className="mt-3 text-[1.05rem] leading-8 text-foreground">{children}</p>
        </li>
    );
}

function getBestProfessors(allProfessors: inferProcedureOutput<AppRouter["professors"]["all"]>) {
    const rankedProfessors = allProfessors
        .filter((t) => t.numEvals > 10)
        .sort((a, b) => b.overallRating - a.overallRating);
    return getRandomSubarray(rankedProfessors.slice(0, 100), 10);
}
