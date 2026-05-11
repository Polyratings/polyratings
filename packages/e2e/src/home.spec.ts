import { expect, test } from "@playwright/test";

test("HOME: home page renders hero and primary nav links", async ({ page }) => {
    await page.goto("/");

    await test.step("HOME-1: main landing heading renders", async () => {
        await expect(page.getByRole("heading", { name: "Polyratings" })).toBeVisible();
    });
    await test.step("HOME-2: add-a-professor entry point is visible", async () => {
        await expect(page.getByRole("link", { name: "Add a Professor" }).first()).toBeVisible();
    });
    await test.step("HOME-3: professor-list entry point is visible", async () => {
        await expect(page.getByRole("link", { name: "Professor List" }).first()).toBeVisible();
    });
});
