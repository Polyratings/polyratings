import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";

import { Rating } from "./Rating";

describe("Rating (accessibility)", () => {
    it("exposes a 0-4 star image name and has no axe violations", async () => {
        const { container } = render(<Rating value={3.25} />);

        expect(screen.getByRole("img", { name: "3.25 out of 4 stars" })).toBeTruthy();
        const results = await axe(container);
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });
});
