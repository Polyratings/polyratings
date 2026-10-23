import { describe, expect, it } from "vitest";
import {
    compareCourseNames,
    getCourseNumber,
    getCoursePrefix,
    groupCoursesByPrefix,
    isSemesterCourseNumber,
} from "./groupCoursesByPrefix";

describe("groupCoursesByPrefix", () => {
    it("keeps first-seen prefix order and sorts courses within each prefix", () => {
        expect(groupCoursesByPrefix(["CSC 202", "CPE 101", "CSC 101"])).toEqual([
            { prefix: "CSC", courses: ["CSC 101", "CSC 202"] },
            { prefix: "CPE", courses: ["CPE 101"] },
        ]);
        expect(getCoursePrefix("CSC 101")).toBe("CSC");
        expect(getCourseNumber("CSC 101")).toBe("101");
    });

    it("prioritizes 4-digit semester courses before 3-digit quarter courses", () => {
        expect(isSemesterCourseNumber("1101")).toBe(true);
        expect(isSemesterCourseNumber("101")).toBe(false);
        expect(compareCourseNames("CSC 101", "CSC 1101")).toBeGreaterThan(0);
        expect(compareCourseNames("CSC 1101", "CSC 101")).toBeLessThan(0);
        expect(groupCoursesByPrefix(["CSC 101", "CSC 1101", "CSC 202"])).toEqual([
            { prefix: "CSC", courses: ["CSC 1101", "CSC 101", "CSC 202"] },
        ]);
    });
});
