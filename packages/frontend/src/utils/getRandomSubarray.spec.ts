import { describe, test, expect } from "vitest";
import { getRandomSubarray } from "./getRandomSubarray";

describe("Get Random Subarray", () => {
    test("Should return an array of the correct size", () => {
        const result = getRandomSubarray([1, 2, 3, 4], 2).length;
        expect(result).toBe(2);
    });

    test("Should be random two rounds in a row. This test can fail do to randomness but is unlikely", () => {
        const arr = Array(10_000)
            .fill(0)
            .map((_, i) => i);
        const run1 = getRandomSubarray(arr, 2);
        const run2 = getRandomSubarray(arr, 2);
        expect(run1).not.toEqual(run2);
    });
});
