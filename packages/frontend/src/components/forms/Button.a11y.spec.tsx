import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";

import { Button } from "./Button";

describe("Button (accessibility)", () => {
    it("has no axe violations", async () => {
        const { container } = render(<Button type="button">Submit</Button>);
        const results = await axe(container);
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });
});
