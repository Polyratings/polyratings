import { describe, expect, test } from "vitest";
import { TRPCClientError } from "@trpc/client";
import { getApiErrorMessage, isExpectedSilentQueryError } from "./getApiErrorMessage";

describe("getApiErrorMessage", () => {
    test("uses fallback for tRPC errors whose message is a bare procedure code", () => {
        const err = new TRPCClientError("NOT_FOUND", {});
        expect(getApiErrorMessage(err, "Could not load.")).toBe("Could not load.");
    });

    test("uses fallback when a bare code appears on a TRPC error in the cause chain", () => {
        const inner = new TRPCClientError("UNAUTHORIZED", {});
        const outer = new Error("outer");
        outer.cause = inner;
        expect(getApiErrorMessage(outer, "Please sign in.")).toBe("Please sign in.");
    });

    test("returns readable tRPC messages when present", () => {
        const err = new TRPCClientError("That professor could not be found.", {});
        expect(getApiErrorMessage(err, "fallback")).toBe("That professor could not be found.");
    });

    test("returns a readable nested TRPCClientError instead of the wrapper message", () => {
        const inner = new TRPCClientError("That professor could not be found.", {});
        const outer = new Error("Failed to fetch");
        outer.cause = inner;
        expect(getApiErrorMessage(outer, "fallback")).toBe("That professor could not be found.");
    });

    test("uses fallback for string errors that look like bare codes", () => {
        expect(getApiErrorMessage("BAD_REQUEST", "Try again.")).toBe("Try again.");
    });

    test("returns non-code string errors", () => {
        expect(getApiErrorMessage("Network dropped", "fallback")).toBe("Network dropped");
    });

    test("returns fallback for unknown / empty errors", () => {
        expect(getApiErrorMessage(null, "fallback")).toBe("fallback");
        expect(getApiErrorMessage(new Error(""), "fallback")).toBe("fallback");
    });
});

describe("isExpectedSilentQueryError", () => {
    test("is true for NOT_FOUND / UNAUTHORIZED tRPC codes", () => {
        const notFound = new TRPCClientError("missing");
        Object.assign(notFound, { data: { code: "NOT_FOUND" } });
        const unauthorized = new TRPCClientError("denied");
        Object.assign(unauthorized, { data: { code: "UNAUTHORIZED" } });
        expect(isExpectedSilentQueryError(notFound)).toBe(true);
        expect(isExpectedSilentQueryError(unauthorized)).toBe(true);
    });

    test("is false for other errors", () => {
        const timeout = new TRPCClientError("timeout");
        Object.assign(timeout, { data: { code: "TIMEOUT" } });
        expect(isExpectedSilentQueryError(timeout)).toBe(false);
        expect(isExpectedSilentQueryError(new Error("boom"))).toBe(false);
    });
});
