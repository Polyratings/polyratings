import { RatingCard } from "./RatingCard";

export type ReviewPreviewProps = {
    lastName: string;
    firstName: string;
    department: string;
    courseName: string;
    overallRating: number | string;
    ratingText: string;
    grade: string;
    courseType: string;
    gradeLevel: string;
    tags?: string[];
};

export function ReviewPreview({
    lastName,
    firstName,
    department,
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
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
                {lastName}, {firstName}
            </h2>
            <p className="mt-2 text-base font-medium text-muted-foreground">
                {department} Professor
            </p>
            <h3 className="mt-7 mb-2 text-2xl font-semibold tracking-tight md:text-3xl">
                {courseName}
            </h3>
            <RatingCard
                rating={{
                    overallRating: Number.isFinite(numericRating) ? numericRating : 0,
                    rating: ratingText,
                    grade,
                    courseType,
                    gradeLevel,
                    tags,
                    postDate: new Date().toISOString(),
                }}
            />
        </div>
    );
}
