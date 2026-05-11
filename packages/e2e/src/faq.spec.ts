import { expect, test } from "@playwright/test";

test("faq page loads expected heading", async ({ page }) => {
    await page.goto("/faq");

    await expect(page.getByRole("heading", { name: "Frequently Asked Questions" })).toBeVisible();
});
