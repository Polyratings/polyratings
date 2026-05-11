import { expect, test } from "@playwright/test";

test("about page loads expected heading", async ({ page }) => {
    await page.goto("/about");

    await expect(page.getByRole("heading", { name: "About Polyratings" })).toBeVisible();
});
