import { describe, expect, it } from "vitest";
import {
    analyzeInstructorLinks,
    buildTeachingProfile,
    scheduleCourseMatchesProfessor,
} from "@backend/schedule/instructorLinkAnalysis";
import type { TruncatedProfessor } from "@backend/types/schema";

function professor(
    overrides: Partial<TruncatedProfessor> &
        Pick<TruncatedProfessor, "id" | "firstName" | "lastName">,
): TruncatedProfessor {
    return {
        department: "CSC",
        numEvals: 20,
        overallRating: 3.5,
        materialClear: 3.5,
        studentDifficulties: 3.5,
        courses: ["CSC 357"],
        ...overrides,
    };
}

describe("scheduleCourseMatchesProfessor", () => {
    it("matches semester and quarter course key variants", () => {
        const prof = professor({
            id: "00000000-0000-4000-8000-000000000001",
            firstName: "Chris",
            lastName: "Clark",
            courses: ["CSC 357"],
        });

        expect(scheduleCourseMatchesProfessor("CSC 1357", prof)).toBe(true);
        expect(scheduleCourseMatchesProfessor("CSC 357", prof)).toBe(true);
    });
});

describe("analyzeInstructorLinks", () => {
    it("marks course overlap as verified", () => {
        const prof = professor({
            id: "00000000-0000-4000-8000-000000000001",
            firstName: "Chris",
            lastName: "Clark",
            department: "CSC",
            courses: ["CSC 357", "CSC 202"],
        });

        const result = analyzeInstructorLinks({
            professors: [prof],
            sections: [
                {
                    courseKey: "CSC 1357",
                    section: "S01-LEC",
                    classNbr: "1",
                    instructorRaw: "Chris Clark",
                },
            ],
        });

        expect(result.matched[0]?.verdict).toBe("verified");
    });

    it("flags department mismatch for wrong-subject link", () => {
        const prof = professor({
            id: "00000000-0000-4000-8000-000000000001",
            firstName: "Jane",
            lastName: "English",
            department: "ENGL",
            courses: ["ENGL 134", "ENGL 145"],
        });

        const result = analyzeInstructorLinks({
            professors: [prof],
            sections: [
                {
                    courseKey: "CSC 1357",
                    section: "S01-LEC",
                    classNbr: "1",
                    instructorRaw: "Jane English",
                },
                {
                    courseKey: "CSC 202",
                    section: "S02-LEC",
                    classNbr: "2",
                    instructorRaw: "Jane English",
                },
                {
                    courseKey: "CSC 1001",
                    section: "S03-LEC",
                    classNbr: "3",
                    instructorRaw: "Jane English",
                },
            ],
        });

        expect(result.matched[0]?.verdict).toMatch(/mismatch|wrong/);
    });

    it("identifies likely new faculty on schedule", () => {
        const result = analyzeInstructorLinks({
            professors: [],
            sections: [
                {
                    courseKey: "PHIL 1115",
                    section: "S01-LEC",
                    classNbr: "1",
                    instructorRaw: "Xylophone Zzzunique",
                },
                {
                    courseKey: "PHIL 2310",
                    section: "S02-LEC",
                    classNbr: "2",
                    instructorRaw: "Xylophone Zzzunique",
                },
                {
                    courseKey: "PHIL 1115",
                    section: "S03-LEC",
                    classNbr: "3",
                    instructorRaw: "Xylophone Zzzunique",
                },
            ],
        });

        expect(result.unmatchedSchedule[0]?.verdict).toBe("likely_new_faculty");
    });
});

describe("buildTeachingProfile", () => {
    it("derives primary department from section counts", () => {
        const profile = buildTeachingProfile("Example", [
            {
                courseKey: "CSC 357",
                section: "S01-LEC",
                classNbr: "1",
                instructorRaw: "Example",
            },
            {
                courseKey: "CSC 202",
                section: "S02-LEC",
                classNbr: "2",
                instructorRaw: "Example",
            },
            {
                courseKey: "MATH 1141",
                section: "S03-LEC",
                classNbr: "3",
                instructorRaw: "Example",
            },
        ]);

        expect(profile.primaryDepartment).toBe("CSC");
    });
});
