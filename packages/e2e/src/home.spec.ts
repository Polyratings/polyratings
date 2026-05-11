import { expect, test } from "@playwright/test";

test("home page renders hero and primary nav links", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Polyratings" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Add a Professor" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Professor List" }).first()).toBeVisible();
});
