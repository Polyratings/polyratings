import { expect, test } from "@playwright/test";

test("FAQ: faq page loads expected heading", async ({ page }) => {
    await page.goto("/faq");

    await test.step("FAQ-1: FAQ route heading renders", async () => {
        await expect(
            page.getByRole("heading", { name: "Frequently Asked Questions" }),
        ).toBeVisible();
        await expect(
            page.getByRole("heading", {
                name: "How do I rate a class after Cal Poly switched to semesters?",
            }),
        ).toBeVisible();
    });
});

test("FAQ: lawsuit FAQ explains reporting and limits of Section 230", async ({ page }) => {
    await page.goto("/faq");

    await test.step("FAQ-2: lawsuit item tells people to report and does not claim they cannot sue", async () => {
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
