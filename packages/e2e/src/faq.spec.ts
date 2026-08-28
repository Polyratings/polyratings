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
