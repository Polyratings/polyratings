import { describe, expect, test } from "vitest";
import { TruncatedProfessor } from "@backend/types/schema";
import {
    applyProfessorFilters,
    createDefaultFilterState,
    FilterState,
    getEvaluationDomain,
} from "./applyProfessorFilters";

function makeProfessor(
    overrides: Partial<TruncatedProfessor> &
        Pick<TruncatedProfessor, "id" | "firstName" | "lastName">,
): TruncatedProfessor {
    return {
        department: "CSC",
        numEvals: 10,
        overallRating: 3,
        materialClear: 3,
        studentDifficulties: 3,
        courses: ["CSC 101"],
        ...overrides,
    };
}

const ada = makeProfessor({
    id: "11111111-1111-4111-8111-111111111111",
    firstName: "Ada",
    lastName: "Lovelace",
    overallRating: 4,
    numEvals: 20,
    courses: ["CSC 101"],
});
const alsu = makeProfessor({
    id: "22222222-2222-4222-8222-222222222222",
    firstName: "Grace",
    lastName: "Hopper",
    overallRating: 2,
    numEvals: 5,
    courses: ["CPE 123"],
});

function filters(overrides: Partial<FilterState> = {}): FilterState {
    return { ...createDefaultFilterState(), ...overrides };
}

describe("applyProfessorFilters", () => {
    test("returns all professors in original order with default filters", () => {
        expect(applyProfessorFilters([ada, alsu], createDefaultFilterState())).toEqual([ada, alsu]);
    });

    test("does not mutate the input array", () => {
        const input = [ada, alsu];
        applyProfessorFilters(input, filters({ sortBy: "alphabetical", reverseFilter: true }));
        expect(input).toEqual([ada, alsu]);
    });

    test("filters by overall rating range", () => {
        expect(applyProfessorFilters([ada, alsu], filters({ avgRatingFilter: [3.5, 4] }))).toEqual([
            ada,
        ]);
    });

    test("filters by selected course prefix", () => {
        const coursePrefixFilters = createDefaultFilterState().coursePrefixFilters.map(
            (coursePrefix) => ({
                ...coursePrefix,
                state: coursePrefix.name === "CPE",
            }),
        );
        expect(applyProfessorFilters([ada, alsu], filters({ coursePrefixFilters }))).toEqual([
            alsu,
        ]);
    });

    test("sorts alphabetically by last name, first name", () => {
        expect(applyProfessorFilters([ada, alsu], filters({ sortBy: "alphabetical" }))).toEqual([
            alsu,
            ada,
        ]);
    });

    test("reverses the current order", () => {
        expect(applyProfessorFilters([ada, alsu], filters({ reverseFilter: true }))).toEqual([
            alsu,
            ada,
        ]);
    });

    test("filters by evaluation count when a range is set", () => {
        expect(
            applyProfessorFilters([ada, alsu], filters({ numberOfEvaluationsFilter: [10, 50] })),
        ).toEqual([ada]);
    });
});

describe("getEvaluationDomain", () => {
    test("returns a fallback domain when there are no professors", () => {
        expect(getEvaluationDomain(undefined)).toEqual([0, 1]);
        expect(getEvaluationDomain([])).toEqual([0, 1]);
    });

    test("returns min and max evaluation counts", () => {
        expect(getEvaluationDomain([ada, alsu])).toEqual([5, 20]);
    });
});
