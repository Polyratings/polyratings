import { act, renderHook, RenderHookResult } from "@testing-library/react";
import { waitFor } from "@testing-library/dom";
import { describe, test, beforeEach, expect } from "vitest";
import { setWindowSize } from "@/test-utils";
import { useWindowSize, Size } from "./useWindowSize";

let result: RenderHookResult<Size, unknown>;
describe("UseWindowSize", () => {
    beforeEach(() => {
        result = renderHook(() => useWindowSize());
    });

    test("Has browser value", () => {
        expect(result.result.current.width).toBe(window.innerWidth);
        expect(result.result.current.height).toBe(window.innerHeight);
    });

    test("Is dynamic to window size", async () => {
        act(() => {
            setWindowSize(2000, 1000);
        });
        await waitFor(() => {
            expect(result.result.current.width).toBe(2000);
            expect(result.result.current.height).toBe(1000);
        });
    });
});
