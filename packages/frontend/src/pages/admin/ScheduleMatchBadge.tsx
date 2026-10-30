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

export function ScheduleMatchBadge({
    scheduleMatch,
}: {
    scheduleMatch: ScheduleMatch | null | undefined;
}) {
    if (!scheduleMatch) {
        return <span className="text-xs text-muted-foreground">—</span>;
    }

    return (
        <Badge
            variant={scheduleMatch.status === "course_not_taught" ? "destructive" : "outline"}
            className="h-auto overflow-visible rounded-md whitespace-nowrap"
        >
            {LABELS[scheduleMatch.status]}
        </Badge>
    );
}
