import { Link } from "react-router";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@backend/index";

type UnmatchedInstructor = inferProcedureOutput<
    AppRouter["schedule"]["getRankedCourseOfferings"]
>["unmatched"][number];

const PLACEHOLDER_INSTRUCTORS = new Set(["tba", "tbd", "staff", "to be announced"]);

function instructorSearchTerm(instructorRaw: string): string {
    const commaForm = instructorRaw.match(/^([^,]+),\s*(.+)$/);
    if (commaForm) {
        return `${commaForm[2].trim()} ${commaForm[1].trim()}`;
    }
    return instructorRaw.trim();
}

function isPlaceholderInstructor(instructorRaw: string): boolean {
    return PLACEHOLDER_INSTRUCTORS.has(instructorRaw.trim().toLowerCase());
}

interface UnmatchedCourseInstructorListProps {
    entries: UnmatchedInstructor[];
}

export function UnmatchedCourseInstructorList({ entries }: UnmatchedCourseInstructorListProps) {
    const instructors = entries.filter((entry) => !isPlaceholderInstructor(entry.instructorRaw));

    if (!instructors.length) {
        return null;
    }

    return (
        <section className="mb-8" aria-label="Not yet on Polyratings">
            <h3 className="text-xl font-semibold text-cal-poly-green mb-1">
                Not yet on Polyratings
            </h3>
            <p className="text-sm text-gray-600 mb-4">
                These instructors appear on the schedule but do not have a Polyratings profile yet.
            </p>
            <ul className="space-y-3">
                {instructors.map((entry) => (
                    <li
                        key={entry.instructorRaw}
                        className={
                            "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 " +
                            "rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                        }
                    >
                        <div className="min-w-0">
                            <div className="text-lg font-medium text-gray-900">
                                {entry.instructorRaw}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                                {entry.sections.length}{" "}
                                {entry.sections.length === 1 ? "section" : "sections"}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm shrink-0">
                            <Link
                                to={`/search/name?term=${encodeURIComponent(instructorSearchTerm(entry.instructorRaw))}`}
                                className="text-cal-poly-green underline"
                            >
                                Search name
                            </Link>
                            <Link to="/new-professor" className="text-cal-poly-green underline">
                                Add professor
                            </Link>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
