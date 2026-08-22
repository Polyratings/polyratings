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

test("SEARCH: professor list shows results and stays populated while typing", async ({
    page,
}) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/search/name");

    const professorCards = page.locator('a[href^="/professor/"]');
    const searchInput = page.getByRole("combobox", { name: "Professor Auto-complete" }).first();

    await test.step("SEARCH-3: professor list renders result cards", async () => {
        await expect(page.getByRole("heading", { name: "Sort by:" })).toBeVisible({
            timeout: 15_000,
        });
        await expect(professorCards.first()).toBeVisible();
        expect(await professorCards.count()).toBeGreaterThan(0);
    });

    await test.step("SEARCH-4: typing keeps the query and matching professor cards", async () => {
        const firstName = ((await professorCards.first().locator("h3").textContent()) ?? "")
            .split(",")[0]
            .trim();
        expect(firstName).toMatch(/[A-Za-z]/);

        const query = firstName.slice(0, Math.min(3, firstName.length)).toLowerCase();
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        await searchInput.click();
        await searchInput.pressSequentially(query, { delay: 40 });

        await expect(searchInput).toHaveValue(query);
        await expect(professorCards.first()).toBeVisible();
        await expect(professorCards.first().locator("h3")).toContainText(
            new RegExp(escapedQuery, "i"),
        );
        await expect(page.getByRole("heading", { name: "No Results Found." })).toHaveCount(0);
    });
});
