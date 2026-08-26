import { describe, expect, it } from "vitest";
import { buildSitemapXml } from "@backend/utils/sitemap";
import {
    canonicalUrl,
    formatTitle,
    professorPageDescription,
    professorPageTitle,
    robotsContent,
    shouldNoindexHost,
} from "./seo";

describe("seo helpers", () => {
    it("formats titles with the site name", () => {
        expect(formatTitle()).toBe("Polyratings");
        expect(formatTitle("About")).toBe("About · Polyratings");
    });

    it("builds apex canonical URLs without trailing slashes except home", () => {
        expect(canonicalUrl("/")).toBe("https://polyratings.dev/");
        expect(canonicalUrl("/about/")).toBe("https://polyratings.dev/about");
        expect(canonicalUrl("faq")).toBe("https://polyratings.dev/faq");
    });

    it("noindexes non-production hosts", () => {
        expect(shouldNoindexHost("polyratings.dev")).toBe(false);
        expect(shouldNoindexHost("localhost")).toBe(false);
        expect(shouldNoindexHost("polyratings.pages.dev")).toBe(true);
        expect(shouldNoindexHost("www.polyratings.dev")).toBe(true);
        expect(robotsContent({ hostname: "polyratings.pages.dev" })).toBe("noindex, nofollow");
        expect(robotsContent({ noindex: true, hostname: "polyratings.dev" })).toBe(
            "noindex, nofollow",
        );
        expect(robotsContent({ hostname: "polyratings.dev" })).toBe("index, follow");
    });

    it("describes professor pages from live stats", () => {
        const professor = {
            firstName: "Parisa",
            lastName: "Mahjoor",
            department: "CHEM",
            numEvals: 17,
            overallRating: 0.64,
        };
        expect(professorPageTitle(professor)).toBe("Mahjoor, Parisa");
        expect(professorPageDescription(professor)).toBe(
            "Student ratings for Parisa Mahjoor (CHEM) at Cal Poly. 17 reviews, overall 0.64 out of 4.",
        );
    });
});

describe("sitemap xml", () => {
    it("includes static routes and professor lastmod when known", () => {
        const xml = buildSitemapXml([
            {
                id: "0038ea39-3910-4f80-9353-41dce33c754d",
                lastRatingDate: "2026-01-15T00:00:00.000Z",
            },
            { id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
        ]);
        expect(xml).toContain("<loc>https://polyratings.dev/</loc>");
        expect(xml).toContain("<loc>https://polyratings.dev/search/name</loc>");
        expect(xml).toContain(
            "<loc>https://polyratings.dev/professor/0038ea39-3910-4f80-9353-41dce33c754d</loc>",
        );
        expect(xml).toContain("<lastmod>2026-01-15</lastmod>");
        expect(xml).not.toContain("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\n    <lastmod>");
    });
});
