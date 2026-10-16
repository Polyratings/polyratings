import { expect, test } from "@playwright/test";

test.describe("NOT-FOUND: unknown routes stay on a not-found page", () => {
    test("NOT-FOUND-1: unknown route shows a not-found page", async ({ page }) => {
        await page.goto("/nothing-to-see-here");

        await expect(page).toHaveURL(/\/nothing-to-see-here$/);
        await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
    });

    test("NOT-FOUND-2: not-found page is titled and noindexed", async ({ page }) => {
        await page.goto("/nothing-to-see-here");

        await expect(page).toHaveTitle("Page not found · Polyratings");
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
            "content",
            "noindex, nofollow",
        );
    });
});

test.describe("NOT-FOUND: missing professors stay on a not-found page", () => {
    test("NOT-FOUND-3: invalid professor id shows a professor not-found page", async ({ page }) => {
        await page.goto("/professor/not-a-real-id");

        await expect(page).toHaveURL(/\/professor\/not-a-real-id$/);
        await expect(page.getByRole("heading", { name: "Professor not found" })).toBeVisible();
    });

    test("NOT-FOUND-4: professor not-found offers home and list links", async ({ page }) => {
        await page.goto("/professor/not-a-real-id");

        await expect(page.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
        await expect(page.getByRole("link", { name: "Browse professors" })).toHaveAttribute(
            "href",
            "/search/name",
        );
    });
});
