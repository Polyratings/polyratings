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

    // Fall semester PeopleSoft keys often use 1000 + catalog number (e.g. ENGL 134 → ENGL 1134).
    if (catalogNum >= 100 && catalogNum <= 599) {
        add(courseReviewsKey(dept, 1000 + catalogNum));
    }

    return keys;
}
