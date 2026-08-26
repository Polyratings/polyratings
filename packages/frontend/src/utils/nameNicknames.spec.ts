import { describe, expect, test } from "vitest";
import { namesAreNicknames } from "./nameNicknames";

describe("namesAreNicknames", () => {
    test("matches nicknames in both directions", () => {
        expect(namesAreNicknames("jim", "james")).toBe(true);
        expect(namesAreNicknames("james", "jim")).toBe(true);
        expect(namesAreNicknames("chris", "christopher")).toBe(true);
        expect(namesAreNicknames("christopher", "chris")).toBe(true);
        expect(namesAreNicknames("mike", "michael")).toBe(true);
        expect(namesAreNicknames("bill", "william")).toBe(true);
    });

    test("does not merge distinct names that share a nickname", () => {
        expect(namesAreNicknames("christopher", "christine")).toBe(false);
        expect(namesAreNicknames("sam", "samantha")).toBe(true);
        expect(namesAreNicknames("samuel", "samantha")).toBe(false);
    });

    test("does not treat unrelated or identical names as nicknames", () => {
        expect(namesAreNicknames("chris", "chris")).toBe(false);
        expect(namesAreNicknames("ada", "grace")).toBe(false);
        expect(namesAreNicknames("lawson", "chris")).toBe(false);
    });
});
