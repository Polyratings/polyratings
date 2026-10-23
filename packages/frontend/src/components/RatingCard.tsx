import { type ReactNode } from "react";
import { Rating, FilledStar } from "./Rating";
import { ProfessorTag } from "./ProfessorTag";
import { cn } from "@/utils";

export type RatingCardData = {
    overallRating: number;
    rating: string;
    grade: string;
    courseType: string;
    gradeLevel: string;
    tags?: string[];
    /** ISO date string; omit for a live preview that should show "Today". */
    postDate?: string;
};

export type RatingCardProps = {
    rating: RatingCardData;
    actions?: ReactNode;
    className?: string;
};

export function RatingCard({ rating, actions, className }: RatingCardProps) {
    const posted = rating.postDate ? new Date(rating.postDate) : null;
    const showStars = !posted || posted.getFullYear() >= 2022;
    const postedLabel = posted
        ? posted.toLocaleString("en-US", {
              year: "numeric",
              month: "short",
          })
        : "Today";
    const metadata = [
        rating.grade !== "N/A" ? `Grade Received: ${rating.grade}` : null,
        rating.courseType,
        rating.gradeLevel,
    ].filter(Boolean);

    return (
        <article
            className={cn(
                "relative my-3 flex w-full flex-col rounded-lg border border-input bg-card px-4 py-4 sm:px-6 sm:py-5",
                // Room for flag (size-11) and optional admin checkbox.
                actions ? "pr-24 sm:pr-28" : undefined,
                className,
            )}
        >
            {actions ? (
                <div className="absolute top-2 right-2 flex items-center gap-1">{actions}</div>
            ) : null}
            <div
                className={cn(
                    "flex flex-wrap items-center gap-x-3 gap-y-1",
                    actions ? "pr-2" : undefined,
                )}
            >
                {showStars && (
                    <>
                        <Rating
                            value={rating.overallRating}
                            size="1.25rem"
                            gap="2px"
                            className="hidden md:inline-flex"
                        />
                        <FilledStar className="md:hidden" size="1.35rem" />
                        <span className="text-2xl font-semibold tabular-nums">
                            {rating.overallRating}
                        </span>
                    </>
                )}
                <ul className="m-0 flex min-w-0 list-none flex-wrap items-center gap-x-1.5 gap-y-1 p-0 text-sm text-muted-foreground">
                    <li className="font-semibold text-foreground">{postedLabel}</li>
                    {metadata.map((item) => (
                        <li key={item} className="flex min-w-0 items-center gap-1.5">
                            <span aria-hidden className="text-muted-foreground/70">
                                ·
                            </span>
                            <span className="min-w-0">{item}</span>
                        </li>
                    ))}
                </ul>
            </div>
            <p className="mt-3 text-base leading-7 text-foreground md:text-lg">{rating.rating}</p>

            {Boolean(rating.tags?.length) && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {[...(rating.tags ?? [])]
                        .sort((a, b) => a.length - b.length)
                        .map((tag) => (
                            <ProfessorTag key={tag} tagName={tag} />
                        ))}
                </div>
            )}
        </article>
    );
}
