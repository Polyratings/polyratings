import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { COURSE_NUM_HINT } from "@backend/utils/courseNum";
import {
    InlineQueryState,
    RankedCourseInstructorList,
    ScheduleMeta,
    ScheduleSectionsTable,
    UnmatchedCourseInstructorList,
} from "@/components";
import { parseScheduleCourseQuery } from "@/schedule/parseScheduleCourseQuery";
import { trpc } from "@/trpc";
import { Button } from "@/components/forms/Button";

function renderScheduleInstructorLink(
    instructorRaw: string,
    professorIdByInstructorRaw: ReadonlyMap<string, string>,
) {
    const name = instructorRaw.trim();
    if (!name || name === "TBA" || name === "Staff") {
        return "TBA";
    }

    const professorId = professorIdByInstructorRaw.get(instructorRaw);
    if (professorId) {
        return (
            <Link to={`/professor/${professorId}`} className="text-cal-poly-green underline">
                {name}
            </Link>
        );
    }

    const commaForm = name.match(/^([^,]+),\s*(.+)$/);
    const searchTerm = commaForm ? `${commaForm[2].trim()} ${commaForm[1].trim()}` : name;
    return (
        <Link
            to={`/search/name?term=${encodeURIComponent(searchTerm)}`}
            className="text-cal-poly-green underline"
        >
            {name}
        </Link>
    );
}

export function ScheduleCourseSearch() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get("q") ?? "";
    const [query, setQuery] = useState(initialQuery);

    const parsed = useMemo(() => parseScheduleCourseQuery(initialQuery), [initialQuery]);

    const { data, isPending, error } = trpc.schedule.getRankedCourseOfferings.useQuery(
        {
            department: parsed?.department ?? "",
            courseNum: parsed?.courseNum ?? 0,
        },
        {
            enabled: parsed != null,
            meta: { suppressGlobalErrorToast: true },
        },
    );

    const professorIdByInstructorRaw = useMemo(() => {
        if (!data?.available) {
            return new Map<string, string>();
        }

        return new Map(
            [...data.topRated, ...data.otherRated, ...data.unrated].flatMap((entry) =>
                entry.sections.map(
                    (section) => [section.instructorRaw, entry.professor.id] as const,
                ),
            ),
        );
    }, [data]);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        const next = query.trim();
        if (next) {
            setSearchParams({ q: next });
        } else {
            setSearchParams({});
        }
    };

    const hasRankedProfessors =
        Boolean(data?.topRated.length) ||
        Boolean(data?.otherRated.length) ||
        Boolean(data?.unrated.length);

    return (
        <div id="main" className="lg:max-w-5xl w-full mx-auto px-4 py-8">
            <h1 className="text-4xl font-semibold text-cal-poly-green mb-2">
                Find the best professor
            </h1>
            <p className="text-gray-600 mb-6">
                Search a course this term to see who is teaching it and how they rank on
                Polyratings. Use the semester course number from the Cal Poly schedule when you have
                it ({COURSE_NUM_HINT.toLowerCase()}).
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-8">
                <label htmlFor="schedule-course-query" className="flex-1">
                    <span className="sr-only">Course</span>
                    <input
                        id="schedule-course-query"
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="e.g. CSC 1001 or ENGL 1134"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-lg"
                    />
                </label>
                <Button type="submit" className="px-6 py-2">
                    Search
                </Button>
            </form>

            {!initialQuery && (
                <p className="text-gray-500 text-center">Enter a department and course number.</p>
            )}

            {initialQuery && !parsed && (
                <p className="text-red-600 text-center">
                    Enter a course like <strong>CSC 1001</strong> or <strong>ENGL1134</strong>.
                </p>
            )}

            {parsed && isPending && (
                <InlineQueryState
                    isPending
                    loadingMessage="Loading schedule and ratings..."
                    loadingClassName="text-xl text-center text-cal-poly-green"
                />
            )}

            {parsed && error && (
                <InlineQueryState
                    error={error}
                    fallbackErrorMessage="Unable to load schedule."
                    errorClassName="text-xl text-center text-red-500"
                />
            )}

            {parsed && data && !data.available && data.reason === "not_configured" && (
                <p className="text-gray-500 text-center">Schedule data is not configured.</p>
            )}

            {parsed && data && !data.available && data.reason === "not_found" && (
                <div className="text-center text-gray-600">
                    <p>No sections found for {initialQuery.toUpperCase()} this term.</p>
                    <p className="text-sm mt-2">
                        Try the 4-digit semester number from{" "}
                        <a
                            href="https://registrar.calpoly.edu/class-search"
                            className="underline text-cal-poly-green"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Cal Poly class search
                        </a>
                        .
                    </p>
                </div>
            )}

            {parsed && data?.available && (
                <section aria-label={`Schedule for ${data.courseKey ?? initialQuery}`}>
                    <h2 className="text-2xl font-semibold text-cal-poly-green mb-1">
                        {data.courseKey ?? initialQuery.toUpperCase()}
                    </h2>
                    <ScheduleMeta
                        termLabel={data.termLabel}
                        scrapedAt={data.scrapedAt}
                        className="mb-6"
                    />

                    {!data.sections.length ? (
                        <p className="text-gray-500">No sections listed for this term.</p>
                    ) : (
                        <>
                            {hasRankedProfessors ? (
                                <>
                                    <RankedCourseInstructorList
                                        title="Top rated instructors"
                                        description="Matched to Polyratings profiles with at least 3 evaluations."
                                        entries={data.topRated}
                                        ranked
                                    />
                                    <RankedCourseInstructorList
                                        title="Other rated instructors"
                                        description="Fewer than 3 evaluations — ratings may be less reliable."
                                        entries={data.otherRated}
                                    />
                                    <RankedCourseInstructorList
                                        title="On Polyratings, not yet rated"
                                        entries={data.unrated}
                                    />
                                    <UnmatchedCourseInstructorList entries={data.unmatched} />
                                </>
                            ) : (
                                <>
                                    <p className="text-gray-600 mb-6">
                                        No instructors matched Polyratings profiles for this course
                                        yet.
                                    </p>
                                    <UnmatchedCourseInstructorList entries={data.unmatched} />
                                </>
                            )}

                            <h3 className="text-lg font-semibold text-cal-poly-green mb-3">
                                All sections
                            </h3>
                            <ScheduleSectionsTable
                                sections={data.sections}
                                instructorLink={(instructorRaw) =>
                                    renderScheduleInstructorLink(
                                        instructorRaw,
                                        professorIdByInstructorRaw,
                                    )
                                }
                            />
                        </>
                    )}
                </section>
            )}
        </div>
    );
}
