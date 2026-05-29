import { expect, test } from "@playwright/test";

const DESKTOP_VIEWPORT = { width: 1280, height: 800 };
const MOBILE_VIEWPORT = { width: 375, height: 812 };

test.describe("NOT-FOUND: redirect unknown routes to home", () => {
    test("NOT-FOUND-1: unknown route redirects immediately on desktop", async ({ page }) => {
        await page.setViewportSize(DESKTOP_VIEWPORT);
        await page.goto("/nothing-to-see-here");

        await expect(page).toHaveURL("/");
        await expect(page.getByRole("heading", { name: "Polyratings" })).toBeVisible();
    });

    test("NOT-FOUND-2: unknown route shows countdown then redirects on mobile", async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto("/nothing-to-see-here");

        await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
        await expect(page.getByText("We'll redirect you to the home page in")).toBeVisible();
        await expect(page).toHaveURL("/", { timeout: 5000 });
        await expect(page.getByRole("heading", { name: "Polyratings" })).toBeVisible();
    });
});

test.describe("NOT-FOUND: redirect invalid professor routes to home", () => {
    test("NOT-FOUND-3: invalid professor id redirects immediately on desktop", async ({ page }) => {
        await page.setViewportSize(DESKTOP_VIEWPORT);
        await page.goto("/professor/not-a-real-id");

        await expect(page).toHaveURL("/");
        await expect(page.getByRole("heading", { name: "Polyratings" })).toBeVisible();
    });

    test("NOT-FOUND-4: invalid professor id shows countdown then redirects on mobile", async ({
        page,
    }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto("/professor/not-a-real-id");

        await expect(page.getByRole("heading", { name: "Professor not found" })).toBeVisible();
        await expect(page.getByText("We'll redirect you to the home page in")).toBeVisible();
        await expect(page).toHaveURL("/", { timeout: 5000 });
        await expect(page.getByRole("heading", { name: "Polyratings" })).toBeVisible();
    });
});
