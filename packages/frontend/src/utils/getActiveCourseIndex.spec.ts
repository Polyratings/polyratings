import { describe, it, expect } from "vitest";
import { getActiveCourseIndex } from "./getActiveCourseIndex";

describe("getActiveCourseIndex", () => {
    it("returns -1 when no sections are visible", () => {
        expect(getActiveCourseIndex([0, 0, 0])).toBe(-1);
        expect(getActiveCourseIndex([])).toBe(-1);
    });

    it("returns the index of the section with highest visibility ratio", () => {
        expect(getActiveCourseIndex([0.05, 0.5, 0.3])).toBe(1);
        expect(getActiveCourseIndex([0.1, 0.3, 0.7, 0.2])).toBe(2);
        expect(getActiveCourseIndex([0.9, 0.5, 0.3])).toBe(0);
    });

    it("handles equal visibility ratios by preferring the first one", () => {
        expect(getActiveCourseIndex([0.5, 0.5, 0.2])).toBe(0);
        expect(getActiveCourseIndex([0.05, 0.3, 0.3])).toBe(1);
    });

    it("activates sections with any visibility above zero", () => {
        expect(getActiveCourseIndex([0.01, 0, 0])).toBe(0);
        expect(getActiveCourseIndex([0, 0.01, 0])).toBe(1);
        expect(getActiveCourseIndex([0.001, 0.002, 0])).toBe(1);
    });

    it("handles the last section case (short content)", () => {
        // Simulates a last section with minimal content that's 30% visible
        expect(getActiveCourseIndex([0, 0, 0.3])).toBe(2);

        // Multiple sections visible, choose the most visible
        expect(getActiveCourseIndex([0.05, 0.4, 0.3])).toBe(1);

        // Last section is most visible
        expect(getActiveCourseIndex([0.2, 0.3, 0.8])).toBe(2);
    });

    it("handles normal scrolling scenarios with small visibility ratios", () => {
        // Normal scrolling where sections have small visibility ratios
        expect(getActiveCourseIndex([0.05, 0.08, 0.02])).toBe(1);
        expect(getActiveCourseIndex([0.02, 0.01, 0.09])).toBe(2);
        expect(getActiveCourseIndex([0.1, 0.05, 0.03])).toBe(0);
    });
});
