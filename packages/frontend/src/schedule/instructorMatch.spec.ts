import { describe, expect, it } from "vitest";
import { findMatchingProfessor, matchesProfessor } from "@backend/schedule/instructorMatch";
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

describe("matchesProfessor", () => {
    it("matches full first and last names", () => {
        expect(
            matchesProfessor("Hamilton, Scott", {
                firstName: "Scott",
                lastName: "Hamilton",
            }),
        ).toBe(true);
    });

    it("matches abbreviated first names", () => {
        expect(
            matchesProfessor("Smith, J.", {
                firstName: "John",
                lastName: "Smith",
            }),
        ).toBe(true);
    });

    it("does not match different first names with the same last name", () => {
        expect(
            matchesProfessor("Scott Hamilton", {
                firstName: "Stephen",
                lastName: "Hamilton",
            }),
        ).toBe(false);
    });

    it("matches multi-word last names in First Last format", () => {
        expect(
            matchesProfessor("Leslie St. John", {
                firstName: "Leslie",
                lastName: "St. John",
            }),
        ).toBe(true);
    });
});

describe("findMatchingProfessor", () => {
    it("returns the professor with an exact first-name match when last names collide", () => {
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

        expect(findMatchingProfessor("Scott Hamilton", professors)?.firstName).toBe("Scott");
    });

    it("returns undefined when multiple professors match ambiguously", () => {
        const professors = [
            professor({
                id: "00000000-0000-4000-8000-000000000001",
                firstName: "John",
                lastName: "Smith",
            }),
            professor({
                id: "00000000-0000-4000-8000-000000000002",
                firstName: "Jon",
                lastName: "Smith",
            }),
        ];

        expect(findMatchingProfessor("Smith, J.", professors)).toBeUndefined();
    });

    it("matches Leslie St. John from schedule text", () => {
        const professors = [
            professor({
                id: "6447729f-af52-475c-bcd9-423d918998f1",
                firstName: "Leslie",
                lastName: "St. John",
            }),
        ];

        expect(findMatchingProfessor("Leslie St. John", professors)?.lastName).toBe("St. John");
    });
});
