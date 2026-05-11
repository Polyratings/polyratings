import { expect, test } from "@playwright/test";

test("search route handles no-results state", async ({ page }) => {
    await page.goto("/search/name?term=zzzzzzzzzzzzzzzzzzzz");

    await expect(page.getByRole("heading", { name: "No Results Found." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Add a Professor?" })).toBeVisible();
});
