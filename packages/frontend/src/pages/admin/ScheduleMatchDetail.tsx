import { approximateTermWindow } from "@backend/schedule/termCalendar";
import type { ScheduleMatch } from "@backend/schedule/schema";
import { ScheduleMatchBadge } from "@/pages/admin/ScheduleMatchBadge";

const SEASON_LABEL: Record<string, string> = {
    "2": "winter",
    "4": "spring",
    "6": "summer",
    "8": "fall",
};

function termSeasonYear(termCode: string) {
    const season = SEASON_LABEL[termCode[3] ?? ""];
    const window = approximateTermWindow(termCode);
    if (!season || !window) {
        return null;
    }
    return { season, year: window.start.getUTCFullYear() };
}

/** "winter, spring 2026" or "fall 2026, winter 2027". Unknown codes stay as-is. */
export function checkedTermsPhrase(termCodes: string[]) {
    const parts: string[] = [];
    let seasons: string[] = [];
    let year: number | null = null;

    const flush = () => {
        if (seasons.length === 0 || year == null) {
            return;
        }
        parts.push(`${seasons.join(", ")} ${year}`);
        seasons = [];
        year = null;
    };

    for (const termCode of termCodes) {
        const parsed = termSeasonYear(termCode);
        if (!parsed) {
            flush();
            parts.push(termCode);
            continue;
        }
        if (year != null && parsed.year !== year) {
            flush();
        }
        year = parsed.year;
        seasons.push(parsed.season);
    }
    flush();
    return parts.join(", ");
}

export function ScheduleMatchDetail({
    scheduleMatch,
}: {
    scheduleMatch: ScheduleMatch | null | undefined;
}) {
    if (!scheduleMatch) {
        return null;
    }

    const taught =
        scheduleMatch.matchedCourseKeys.length > 0
            ? scheduleMatch.matchedCourseKeys.join(", ")
            : "No sections";
    const checked = checkedTermsPhrase(scheduleMatch.termCodesChecked);
    const showTaught = scheduleMatch.status === "course_not_taught" && checked.length > 0;

    if (scheduleMatch.status === "not_applicable" && checked) {
        return (
            <p className="text-sm text-foreground">
                <span className="text-muted-foreground">Checked </span>
                {checked}
            </p>
        );
    }

    return (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <ScheduleMatchBadge scheduleMatch={scheduleMatch} />
            {showTaught && (
                <p className="text-sm text-foreground">
                    {taught}
                    <span className="text-muted-foreground"> on this schedule </span>
                    {checked}
                </p>
            )}
        </div>
    );
}
