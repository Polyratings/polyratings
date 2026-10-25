import { courseReviewsKey } from "@backend/utils/courseNum";

/** Canonical 3-digit course number used by the Schedule API catalog. */
export function canonicalScheduleCourseNum(courseNum: number): number {
    if (courseNum >= 1000) {
        return courseNum % 1000;
    }
    return courseNum;
}

/**
 * Candidate Schedule API course keys to try, canonical 3-digit first, then the
 * Polyratings review key (which may be 4-digit semester format).
 */
export function scheduleCourseKeyCandidates(department: string, courseNum: number): string[] {
    const dept = department.toUpperCase();
    const catalogNum = canonicalScheduleCourseNum(courseNum);
    const canonical = courseReviewsKey(dept, catalogNum);
    const reviewKey = courseReviewsKey(dept, courseNum);

    const keys: string[] = [];
    const add = (key: string) => {
        if (!keys.includes(key)) {
            keys.push(key);
        }
    };

    add(canonical);
    if (reviewKey !== canonical) {
        add(reviewKey);
    }

    // PeopleSoft semester numbers keep the catalog number and prefix the level:
    // ENGL 134 → ENGL 1134, BUS 387 → BUS 3387. 1xxx is the same rule for 100-level
    // courses; 200–999 need their own thousands digit, not a blanket +1000.
    if (catalogNum >= 100 && catalogNum <= 999) {
        add(courseReviewsKey(dept, 1000 + catalogNum));
        const levelPrefixed = Math.floor(catalogNum / 100) * 1000 + catalogNum;
        add(courseReviewsKey(dept, levelPrefixed));
    }

    return keys;
}
