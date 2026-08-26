import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PageMeta } from "./PageMeta";

afterEach(() => {
    cleanup();
    document.getElementById("page-json-ld")?.remove();
});

describe("PageMeta", () => {
    it("writes title, description, canonical, and robots into the document head", () => {
        render(<PageMeta title="About" description="History of Polyratings." path="/about" />);

        expect(document.title).toBe("About · Polyratings");
        expect(document.querySelector("meta[name=description]")?.getAttribute("content")).toBe(
            "History of Polyratings.",
        );
        expect(document.querySelector("link[rel=canonical]")?.getAttribute("href")).toBe(
            "https://polyratings.dev/about",
        );
        expect(document.querySelector("meta[name=robots]")?.getAttribute("content")).toBe(
            "index, follow",
        );
        expect(document.querySelector("[property='og:title']")?.getAttribute("content")).toBe(
            "About · Polyratings",
        );
    });

    it("marks noindex pages and injects JSON-LD", () => {
        render(
            <PageMeta
                title="Page not found"
                description="Missing."
                path="/missing"
                noindex
                jsonLd={{ "@type": "Person", name: "Test" }}
            />,
        );

        expect(document.querySelector("meta[name=robots]")?.getAttribute("content")).toBe(
            "noindex, nofollow",
        );
        expect(document.getElementById("page-json-ld")?.textContent).toContain("Test");
    });
});
