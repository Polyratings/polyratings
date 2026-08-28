import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";

import { CourseFilterBar } from "./CourseFilterBar";

function renderFilter(courses: string[]) {
    return render(
        <MemoryRouter initialEntries={["/professor/1"]}>
            <CourseFilterBar courses={courses} />
        </MemoryRouter>,
    );
}

describe("CourseFilterBar (accessibility)", () => {
    it("drills from department to course when a professor teaches several departments", async () => {
        const { container } = renderFilter(["CSC 101", "CSC 202", "CPE 101"]);

        expect(screen.queryByRole("button", { name: "CSC 202" })).toBeNull();

        fireEvent.click(screen.getByRole("button", { name: "CSC" }));
        expect(screen.getByRole("button", { name: "CSC" })).toHaveAttribute("aria-pressed", "true");

        fireEvent.click(screen.getByRole("button", { name: "CSC 202" }));
        expect(screen.getByRole("button", { name: "CSC 202" })).toHaveAttribute(
            "aria-pressed",
            "true",
        );

        const results = await axe(container);
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });

    it("shows course numbers up front when there is only one department", async () => {
        const { container } = renderFilter(["CSC 101", "CSC 202"]);

        fireEvent.click(screen.getByRole("button", { name: "CSC 202" }));
        expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
            "aria-pressed",
            "false",
        );

        const results = await axe(container);
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });
});
