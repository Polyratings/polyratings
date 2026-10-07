import { describe, expect, it } from "vitest";
import { classifyInstructorMapping } from "@backend/schedule/instructorMatch";
import type { TruncatedProfessor } from "@backend/types/schema";

function professor(
    overrides: Partial<TruncatedProfessor> &
        Pick<TruncatedProfessor, "id" | "firstName" | "lastName">,
): TruncatedProfessor {
    return {
        department: "ENGL",
        numEvals: 10,
        overallRating: 3.5,
        materialClear: 3.5,
        studentDifficulties: 3.5,
        courses: ["ENGL 1134"],
        ...overrides,
    };
}

describe("classifyInstructorMapping", () => {
    it("classifies Leslie St. John as high confidence", () => {
        const professors = [
            professor({
                id: "6447729f-af52-475c-bcd9-423d918998f1",
                firstName: "Leslie",
                lastName: "St. John",
            }),
        ];

        const result = classifyInstructorMapping("Leslie St. John", professors);
        expect(result.confidence).toBe("high");
        if (result.confidence === "high") {
            expect(result.professor.lastName).toBe("St. John");
        }
    });

    it("classifies Scott Hamilton as high when only Scott matches", () => {
        const professors = [
            professor({
                id: "00000000-0000-4000-8000-000000000001",
                firstName: "Stephen",
                lastName: "Hamilton",
            }),
            professor({
                id: "00000000-0000-4000-8000-000000000002",
                firstName: "Scott",
                lastName: "Hamilton",
            }),
        ];

        const result = classifyInstructorMapping("Scott Hamilton", professors);
        expect(result.confidence).toBe("high");
        if (result.confidence === "high") {
            expect(result.professor.firstName).toBe("Scott");
        }
    });

    it("classifies as medium when prefix matches collide but one exact first name wins", () => {
        const professors = [
            professor({
                id: "00000000-0000-4000-8000-000000000001",
                firstName: "Alexandra",
                lastName: "Lee",
            }),
            professor({
                id: "00000000-0000-4000-8000-000000000002",
                firstName: "Alex",
                lastName: "Lee",
            }),
        ];

        const result = classifyInstructorMapping("Lee, Alexandra", professors);
        expect(result.confidence).toBe("medium");
        if (result.confidence === "medium") {
            expect(result.professor.firstName).toBe("Alexandra");
        }
    });

    it("does not auto-link Stephen when schedule says Scott", () => {
        const professors = [
            professor({
                id: "00000000-0000-4000-8000-000000000001",
                firstName: "Stephen",
                lastName: "Hamilton",
            }),
            professor({
                id: "00000000-0000-4000-8000-000000000002",
                firstName: "Scott",
                lastName: "Hamilton",
            }),
        ];

        const result = classifyInstructorMapping("Scott Hamilton", professors);
        if (result.confidence === "high" || result.confidence === "medium") {
            expect(result.professor.firstName).not.toBe("Stephen");
        }
    });

    it("classifies initial-only matches as low confidence", () => {
        const professors = [
            professor({
                id: "00000000-0000-4000-8000-000000000001",
                firstName: "John",
                lastName: "Smith",
            }),
        ];

        expect(classifyInstructorMapping("Smith, J.", professors).confidence).toBe("low");
    });

    it("skips placeholder instructors", () => {
        expect(classifyInstructorMapping("TBA", []).confidence).toBe("reject");
    });
});
