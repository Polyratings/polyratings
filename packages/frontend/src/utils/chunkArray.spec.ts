import { describe, expect, test } from "vitest";
import { chunkArray, mapInBatches } from "@backend/utils/chunkArray";

describe("chunkArray", () => {
    test("splits into even chunks with a remainder", () => {
        expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    test("returns an empty array for empty input", () => {
        expect(chunkArray([], 3)).toEqual([]);
    });

    test("returns a single chunk when size is larger than the array", () => {
        expect(chunkArray([1, 2], 10)).toEqual([[1, 2]]);
    });

    test("throws when size is not greater than 0", () => {
        expect(() => chunkArray([1], 0)).toThrow("Chunk size must be greater than 0");
        expect(() => chunkArray([1], -1)).toThrow("Chunk size must be greater than 0");
    });
});

describe("mapInBatches", () => {
    test("preserves order across windows", async () => {
        const result = await mapInBatches([1, 2, 3, 4, 5], 2, async (n) => n * 2);
        expect(result).toEqual([2, 4, 6, 8, 10]);
    });

    test("never exceeds the requested concurrency", async () => {
        let inFlight = 0;
        let maxInFlight = 0;
        const items = Array.from({ length: 20 }, (_, i) => i);

        await mapInBatches(items, 5, async () => {
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            await new Promise((resolve) => {
                setTimeout(resolve, 15);
            });
            inFlight -= 1;
        });

        expect(maxInFlight).toBeLessThanOrEqual(5);
        expect(maxInFlight).toBe(5);
    });

    test("throws when concurrency is not greater than 0", async () => {
        await expect(mapInBatches([1], 0, async (n) => n)).rejects.toThrow(
            "Concurrency must be greater than 0",
        );
    });
});
