import { describe, expect, it } from "vitest";
import { rankCourseInstructors } from "@backend/schedule/rankCourseInstructors";
import type { SectionOffering } from "@backend/schedule/schema";
import type { TruncatedProfessor } from "@backend/types/schema";

function section(instructorRaw: string, classNbr = "1"): SectionOffering {
    return {
        courseKey: "CSC 1001",
        section: "01",
        classNbr,
        instructorRaw,
        status: "OPEN",
        days: "MWF",
        time: "10:00AM",
    };
}

function professor(
    overrides: Partial<TruncatedProfessor> &
        Pick<TruncatedProfessor, "id" | "firstName" | "lastName">,
): TruncatedProfessor {
    return {
        department: "CSC",
        numEvals: 10,
        overallRating: 3.5,
        materialClear: 3.5,
        studentDifficulties: 3.5,
        courses: ["CSC 1001"],
        ...overrides,
    };
}

describe("rankCourseInstructors", () => {
    it("ranks matched professors by rating and eval count", () => {
        const professors = [
            professor({
                id: "00000000-0000-4000-8000-000000000001",
                firstName: "Alice",
                lastName: "Anderson",
                overallRating: 3.2,
                numEvals: 20,
            }),
            professor({
                id: "00000000-0000-4000-8000-000000000002",
                firstName: "Bob",
                lastName: "Baker",
                overallRating: 3.8,
                numEvals: 15,
            }),
        ];

        const result = rankCourseInstructors([section("Baker, Bob", "1")], professors);

        expect(result.topRated).toHaveLength(1);
        expect(result.topRated[0]?.professor.lastName).toBe("Baker");
    });

    it("separates top rated, limited ratings, and unrated instructors", () => {
        const professors = [
            professor({
                id: "00000000-0000-4000-8000-000000000001",
                firstName: "Alice",
                lastName: "Anderson",
                overallRating: 3.5,
                numEvals: 10,
            }),
            professor({
                id: "00000000-0000-4000-8000-000000000002",
                firstName: "Bob",
                lastName: "Baker",
                overallRating: 2.8,
                numEvals: 2,
            }),
            professor({
                id: "00000000-0000-4000-8000-000000000003",
                firstName: "Carol",
                lastName: "Clark",
                overallRating: 0,
                numEvals: 0,
            }),
        ];

        const result = rankCourseInstructors(
            [
                section("Anderson, Alice", "1"),
                section("Baker, Bob", "2"),
                section("Clark, Carol", "3"),
            ],
            professors,
        );

        expect(result.topRated.map((entry) => entry.professor.lastName)).toEqual(["Anderson"]);
        expect(result.otherRated.map((entry) => entry.professor.lastName)).toEqual(["Baker"]);
        expect(result.unrated.map((entry) => entry.professor.lastName)).toEqual(["Clark"]);
    });

    it("groups unmatched instructors separately", () => {
        const result = rankCourseInstructors([section("Unknown, Person", "9")], []);

        expect(result.unmatched).toHaveLength(1);
        expect(result.unmatched[0]?.instructorRaw).toBe("Unknown, Person");
    });
});
