import { describe, expect, it } from "vitest";
import { courseNumParser, courseReviewsKey } from "@backend/utils/courseNum";

describe("courseNumParser", () => {
    it("accepts historical quarter numbers and semester numbers", () => {
        expect(courseNumParser.parse(101)).toBe(101);
        expect(courseNumParser.parse(599)).toBe(599);
        expect(courseNumParser.parse(1000)).toBe(1000);
        expect(courseNumParser.parse(2231)).toBe(2231);
        expect(courseNumParser.parse(5999)).toBe(5999);
    });

    it("rejects numbers outside quarter and semester ranges", () => {
        expect(courseNumParser.safeParse(99).success).toBe(false);
        expect(courseNumParser.safeParse(600).success).toBe(false);
        expect(courseNumParser.safeParse(999).success).toBe(false);
        expect(courseNumParser.safeParse(6000).success).toBe(false);
        expect(courseNumParser.safeParse(101.5).success).toBe(false);
    });
});

describe("courseReviewsKey", () => {
    it("formats department and number with a single space", () => {
        expect(courseReviewsKey("PHIL", 231)).toBe("PHIL 231");
        expect(courseReviewsKey("PHIL", 2231)).toBe("PHIL 2231");
    });
});
