import { Link } from "react-router";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@backend/index";
import star from "@/assets/star.svg";

type RankedInstructor = inferProcedureOutput<
    AppRouter["schedule"]["getRankedCourseOfferings"]
>["topRated"][number];

interface RankedCourseInstructorListProps {
    title: string;
    description?: string;
    entries: RankedInstructor[];
    ranked?: boolean;
}

export function RankedCourseInstructorList({
    title,
    description,
    entries,
    ranked = false,
}: RankedCourseInstructorListProps) {
    if (!entries.length) {
        return null;
    }

    return (
        <section className="mb-8" aria-label={title}>
            <h3 className="text-xl font-semibold text-cal-poly-green mb-1">{title}</h3>
            {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}
            <ol className="space-y-3">
                {entries.map((entry, index) => (
                    <li key={entry.professor.id}>
                        <Link
                            to={`/professor/${entry.professor.id}`}
                            className={
                                "flex items-center justify-between gap-4 rounded-xl " +
                                "border-2 border-cal-poly-gold bg-white px-4 py-3 " +
                                "text-cal-poly-green hover:bg-green-50 transition-colors"
                            }
                        >
                            <div className="min-w-0">
                                {ranked && (
                                    <span className="text-sm font-semibold text-cal-poly-gold mr-2">
                                        #{index + 1}
                                    </span>
                                )}
                                <span className="text-xl font-medium">
                                    {entry.professor.lastName}, {entry.professor.firstName}
                                </span>
                                <div className="text-sm text-gray-600 mt-1">
                                    {entry.sections.length}{" "}
                                    {entry.sections.length === 1 ? "section" : "sections"} ·{" "}
                                    {entry.professor.department}
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                {entry.professor.numEvals > 0 ? (
                                    <>
                                        <div className="flex items-center justify-end gap-1 text-lg font-medium">
                                            <img className="h-4" src={star} alt="" />
                                            {entry.professor.overallRating.toFixed(2)}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {entry.professor.numEvals} evals
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-sm text-gray-500">No ratings yet</div>
                                )}
                            </div>
                        </Link>
                    </li>
                ))}
            </ol>
        </section>
    );
}
