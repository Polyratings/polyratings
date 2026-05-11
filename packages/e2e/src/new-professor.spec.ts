import { expect, test } from "@playwright/test";

test("NEWPROF: desktop route renders new professor form", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/new-professor");

    await test.step("NEWPROF-1: desktop route renders professor and rating sections", async () => {
        await expect(page.getByRole("heading", { name: "Professor" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Rating" })).toBeVisible();
        await expect(page.getByLabel("First Name")).toBeVisible();
        await expect(page.getByLabel("Last Name")).toBeVisible();
    });
});

test("NEWPROF: mobile route renders linear submit flow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/new-professor");

    await test.step("NEWPROF-2: mobile route renders linear form with submit action", async () => {
        await expect(page.getByRole("heading", { name: "Professor" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();
    });
});

test("NEWPROF: empty required fields are blocked with validation state", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/new-professor");

    await test.step("NEWPROF-3: submit is blocked and required fields show field-level errors", async () => {
        await page.getByRole("button", { name: "Submit" }).click();
        await expect(page).toHaveURL(/\/new-professor$/);
        await expect(page.locator("#professorFirstName-error")).toBeVisible();
        await expect(page.locator("#professorLastName-error")).toBeVisible();
        await expect(page.locator("#ratingText-error")).toBeVisible();
        await expect(page.locator("#professorFirstName-error")).toHaveAttribute("role", "alert");
        await expect(page.locator("#professorLastName-error")).toHaveAttribute("role", "alert");
        await expect(page.locator("#ratingText-error")).toHaveAttribute("role", "alert");
        await expect(page.locator("#professorFirstName-error")).toHaveText(/.+/);
        await expect(page.locator("#professorLastName-error")).toHaveText(/.+/);
        await expect(page.locator("#ratingText-error")).toHaveText(/.+/);
    });
});

test("NEWPROF: successful submission surfaces user feedback", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/new-professor");

    await test.step("NEWPROF-4: valid submission shows success feedback and exits form route", async () => {
        const uniqueSuffix = Date.now().toString();
        await expect(page.getByRole("heading", { name: "Professor" })).toBeVisible();
        await page.locator('input[name="professorFirstName"]:visible').fill(`E2E${uniqueSuffix}`);
        await page
            .locator('input[name="professorLastName"]:visible')
            .fill(`Professor${uniqueSuffix}`);
        await page.locator('input[name="courseNum"]:visible').fill("123");
        await page
            .locator('textarea[name="ratingText"]:visible')
            .fill("This is an end-to-end rating body with enough characters.");

        await page.getByRole("button", { name: "Submit" }).click();
        await expect(
            page.getByText(
                /Thank you for adding a professor|automatically added to .*Please reach out/i,
            ),
        ).toBeVisible();
    });
});
