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
window.scrollTo = () => {};
window.scroll = () => {};
// jsdom does not implement it; cmdk scrolls the active option into view.
Element.prototype.scrollIntoView = () => {};

window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
});

/* eslint-disable class-methods-use-this -- jsdom stub */
window.ResizeObserver = class {
    observe() {}

    unobserve() {}

    disconnect() {}
};

window.IntersectionObserver = class {
    observe() {}

    unobserve() {}

    disconnect() {}

    takeRecords() {
        return [];
    }

    root = null;

    rootMargin = "";

    scrollMargin = "";

    thresholds = [];
};
/* eslint-enable class-methods-use-this */
