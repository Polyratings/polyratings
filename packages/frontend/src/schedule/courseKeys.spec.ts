import { describe, expect, it } from "vitest";
import {
    canonicalScheduleCourseNum,
    scheduleCourseKeyCandidates,
} from "@backend/schedule/courseKeys";

describe("canonicalScheduleCourseNum", () => {
    it("returns quarter numbers unchanged", () => {
        expect(canonicalScheduleCourseNum(357)).toBe(357);
        expect(canonicalScheduleCourseNum(231)).toBe(231);
    });

    it("maps semester numbers to 3-digit catalog numbers", () => {
        expect(canonicalScheduleCourseNum(1357)).toBe(357);
        expect(canonicalScheduleCourseNum(3357)).toBe(357);
        expect(canonicalScheduleCourseNum(2231)).toBe(231);
    });
});

describe("scheduleCourseKeyCandidates", () => {
    it("tries canonical 3-digit key before semester alias", () => {
        expect(scheduleCourseKeyCandidates("CSC", 1357)).toEqual(["CSC 357", "CSC 1357"]);
    });

    it("includes semester fallback for quarter catalog numbers", () => {
        expect(scheduleCourseKeyCandidates("CSC", 357)).toEqual(["CSC 357", "CSC 1357"]);
    });

    it("includes 1000 + catalog fallback for quarter catalog numbers", () => {
        expect(scheduleCourseKeyCandidates("ENGL", 134)).toEqual(["ENGL 134", "ENGL 1134"]);
    });
});
