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
    await test.step("HOME-4: home explains search, semester conversion, and moderation", async () => {
        await expect(page.getByRole("heading", { name: "Recent Updates" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Professor Search" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Semester Conversion" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Spam and Abuse Protections" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Rating Summaries" })).toHaveCount(0);
    });
    await test.step("HOME-5: Best of the Best featured professors heading is visible", async () => {
        await expect(page.getByRole("heading", { name: "Best of the Best" })).toBeVisible();
    });
});
