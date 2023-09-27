import "isomorphic-fetch";
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
    cleanup();
});

// Define to stop tests from erroring
// eslint-disable-next-line @typescript-eslint/no-empty-function
window.scrollTo = () => {};
// eslint-disable-next-line @typescript-eslint/no-empty-function
window.scroll = () => {};
