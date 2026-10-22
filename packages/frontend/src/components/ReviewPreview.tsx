import { RatingCard } from "./RatingCard";

export type ReviewPreviewProps = {
    courseName: string;
    overallRating: number | string;
    ratingText: string;
    grade: string;
    courseType: string;
    gradeLevel: string;
    tags?: string[];
};

export function ReviewPreview({
    courseName,
    overallRating,
    ratingText,
    grade,
    courseType,
    gradeLevel,
    tags,
}: ReviewPreviewProps) {
    const numericRating = Number(overallRating);

    return (
        <div>
            <p className="mb-6 text-sm text-muted-foreground">
                This is how your review will appear on the professor page. Submit when it looks
                right.
            </p>
            <h3 className="mb-2 text-2xl font-semibold tracking-tight md:text-3xl">{courseName}</h3>
            <RatingCard
                rating={{
                    overallRating: Number.isFinite(numericRating) ? numericRating : 0,
                    rating: ratingText,
                    grade,
                    courseType,
                    gradeLevel,
                    tags,
                    // Omit postDate so the card shows "Today" (epoch was rendering as Dec 1969).
                }}
            />
        </div>
    );
}
