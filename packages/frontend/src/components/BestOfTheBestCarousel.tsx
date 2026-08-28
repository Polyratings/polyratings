import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@backend/index";
import Autoplay from "embla-carousel-autoplay";
import { ChevronRight } from "lucide-react";
import { InlineQueryState } from "./InlineQueryState";
import { ProfessorTag } from "./ProfessorTag";
import { Rating } from "./Rating";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/utils";
import { usePrefersReducedMotion } from "@/hooks";
import worstOfWorstBackground from "@/assets/worst-of-worst-background.webp";
import daylightCampus from "@/assets/home-header.webp";

type FeaturedProfessor = inferProcedureOutput<AppRouter["professors"]["all"]>[number];

export type BestOfTheBestCarouselProps = {
    professors: FeaturedProfessor[];
    isPending: boolean;
    error: unknown;
};

const arrowClassName = cn(
    "size-11 border-accent/80 bg-card text-brand shadow-md",
    "hover:border-accent hover:bg-accent hover:text-accent-foreground",
    "disabled:opacity-40",
);

export function BestOfTheBestCarousel({
    professors,
    isPending,
    error,
}: BestOfTheBestCarouselProps) {
    const [api, setApi] = useState<CarouselApi>();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const prefersReducedMotion = usePrefersReducedMotion();
    const autoplayPlugin = useRef(
        Autoplay({
            delay: 5000,
            stopOnInteraction: false,
            stopOnMouseEnter: true,
            stopOnFocusIn: true,
        }),
    );

    useEffect(() => {
        if (!api) {
            return undefined;
        }

        const sync = () => setSelectedIndex(api.selectedScrollSnap());
        sync();
        api.on("select", sync);
        api.on("reInit", sync);

        return () => {
            api.off("select", sync);
            api.off("reInit", sync);
        };
    }, [api]);

    const slideCount = professors.length;
    const showCarousel = !error && slideCount > 0;
    const shouldAutoplay = !prefersReducedMotion && slideCount > 1;

    return (
        <section
            aria-labelledby="best-of-the-best-heading"
            className={cn(
                "relative -mt-8 overflow-hidden bg-primary text-primary-foreground md:-mt-16 lg:-mt-24",
                "[clip-path:polygon(0_100%,0_10%,100%_0,100%_100%)]",
            )}
        >
            {/* Swapped with the hero art per scheme: the dusk photo carries the hero in
                dark mode, so the carousel takes the daylight one. Both already load on
                this page, so toggling visibility costs no extra bytes. */}
            <div className="pointer-events-none absolute inset-0" aria-hidden>
                <img
                    src={worstOfWorstBackground}
                    alt=""
                    className="size-full object-cover object-center opacity-70 dark:hidden"
                />
                <img
                    src={daylightCampus}
                    alt=""
                    className="hidden size-full object-cover object-center opacity-70 dark:block"
                />
                <div className="absolute inset-0 bg-linear-to-b from-primary/35 via-primary/45 to-primary/80" />
            </div>

            <div className="relative mx-auto max-w-7xl px-4 pt-28 pb-16 sm:px-8 md:pt-40 md:pb-20 lg:px-12 lg:pt-44">
                <header className="mx-auto max-w-3xl text-center">
                    <h2
                        id="best-of-the-best-heading"
                        className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl"
                    >
                        Best of the Best
                    </h2>
                </header>

                <InlineQueryState
                    isPending={isPending && !slideCount}
                    error={error}
                    loadingMessage="Loading top professors..."
                    fallbackErrorMessage="Unable to load top professors. Please try again."
                    loadingClassName="mt-10 text-center text-lg text-white"
                    errorClassName="mt-10 text-center text-lg text-red-200"
                />

                {isPending && !slideCount && !error ? (
                    <div className="mt-12 flex justify-center gap-6">
                        {Array.from({ length: 3 }, (_, index) => (
                            <div
                                key={`best-skeleton-${index}`}
                                className="hidden h-80 w-72 animate-pulse rounded-2xl bg-white/10 first:block md:block"
                            />
                        ))}
                    </div>
                ) : null}

                {showCarousel ? (
                    <div className="mt-12">
                        <Carousel
                            setApi={setApi}
                            opts={{ align: "center", loop: slideCount > 1 }}
                            plugins={shouldAutoplay ? [autoplayPlugin.current] : []}
                            className="px-12 sm:px-14"
                            aria-label="Featured professors"
                        >
                            <CarouselContent className="-ml-4 md:-ml-6">
                                {professors.map((professor, index) => (
                                    <CarouselItem
                                        key={professor.id}
                                        className={cn(
                                            "basis-[min(20.5rem,100%)] pl-4 sm:basis-[19rem]",
                                            "md:basis-[20rem] md:pl-6 lg:basis-[21rem]",
                                        )}
                                        aria-label={`${index + 1} of ${slideCount}`}
                                    >
                                        <FeaturedProfessorSlide
                                            professor={professor}
                                            isActive={index === selectedIndex}
                                        />
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            {slideCount > 1 ? (
                                <>
                                    <CarouselPrevious
                                        size="icon-lg"
                                        className={cn(arrowClassName, "left-0")}
                                    />
                                    <CarouselNext
                                        size="icon-lg"
                                        className={cn(arrowClassName, "right-0")}
                                    />
                                </>
                            ) : null}
                        </Carousel>

                        {slideCount > 1 ? (
                            <div
                                className="mt-8 flex items-center justify-center gap-2"
                                role="group"
                                aria-label="Choose featured professor"
                            >
                                {professors.map((professor, index) => {
                                    const selected = index === selectedIndex;
                                    return (
                                        <button
                                            key={professor.id}
                                            type="button"
                                            aria-label={`Show ${professor.lastName}, ${professor.firstName}`}
                                            aria-current={selected ? "true" : undefined}
                                            className={cn(
                                                "h-2.5 rounded-full transition-[width,background-color]",
                                                selected
                                                    ? "w-8 bg-accent"
                                                    : "w-2.5 bg-white/40 hover:bg-white/70",
                                            )}
                                            onClick={() => api?.scrollTo(index)}
                                        />
                                    );
                                })}
                            </div>
                        ) : null}

                        <p className="sr-only" aria-live="polite">
                            {`Slide ${selectedIndex + 1} of ${slideCount}`}
                        </p>

                        <p className="mt-8 text-center">
                            <Link
                                to="/search/name"
                                className={cn(
                                    "inline-flex items-center gap-1 text-sm font-semibold text-white",
                                    "underline decoration-accent decoration-2 underline-offset-4",
                                    "hover:text-white/80 focus-visible:rounded-sm",
                                    "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring",
                                )}
                            >
                                Browse all professors
                                <ChevronRight className="size-4" aria-hidden />
                            </Link>
                        </p>
                    </div>
                ) : null}
            </div>
        </section>
    );
}

function FeaturedProfessorSlide({
    professor,
    isActive,
}: {
    professor: FeaturedProfessor;
    isActive: boolean;
}) {
    const topTags = Object.entries(professor.tags ?? {})
        .sort(([, left], [, right]) => right - left)
        .slice(0, 2)
        .map(([tagName]) => tagName);
    const courses = professor.courses.slice(0, 2).join(" · ");

    return (
        <Link
            to={`/professor/${professor.id}`}
            className="block h-full rounded-2xl focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-accent/80"
        >
            <article
                className={cn(
                    "flex h-full min-h-80 flex-col rounded-2xl border bg-card p-6 text-foreground shadow-lg",
                    "motion-safe:transition-[transform,opacity,box-shadow,border-color] motion-safe:duration-300",
                    isActive
                        ? "scale-100 border-accent shadow-accent/25 ring-2 ring-accent"
                        : "border-white/20 opacity-70 motion-safe:scale-[0.94]",
                )}
            >
                <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold tracking-wider text-brand uppercase">
                        {professor.department}
                    </span>
                    {courses ? (
                        <span className="truncate text-xs font-medium text-muted-foreground">
                            {courses}
                        </span>
                    ) : null}
                </div>

                <div className="mt-6 flex flex-col items-center text-center">
                    <p className="text-6xl font-semibold leading-none tabular-nums text-accent">
                        {professor.overallRating.toFixed(2)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">out of 4.00</p>
                    <Rating
                        value={professor.overallRating}
                        size="1.35rem"
                        gap="3px"
                        className="mt-3"
                    />
                </div>

                <h3 className="mt-6 text-center text-2xl font-semibold tracking-tight">
                    {professor.lastName}, {professor.firstName}
                </h3>
                <p className="mt-1 text-center text-sm text-muted-foreground">
                    {professor.numEvals} {professor.numEvals === 1 ? "evaluation" : "evaluations"}
                </p>

                <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4 text-center">
                    <div>
                        <dt className="px-1 text-[0.7rem] leading-tight font-semibold tracking-wider text-muted-foreground uppercase">
                            Clarity
                        </dt>
                        <dd className="mt-1 text-lg font-semibold tabular-nums">
                            {professor.materialClear.toFixed(2)}
                        </dd>
                    </div>
                    <div>
                        <dt className="px-1 text-[0.7rem] leading-tight font-semibold tracking-wider text-muted-foreground uppercase">
                            Support
                        </dt>
                        <dd className="mt-1 text-lg font-semibold tabular-nums">
                            {professor.studentDifficulties.toFixed(2)}
                        </dd>
                    </div>
                </dl>

                {topTags.length > 0 ? (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {topTags.map((tagName) => (
                            <ProfessorTag key={tagName} tagName={tagName} />
                        ))}
                    </div>
                ) : (
                    <div className="mt-4 min-h-8" />
                )}

                <p className="mt-auto flex items-center justify-center gap-1 pt-5 text-sm font-semibold text-brand">
                    View professor
                    <ChevronRight className="size-4" aria-hidden />
                </p>
            </article>
        </Link>
    );
}
