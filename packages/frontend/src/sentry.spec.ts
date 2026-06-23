import { describe, expect, test } from "vitest";
import { isSpuriousUnhandledRejectionNoise } from "./sentry";

describe("isSpuriousUnhandledRejectionNoise", () => {
    test("filters undefined rejections", () => {
        expect(isSpuriousUnhandledRejectionNoise(undefined)).toBe(true);
    });

    test("filters null rejections", () => {
        expect(isSpuriousUnhandledRejectionNoise(null)).toBe(true);
    });

    test("filters CustomEvent unhandledrejection with null detail", () => {
        const event = new CustomEvent("unhandledrejection");

        expect(isSpuriousUnhandledRejectionNoise(event)).toBe(true);
    });

    test("does not filter real Error rejections", () => {
        expect(isSpuriousUnhandledRejectionNoise(new Error("something failed"))).toBe(false);
    });

    test("does not filter CustomEvent unhandledrejection with nested Error detail", () => {
        const event = new CustomEvent("unhandledrejection", {
            detail: { reason: new Error("x") },
        });

        expect(isSpuriousUnhandledRejectionNoise(event)).toBe(false);
    });

    test("does not filter unrelated CustomEvent types", () => {
        const event = new CustomEvent("click");

        expect(isSpuriousUnhandledRejectionNoise(event)).toBe(false);
    });

    test("does not filter string rejections", () => {
        expect(isSpuriousUnhandledRejectionNoise("something went wrong")).toBe(false);
    });
});
