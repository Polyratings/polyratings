import { expect, test } from "@playwright/test";

test("ADMIN: unauthenticated users redirect to login", async ({ page }) => {
    await page.goto("/admin");

    await test.step("ADMIN-3: unauthenticated users are sent to sign in", async () => {
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
        await expect(
            page.getByRole("heading", { name: "Polyratings Admin Panel" }),
        ).not.toBeVisible();
    });
});
