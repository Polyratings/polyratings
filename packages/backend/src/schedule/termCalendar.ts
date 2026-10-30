/**
 * Approximate term windows. End dates match the schedule scraper's
 * `approximateTermEndDate`. Starts tile the calendar so each day falls in at
 * most one season. These are not registrar dates.
 */

type TermSeason = "winter" | "spring" | "summer" | "fall";

const SEASON_BY_DIGIT: Record<string, TermSeason> = {
    "2": "winter",
    "4": "spring",
    "6": "summer",
    "8": "fall",
};

export type TermWindow = {
    start: Date;
    end: Date;
};

function utcMidnight(year: number, monthIndex: number, day: number): Date {
    return new Date(Date.UTC(year, monthIndex, day));
}

function utcDay(date: Date): number {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function approximateTermWindow(termCode: string): TermWindow | null {
    if (!/^\d{4}$/.test(termCode)) {
        return null;
    }

    const season = SEASON_BY_DIGIT[termCode[3]!];
    if (!season) {
        return null;
    }

    const year = 1800 + Number(termCode[0]) * 100 + Number(termCode.slice(1, 3));

    switch (season) {
        case "winter":
            return { start: utcMidnight(year, 0, 1), end: utcMidnight(year, 2, 25) };
        case "spring":
            return { start: utcMidnight(year, 2, 26), end: utcMidnight(year, 5, 15) };
        case "summer":
            return { start: utcMidnight(year, 5, 16), end: utcMidnight(year, 7, 10) };
        case "fall":
            return { start: utcMidnight(year, 7, 11), end: utcMidnight(year, 11, 31) };
    }
}

export function isInstantInTermWindow(instant: Date, window: TermWindow): boolean {
    const day = utcDay(instant);
    return day >= utcDay(window.start) && day <= utcDay(window.end);
}
