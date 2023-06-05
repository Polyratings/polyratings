import { renderHook, RenderResult } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { waitFor } from "@testing-library/dom";
import { describe, test, beforeEach, expect } from "vitest";
import { setWindowSize } from "@/test-utils";
import { useWindowSize, Size } from "./useWindowSize";

let result: RenderResult<Size>;
describe("UseWindowSize", () => {
    beforeEach(() => {
        ({ result } = renderHook(() => useWindowSize()));
    });

    test("Has browser value", () => {
        expect(result.current.width).toBe(window.innerWidth);
        expect(result.current.height).toBe(window.innerHeight);
    });

    test("Is dynamic to window size", async () => {
        act(() => {
            setWindowSize(2000, 1000);
        });
        await waitFor(() => {
            expect(result.current.width).toBe(2000);
            expect(result.current.height).toBe(1000);
        });
    });
});
