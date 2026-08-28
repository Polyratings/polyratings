import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";

import { Stepper } from "./Stepper";

const steps = [
    { id: "review", label: "Write Review" },
    { id: "accessibility", label: "Course Accessibility" },
    { id: "confirm", label: "Confirm" },
] as const;

describe("Stepper (accessibility)", () => {
    it("marks the current step and has no axe violations", async () => {
        const { container } = render(
            <Stepper aria-label="Add professor steps" steps={steps} currentStep={1} />,
        );

        expect(screen.getByRole("navigation", { name: "Add professor steps" })).toBeTruthy();
        expect(
            screen.getByText("Course Accessibility").closest("li")?.getAttribute("aria-current"),
        ).toBe("step");
        const results = await axe(container);
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });
});
