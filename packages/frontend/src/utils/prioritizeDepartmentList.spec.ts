import { describe, expect, it } from "vitest";
import { prioritizeDepartmentList } from "./prioritizeDepartmentList";

describe("prioritizeDepartmentList", () => {
    const departments = ["AERO", "CSC", "MATH", "ME"] as const;

    it("moves priority values to the front in priority order", () => {
        expect(prioritizeDepartmentList(departments, ["MATH", "CSC"])).toEqual([
            "MATH",
            "CSC",
            "AERO",
            "ME",
        ]);
    });

    it("ignores unknown priority values and duplicates", () => {
        expect(prioritizeDepartmentList(departments, ["ZZZ", "CSC", "CSC", "ME"])).toEqual([
            "CSC",
            "ME",
            "AERO",
            "MATH",
        ]);
    });

    it("returns the original order when priority is empty", () => {
        expect(prioritizeDepartmentList(departments, [])).toEqual([...departments]);
    });
});
