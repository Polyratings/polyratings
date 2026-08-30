import { trpc } from "@/trpc";

const STALE_MS = 48 * 60 * 60 * 1000;

function formatScrapedAt(scrapedAt: string | null | undefined): string | null {
    if (!scrapedAt) {
        return null;
    }
    const date = new Date(scrapedAt);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function isStale(scrapedAt: string | null | undefined): boolean {
    if (!scrapedAt) {
        return true;
    }
    const time = Date.parse(scrapedAt);
    if (Number.isNaN(time)) {
        return true;
    }
    return Date.now() - time > STALE_MS;
}

function statusClasses(status: string): string {
    switch (status) {
        case "OPEN":
            return "bg-green-100 text-green-800";
        case "WAITLIST":
            return "bg-amber-100 text-amber-900";
        case "CLOSED":
            return "bg-red-100 text-red-800";
        default:
            return "bg-gray-100 text-gray-700";
    }
}

interface CourseScheduleProps {
    courseName: string;
}

export function parseCourseName(
    courseName: string,
): { department: string; courseNum: number } | null {
    const match = courseName.trim().match(/^([A-Z]+)\s+(\d+)$/);
    if (!match) {
        return null;
    }
    return {
        department: match[1],
        courseNum: Number.parseInt(match[2], 10),
    };
}

export function CourseSchedule({ courseName }: CourseScheduleProps) {
    const parsed = parseCourseName(courseName);
    const { data, isPending } = trpc.schedule.getSectionsForCourse.useQuery(
        {
            department: parsed?.department ?? "",
            courseNum: parsed?.courseNum ?? 0,
        },
        {
            enabled: parsed != null,
            meta: { suppressGlobalErrorToast: true },
        },
    );

    if (!parsed || isPending) {
        return null;
    }

    if (!data?.available) {
        if (data?.reason === "not_found") {
            return (
                <p className="text-sm text-gray-500 ml-2 mb-4">
                    Class schedule unavailable for this term.
                </p>
            );
        }
        return null;
    }

    if (!data.sections.length) {
        return (
            <p className="text-sm text-gray-500 ml-2 mb-4">
                No sections listed for {courseName} this term.
            </p>
        );
    }

    const scrapedLabel = formatScrapedAt(data.scrapedAt);
    const stale = isStale(data.scrapedAt);

    return (
        <section className="ml-2 mb-6" aria-label={`${courseName} class schedule`}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
                <h4 className="text-lg font-semibold text-cal-poly-green">Class schedule</h4>
                {data.termLabel && <span className="text-sm text-gray-600">{data.termLabel}</span>}
                {scrapedLabel && (
                    <span className={`text-xs ${stale ? "text-amber-700" : "text-gray-500"}`}>
                        {stale ? "Schedule may be outdated" : "Updated"} · {scrapedLabel}
                    </span>
                )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-700">
                        <tr>
                            <th className="px-3 py-2 font-medium">Section</th>
                            <th className="px-3 py-2 font-medium">Instructor</th>
                            <th className="px-3 py-2 font-medium">Status</th>
                            <th className="px-3 py-2 font-medium">When</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.sections.map((section) => (
                            <tr key={section.classNbr} className="border-t border-gray-100">
                                <td className="px-3 py-2 whitespace-nowrap">{section.section}</td>
                                <td className="px-3 py-2">{section.instructorRaw || "TBA"}</td>
                                <td className="px-3 py-2">
                                    <span
                                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusClasses(section.status)}`}
                                    >
                                        {section.status}
                                    </span>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                    {[section.days, section.time].filter(Boolean).join(" · ") ||
                                        "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
