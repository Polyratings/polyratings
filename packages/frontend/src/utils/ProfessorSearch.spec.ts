import { describe, expect, test } from "vitest";
import { TruncatedProfessor } from "@backend/types/schema";
import { professorSearch } from "./ProfessorSearch";

function makeProfessor(
    overrides: Partial<TruncatedProfessor> &
        Pick<TruncatedProfessor, "id" | "firstName" | "lastName">,
): TruncatedProfessor {
    return {
        department: "CSC",
        numEvals: 20,
        overallRating: 3.5,
        materialClear: 3.5,
        studentDifficulties: 3.5,
        courses: ["CSC 101"],
        ...overrides,
    };
}

const now = Date.parse("2026-08-23T00:00:00.000Z");

const chrisLawson = makeProfessor({
    id: "11111111-1111-4111-8111-111111111111",
    firstName: "Chris",
    lastName: "Lawson",
    numEvals: 40,
    overallRating: 3.6,
    lastRatingDate: "2026-01-15T00:00:00.000Z",
});
const christopherLane = makeProfessor({
    id: "22222222-2222-4222-8222-222222222222",
    firstName: "Christopher",
    lastName: "Lane",
    numEvals: 80,
    overallRating: 3.9,
    lastRatingDate: "2026-06-01T00:00:00.000Z",
});
const michaelChen = makeProfessor({
    id: "33333333-3333-4333-8333-333333333333",
    firstName: "Michael",
    lastName: "Chen",
    numEvals: 12,
    overallRating: 3.2,
    lastRatingDate: "2025-09-01T00:00:00.000Z",
});
const michaelChristensen = makeProfessor({
    id: "44444444-4444-4444-8444-444444444444",
    firstName: "Michael",
    lastName: "Christensen",
    numEvals: 90,
    overallRating: 3.9,
    lastRatingDate: "2026-04-01T00:00:00.000Z",
});
const staleHighRated = makeProfessor({
    id: "55555555-5555-4555-8555-555555555555",
    firstName: "Ada",
    lastName: "Lovelace",
    numEvals: 8,
    overallRating: 4,
    lastRatingDate: "2016-01-01T00:00:00.000Z",
});
const noEvals = makeProfessor({
    id: "66666666-6666-4666-8666-666666666666",
    firstName: "Grace",
    lastName: "Hopper",
    numEvals: 0,
    overallRating: 0,
});
const recentEstablished = makeProfessor({
    id: "77777777-7777-4777-8777-777777777777",
    firstName: "Alan",
    lastName: "Turing",
    numEvals: 60,
    overallRating: 3.8,
    lastRatingDate: "2026-05-01T00:00:00.000Z",
    courses: ["CSC 445"],
});
const jamesSmith = makeProfessor({
    id: "88888888-8888-4888-8888-888888888888",
    firstName: "James",
    lastName: "Smith",
    numEvals: 25,
    overallRating: 3.4,
    lastRatingDate: "2026-03-01T00:00:00.000Z",
});
const williamJones = makeProfessor({
    id: "99999999-9999-4999-8999-999999999999",
    firstName: "William",
    lastName: "Jones",
    numEvals: 18,
    overallRating: 3.1,
    lastRatingDate: "2026-02-01T00:00:00.000Z",
});

const professors = [
    noEvals,
    staleHighRated,
    christopherLane,
    chrisLawson,
    michaelChristensen,
    michaelChen,
    recentEstablished,
    jamesSmith,
    williamJones,
];

function search(
    query: string,
    type: "name" | "class" = "name",
    options: { includeStale?: boolean } = {},
) {
    return professorSearch(professors, type, query, { now, ...options }).map(
        (professor) => `${professor.lastName}, ${professor.firstName}`,
    );
}

describe("professorSearch name matching", () => {
    test("ranks first-last queries the same as last-first queries", () => {
        expect(search("chris lawson")[0]).toBe("Lawson, Chris");
        expect(search("lawson chris")[0]).toBe("Lawson, Chris");
        expect(search("Lawson, Chris")[0]).toBe("Lawson, Chris");
    });

    test("does not let a last-name prefix beat an exact last name while typing", () => {
        expect(search("michael ch")[0]).toBe("Chen, Michael");
        expect(search("michael chen")[0]).toBe("Chen, Michael");
        expect(search("chris l")[0]).toBe("Lawson, Chris");
    });

    test("does not keep partial-token matches after a second name token", () => {
        expect(search("chris z")).toEqual([]);
        expect(search("michael chen")).not.toContain("Christensen, Michael");
    });

    test("single-token last names still match", () => {
        expect(search("lawson")[0]).toBe("Lawson, Chris");
    });

    test("matches common nicknames in either direction", () => {
        expect(search("jim smith")[0]).toBe("Smith, James");
        expect(search("james smith")[0]).toBe("Smith, James");
        expect(search("bill jones")[0]).toBe("Jones, William");
        expect(search("william jones")[0]).toBe("Jones, William");
        expect(search("christopher lawson")).toContain("Lawson, Chris");
        expect(search("mike chen")[0]).toBe("Chen, Michael");
    });

    test("exact given names still rank above nickname equivalents", () => {
        expect(search("chris")[0]).toBe("Lawson, Chris");
        expect(search("christopher")[0]).toBe("Lane, Christopher");
    });
});

describe("professorSearch quality ranking", () => {
    test("empty name search hides professors without a rating in 3 years", () => {
        const names = search("");
        expect(names).not.toContain("Lovelace, Ada");
        expect(names.at(-1)).toBe("Hopper, Grace");
        expect(names[0]).toBe("Christensen, Michael");
    });

    test("exact last-name search can still find a stale professor", () => {
        expect(search("lovelace")).toContain("Lovelace, Ada");
        expect(search("ada lovelace")[0]).toBe("Lovelace, Ada");
        expect(search("ada")).not.toContain("Lovelace, Ada");
    });

    test("includeStale keeps inactive professors in admin-style search", () => {
        expect(search("", "name", { includeStale: true })).toContain("Lovelace, Ada");
    });

    test("class search keeps course matches and ranks them by quality", () => {
        expect(search("CSC 445", "class")).toEqual(["Turing, Alan"]);
        const unfiltered = search("", "class");
        expect(unfiltered[0]).toBe("Christensen, Michael");
        expect(unfiltered).not.toContain("Lovelace, Ada");
        expect(unfiltered.at(-1)).toBe("Hopper, Grace");
    });
});
