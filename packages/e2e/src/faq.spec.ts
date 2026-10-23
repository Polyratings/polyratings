import { expect, test } from "@playwright/test";

test("FAQ: faq page loads expected heading", async ({ page }) => {
    await page.goto("/faq");

    await test.step("FAQ-1: FAQ route heading renders", async () => {
        await expect(
            page.getByRole("heading", { name: "Frequently Asked Questions" }),
        ).toBeVisible();
    });
    await test.step("FAQ-2: FAQ explains how to rate Fall 2026+ 4-digit semester courses", async () => {
        await expect(
            page.getByRole("heading", {
                name: "How do I rate a class after Cal Poly switched to semesters?",
            }),
        ).toBeVisible();
    });
});

test("FAQ: lawsuit FAQ explains reporting and limits of Section 230", async ({ page }) => {
    await page.goto("/faq");

    await test.step("FAQ-3: lawsuit item tells people to report and does not claim they cannot sue", async () => {
        await page.getByRole("button", { name: /sue the crap out of you/i }).click();

        const lawsuitItem = page.locator("section").filter({
            has: page.getByRole("button", { name: /sue the crap out of you/i }),
        });

        await expect(lawsuitItem.getByText(/report it with the flag/i)).toBeVisible();
        await expect(
            lawsuitItem.getByRole("link", { name: "Section 230 of the Communications Decency Act" }),
        ).toHaveAttribute("href", "https://www.congress.gov/crs-product/R46751");
        await expect(lawsuitItem).not.toContainText("you can't sue Polyratings");
        await expect(lawsuitItem).not.toContainText("you really can't sue Polyratings");
    });
});

test("FAQ: reporting deep link opens lawsuit FAQ", async ({ page }) => {
    const firstFaqButton = page.getByRole("button", {
        name: "How do I know the ratings on a professor's page come from students?",
    });
    const lawsuitButton = page.getByRole("button", { name: /sue the crap out of you/i });

    await test.step("FAQ-4: cold load of #reporting opens only that item near the top of the scrollport", async () => {
        await page.goto("/faq#reporting");

        const lawsuitItem = page.locator("#reporting");
        await expect(lawsuitItem).toBeVisible();
        await expect(lawsuitButton).toHaveAttribute("aria-expanded", "true");
        await expect(lawsuitItem.getByText(/report it with the flag/i)).toBeVisible();
        await expect(firstFaqButton).toHaveAttribute("aria-expanded", "false");

        // `#app-scroll` is the real scrollport (window does not move).
        await expect
            .poll(async () => {
                return page.evaluate(() => {
                    const scroller = document.getElementById("app-scroll");
                    const target = document.getElementById("reporting");
                    if (!scroller || !target) {
                        return Number.POSITIVE_INFINITY;
                    }
                    const scrollerTop = scroller.getBoundingClientRect().top;
                    return Math.abs(target.getBoundingClientRect().top - scrollerTop);
                });
            })
            .toBeLessThan(80);
    });

    await test.step("FAQ-4: same-document hash change closes the default open item", async () => {
        await page.goto("/faq");
        await expect(firstFaqButton).toHaveAttribute("aria-expanded", "true");

        // Hash-only change (no remount) — previously left the first item open.
        await page.evaluate(() => {
            window.location.hash = "reporting";
        });
        await expect(lawsuitButton).toHaveAttribute("aria-expanded", "true");
        await expect(firstFaqButton).toHaveAttribute("aria-expanded", "false");
    });
});
