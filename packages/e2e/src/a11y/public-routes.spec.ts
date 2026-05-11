import { expect, test } from "../support/axe-test";

test("@a11y public routes", async ({ page, scanForA11yViolations }) => {
    await page.goto("/");
    await page.waitForLoadState("load");
    await expect(page.getByRole("heading", { name: "Polyratings" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Add a Professor" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Professor List" }).first()).toBeVisible();
    await scanForA11yViolations();

    await page.goto("/about");
    await page.waitForLoadState("load");
    await expect(page.getByRole("heading", { name: "About Polyratings" })).toBeVisible();
    await scanForA11yViolations();

    await page.goto("/faq");
    await page.waitForLoadState("load");
    await expect(page.getByRole("heading", { name: "Frequently Asked Questions" })).toBeVisible();
    await scanForA11yViolations();
});
