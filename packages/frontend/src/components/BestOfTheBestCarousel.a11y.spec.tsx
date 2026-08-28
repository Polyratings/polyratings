import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { TruncatedProfessor } from "@backend/types/schema";

import { BestOfTheBestCarousel } from "./BestOfTheBestCarousel";

function makeProfessor(
    overrides: Partial<TruncatedProfessor> &
        Pick<TruncatedProfessor, "id" | "firstName" | "lastName">,
): TruncatedProfessor {
    return {
        department: "CSC",
        numEvals: 40,
        overallRating: 3.9,
        materialClear: 3.8,
        studentDifficulties: 3.7,
        courses: ["CSC 101", "CSC 202"],
        ...overrides,
    };
}

const professors = [
    makeProfessor({
        id: "11111111-1111-4111-8111-111111111111",
        firstName: "Ada",
        lastName: "Lovelace",
    }),
    makeProfessor({
        id: "22222222-2222-4222-8222-222222222222",
        firstName: "Grace",
        lastName: "Hopper",
        department: "CPE",
        overallRating: 3.85,
    }),
];

describe("BestOfTheBestCarousel (accessibility)", () => {
    it("exposes the hall of fame carousel and has no axe violations", async () => {
        const { container } = render(
            <MemoryRouter>
                <BestOfTheBestCarousel
                    professors={professors}
                    isPending={false}
                    error={undefined}
                />
            </MemoryRouter>,
        );

        expect(screen.getByRole("heading", { name: "Best of the Best" })).toBeTruthy();
        expect(screen.getByRole("region", { name: "Best of the Best" })).toBeTruthy();
        expect(screen.getByRole("link", { name: /Lovelace, Ada/ })).toBeTruthy();
        expect(screen.getByRole("button", { name: "Previous slide" })).toBeTruthy();
        expect(screen.getByRole("button", { name: "Next slide" })).toBeTruthy();

        const results = await axe(container);
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });
});
