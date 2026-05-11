import { expect, test } from "@playwright/test";

test("ABOUT: about page loads expected heading", async ({ page }) => {
    await page.goto("/about");

    await test.step("ABOUT-1: about route heading renders", async () => {
        await expect(page.getByRole("heading", { name: "About Polyratings" })).toBeVisible();
    });
});
