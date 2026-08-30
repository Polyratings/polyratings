import type { ReactNode } from "react";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@backend/index";

export type ScheduleSection = inferProcedureOutput<
    AppRouter["schedule"]["getSectionsForCourse"]
>["sections"][number];

const STALE_MS = 48 * 60 * 60 * 1000;

export function formatScheduleScrapedAt(scrapedAt: string | null | undefined): string | null {
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

export function isScheduleStale(scrapedAt: string | null | undefined): boolean {
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

interface ScheduleSectionsTableProps {
    sections: ScheduleSection[];
    showCourse?: boolean;
    showInstructor?: boolean;
    instructorLink?: (instructorRaw: string) => ReactNode;
}

export function ScheduleSectionsTable({
    sections,
    showCourse = false,
    showInstructor = true,
    instructorLink,
}: ScheduleSectionsTableProps) {
    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-700">
                    <tr>
                        {showCourse && <th className="px-3 py-2 font-medium">Course</th>}
                        <th className="px-3 py-2 font-medium">Section</th>
                        {showInstructor && <th className="px-3 py-2 font-medium">Instructor</th>}
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">When</th>
                    </tr>
                </thead>
                <tbody>
                    {sections.map((section) => (
                        <tr key={section.classNbr} className="border-t border-gray-100">
                            {showCourse && (
                                <td className="px-3 py-2 whitespace-nowrap">{section.courseKey}</td>
                            )}
                            <td className="px-3 py-2 whitespace-nowrap">{section.section}</td>
                            {showInstructor && (
                                <td className="px-3 py-2">
                                    {(instructorLink?.(section.instructorRaw) ??
                                        section.instructorRaw) ||
                                        "TBA"}
                                </td>
                            )}
                            <td className="px-3 py-2">
                                <span
                                    className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusClasses(section.status)}`}
                                >
                                    {section.status}
                                </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                                {[section.days, section.time].filter(Boolean).join(" · ") || "—"}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

interface ScheduleMetaProps {
    termLabel?: string;
    scrapedAt?: string | null;
    className?: string;
}

export function ScheduleMeta({ termLabel, scrapedAt, className = "" }: ScheduleMetaProps) {
    const scrapedLabel = formatScheduleScrapedAt(scrapedAt);
    const stale = isScheduleStale(scrapedAt);

    if (!termLabel && !scrapedLabel) {
        return null;
    }

    return (
        <div className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 ${className}`}>
            {termLabel && <span className="text-sm text-gray-600">{termLabel}</span>}
            {scrapedLabel && (
                <span className={`text-xs ${stale ? "text-amber-700" : "text-gray-500"}`}>
                    {stale ? "Schedule may be outdated" : "Updated"} · {scrapedLabel}
                </span>
            )}
        </div>
    );
}
