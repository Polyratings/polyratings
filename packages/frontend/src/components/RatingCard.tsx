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
    postDate: string;
};

export type RatingCardProps = {
    rating: RatingCardData;
    actions?: ReactNode;
    className?: string;
};

export function RatingCard({ rating, actions, className }: RatingCardProps) {
    const posted = new Date(rating.postDate);
    const showStars = posted.getFullYear() >= 2022;
    const postedLabel = posted.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
    });
    const metadata = [
        rating.grade !== "N/A" ? `Grade Received: ${rating.grade}` : null,
        rating.courseType,
        rating.gradeLevel,
    ].filter(Boolean);

    return (
        <article
            className={cn(
                "relative my-3 flex w-full flex-col rounded-lg border border-input bg-card px-4 py-4 sm:px-6 sm:py-5",
                actions ? "pr-14" : undefined,
                className,
            )}
        >
            {actions ? (
                <div className="absolute top-2 right-2 flex items-center gap-1">{actions}</div>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
                <span className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{postedLabel}</span>
                    {metadata.length > 0 && ` · ${metadata.join(" · ")}`}
                </span>
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
