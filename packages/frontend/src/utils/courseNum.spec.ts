import { describe, expect, it } from "vitest";
import {
    courseNumParser,
    courseReviewsKey,
    historicalCourseNumParser,
    isHistoricalCourseNum,
    isSemesterCourseKey,
    isSemesterCourseNum,
} from "@backend/utils/courseNum";

describe("courseNumParser", () => {
    it("accepts 4-digit semester numbers", () => {
        expect(courseNumParser.parse(1000)).toBe(1000);
        expect(courseNumParser.parse(2231)).toBe(2231);
        expect(courseNumParser.parse(5999)).toBe(5999);
    });

    it("rejects quarter numbers and values outside the semester range", () => {
        expect(courseNumParser.safeParse(99).success).toBe(false);
        expect(courseNumParser.safeParse(101).success).toBe(false);
        expect(courseNumParser.safeParse(599).success).toBe(false);
        expect(courseNumParser.safeParse(600).success).toBe(false);
        expect(courseNumParser.safeParse(999).success).toBe(false);
        expect(courseNumParser.safeParse(6000).success).toBe(false);
        expect(courseNumParser.safeParse(101.5).success).toBe(false);
    });
});

describe("historicalCourseNumParser", () => {
    it("accepts quarter and semester numbers for stored data", () => {
        expect(historicalCourseNumParser.parse(101)).toBe(101);
        expect(historicalCourseNumParser.parse(599)).toBe(599);
        expect(historicalCourseNumParser.parse(1000)).toBe(1000);
        expect(historicalCourseNumParser.parse(2231)).toBe(2231);
    });

    it("rejects numbers outside quarter and semester ranges", () => {
        expect(historicalCourseNumParser.safeParse(99).success).toBe(false);
        expect(historicalCourseNumParser.safeParse(600).success).toBe(false);
        expect(historicalCourseNumParser.safeParse(999).success).toBe(false);
        expect(historicalCourseNumParser.safeParse(6000).success).toBe(false);
    });
});

describe("isSemesterCourseNum", () => {
    it("identifies 4-digit semester numbers", () => {
        expect(isSemesterCourseNum(1101)).toBe(true);
        expect(isSemesterCourseNum(231)).toBe(false);
    });
});

describe("isHistoricalCourseNum", () => {
    it("accepts quarter and semester numbers", () => {
        expect(isHistoricalCourseNum(231)).toBe(true);
        expect(isHistoricalCourseNum(2231)).toBe(true);
        expect(isHistoricalCourseNum(600)).toBe(false);
    });
});

describe("isSemesterCourseKey", () => {
    it("checks the numeric portion of a course review key", () => {
        expect(isSemesterCourseKey("PHIL 2231")).toBe(true);
        expect(isSemesterCourseKey("PHIL 231")).toBe(false);
    });
});

describe("courseReviewsKey", () => {
    it("formats department and number with a single space", () => {
        expect(courseReviewsKey("PHIL", 231)).toBe("PHIL 231");
        expect(courseReviewsKey("PHIL", 2231)).toBe("PHIL 2231");
    });
});
