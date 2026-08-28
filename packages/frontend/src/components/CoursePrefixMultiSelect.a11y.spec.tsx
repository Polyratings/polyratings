import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

import { CoursePrefixMultiSelect } from "./CoursePrefixMultiSelect";

describe("CoursePrefixMultiSelect (accessibility)", () => {
    it("exposes a searchable multi-select with removable selections", async () => {
        const onChange = vi.fn();
        const { container } = render(
            <CoursePrefixMultiSelect
                options={["CSC", "CPE"]}
                selected={["CSC"]}
                onChange={onChange}
            />,
        );

        const input = screen.getByRole("combobox", { name: "Search course prefixes" });
        fireEvent.focus(input);
        fireEvent.click(screen.getByRole("option", { name: "CPE" }));

        expect(onChange).toHaveBeenCalledWith(["CSC", "CPE"]);
        expect(screen.getByRole("button", { name: "Remove CSC" })).toBeTruthy();

        const results = await axe(container);
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });
});
