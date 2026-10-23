import { useEffect, useState, type CSSProperties } from "react";
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
import { useParallax, usePrefersReducedMotion } from "@/hooks";
import worstOfWorstBackground from "@/assets/worst-of-worst-background.webp";
import daylightCampus from "@/assets/home-header.webp";

type FeaturedProfessor = inferProcedureOutput<AppRouter["professors"]["all"]>[number];

export type BestOfTheBestCarouselProps = {
    professors: FeaturedProfessor[];
    isPending: boolean;
    error: unknown;
};

// Higher than the hero: this block is shorter and uses `through` mode, so the
// layer needs a stronger shift to read while the section crosses the viewport.
const BACKGROUND_PARALLAX_SPEED = 0.45;

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
    const { containerRef, layerRef } = useParallax(BACKGROUND_PARALLAX_SPEED, { mode: "through" });
    const [autoplayPlugin] = useState(() =>
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
            ref={containerRef}
            aria-labelledby="best-of-the-best-heading"
            className="relative -mt-8 overflow-hidden bg-primary text-primary-foreground md:-mt-16 lg:-mt-24"
        >
            {/* Swapped with the hero art per scheme: the dusk photo carries the hero in
                dark mode, so the carousel takes the daylight one. Both already load on
                this page, so toggling the applied image costs no extra bytes. */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <div
                    ref={layerRef}
                    className={cn(
                        // Extra vertical pad so `through` parallax (±speed × height) never shows edges.
                        "absolute inset-x-0 top-[-50%] h-[200%] bg-cover bg-center bg-no-repeat",
                        "opacity-70 will-change-transform",
                        "bg-[image:var(--botb-photo)] dark:bg-[image:var(--botb-photo-dark)]",
                    )}
                    style={
                        {
                            "--botb-photo": `url(${worstOfWorstBackground})`,
                            "--botb-photo-dark": `url(${daylightCampus})`,
                        } as CSSProperties
                    }
                />
                <div className="absolute inset-0 bg-linear-to-b from-primary/35 via-primary/45 to-primary/80" />
            </div>

            {/* Static page-colored wedge replaces section clip-path. Clipping a
                transforming bitmap every frame was the scroll jank source. */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[10%] bg-background [clip-path:polygon(0_0,100%_0,0_100%)]"
            />

            <div className="relative z-20 mx-auto max-w-7xl px-4 pt-28 pb-16 sm:px-8 md:pt-40 md:pb-20 lg:px-12 lg:pt-44">
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
                            opts={{
                                // Center snap so the gold band lands on the middle of the 3-up row.
                                align: "center",
                                loop: slideCount > 1,
                                slidesToScroll: 1,
                            }}
                            plugins={shouldAutoplay ? [autoplayPlugin] : []}
                            // Outer pad = arrow gutter; inner clip so a 4th card cannot paint under arrows.
                            className="px-14 sm:px-16"
                            aria-label="Featured professors"
                        >
                            <CarouselContent className="ml-0 gap-4">
                                {professors.map((professor, index) => (
                                    <CarouselItem
                                        key={professor.id}
                                        className={cn(
                                            // Gap-based widths (not % + -ml) so exactly 1/2/3 fit with no peek.
                                            "py-2 pl-0 basis-full",
                                            "sm:basis-[calc(50%-0.5rem)]",
                                            "lg:basis-[calc((100%-2rem)/3)]",
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
                            <fieldset
                                className="m-0 mt-8 flex min-w-0 items-center justify-center gap-1 border-0 p-0"
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
                                            className="group grid h-11 min-w-11 place-items-center rounded-full"
                                            onClick={() => api?.scrollTo(index)}
                                        >
                                            <span
                                                aria-hidden
                                                className={cn(
                                                    "block h-2.5 rounded-full transition-[width,background-color]",
                                                    selected
                                                        ? "w-8 bg-accent"
                                                        : "w-2.5 bg-white/40 group-hover:bg-white/70",
                                                )}
                                            />
                                        </button>
                                    );
                                })}
                            </fieldset>
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
            className="block h-full rounded-2xl focus-visible:ring-3 focus-visible:ring-accent/80 focus-visible:outline-hidden"
        >
            <article
                className={cn(
                    // Horizontal inset keeps the border inside Embla's overflow clip (flush edges get shaved).
                    // Keep border-2 in both states so inactive scale/peek hacks are unnecessary.
                    "mx-1 flex h-full min-h-80 flex-col rounded-2xl border-2 bg-card p-6 text-foreground shadow-lg",
                    "motion-safe:transition-[opacity,box-shadow,border-color] motion-safe:duration-300",
                    isActive
                        ? "border-accent shadow-md shadow-accent/30 ring-1 ring-accent/40"
                        : "border-white/50 opacity-70",
                )}
            >
                <div className="flex min-w-0 items-center justify-between gap-3">
                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold tracking-wider text-brand uppercase">
                        {professor.department}
                    </span>
                    {courses ? (
                        <span className="min-w-0 truncate text-right text-xs font-medium text-muted-foreground">
                            {courses}
                        </span>
                    ) : null}
                </div>

                <div className="mt-6 flex flex-col items-center text-center">
                    <p className="text-6xl leading-none font-semibold text-accent tabular-nums">
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

                {/* Reserve two-tag height so Embla doesn't jump between slides. */}
                <div className="mt-4 flex min-h-[4.25rem] flex-col items-center justify-end gap-1.5">
                    {topTags.map((tagName) => (
                        <ProfessorTag key={tagName} tagName={tagName} size="sm" />
                    ))}
                </div>

                <p className="mt-auto flex items-center justify-center gap-1 pt-5 text-sm font-semibold text-brand">
                    View professor
                    <ChevronRight className="size-4" aria-hidden />
                </p>
            </article>
        </Link>
    );
}
