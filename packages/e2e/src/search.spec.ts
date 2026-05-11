import { expect, test } from "@playwright/test";

test("SEARCH: search route handles no-results state", async ({ page }) => {
    await page.goto("/search/name?term=zzzzzzzzzzzzzzzzzzzz");

    await test.step("SEARCH-1: no-results heading is shown", async () => {
        await expect(page.getByRole("heading", { name: "No Results Found." })).toBeVisible();
    });
    await test.step("SEARCH-2: add-a-professor fallback CTA is shown", async () => {
        await expect(page.getByRole("link", { name: "Add a Professor?" })).toBeVisible();
    });
});
