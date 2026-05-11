import { expect, test } from "@playwright/test";

test("ADMIN: access-gated message appears when unauthenticated", async ({ page }) => {
    await page.goto("/admin");

    await test.step("ADMIN-3: unauthenticated users see access-gated messaging", async () => {
        await expect(
            page.getByText("In order to use the admin panel you must be authenticated"),
        ).toBeVisible();
        await expect(
            page.getByRole("heading", { name: "Polyratings Admin Panel" }),
        ).not.toBeVisible();
    });
});
