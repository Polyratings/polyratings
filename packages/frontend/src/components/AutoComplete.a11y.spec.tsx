import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";

import { AutoComplete } from "./AutoComplete";

describe("AutoComplete (accessibility)", () => {
    it("exposes a combobox named from the label prop", async () => {
        const { container } = render(
            <AutoComplete
                items={["Ada Lovelace"]}
                filterFn={(items, inputValue) =>
                    items
                        .filter((item) => item.toLowerCase().includes(inputValue.toLowerCase()))
                        .map((item) => ({ label: item, value: item }))
                }
                onChange={() => {}}
                placeholder="Professor Name"
                label="Professor Auto-complete"
                inputValue=""
                disableDropdown
            />,
        );

        expect(screen.getByRole("combobox", { name: "Professor Auto-complete" })).toBeTruthy();
        const results = await axe(container);
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });
});
