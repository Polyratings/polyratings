import type { ScheduleMatch } from "@backend/schedule/schema";
import { Badge } from "@/components/ui/badge";

const LABELS: Record<ScheduleMatch["status"], string> = {
    confirmed: "On their schedule",
    course_not_taught: "Not on their schedule",
    not_applicable: "Outside schedule data",
    unavailable: "Schedule check failed",
};

export function scheduleMatchLabel(status: ScheduleMatch["status"]): string {
    return LABELS[status];
}

function matchTitle(scheduleMatch: ScheduleMatch): string | undefined {
    const parts: string[] = [];
    if (scheduleMatch.matchedCourseKeys.length > 0) {
        parts.push(`Taught: ${scheduleMatch.matchedCourseKeys.join(", ")}`);
    }
    if (scheduleMatch.termCodesChecked.length > 0) {
        parts.push(`Terms: ${scheduleMatch.termCodesChecked.join(", ")}`);
    }
    return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function ScheduleMatchBadge({
    scheduleMatch,
}: {
    scheduleMatch: ScheduleMatch | null | undefined;
}) {
    if (!scheduleMatch) {
        return <span className="text-xs text-muted-foreground">—</span>;
    }

    const taught =
        scheduleMatch.status === "course_not_taught" && scheduleMatch.matchedCourseKeys.length > 0
            ? scheduleMatch.matchedCourseKeys.slice(0, 3).join(", ")
            : null;
    const more =
        scheduleMatch.status === "course_not_taught" && scheduleMatch.matchedCourseKeys.length > 3
            ? ` +${scheduleMatch.matchedCourseKeys.length - 3}`
            : "";

    return (
        <div className="flex max-w-48 flex-col gap-1" title={matchTitle(scheduleMatch)}>
            <Badge
                variant={scheduleMatch.status === "course_not_taught" ? "destructive" : "outline"}
                className="w-fit rounded-md whitespace-normal"
            >
                {LABELS[scheduleMatch.status]}
            </Badge>
            {taught && (
                <span className="text-xs text-muted-foreground">
                    Taught: {taught}
                    {more}
                </span>
            )}
        </div>
    );
}
