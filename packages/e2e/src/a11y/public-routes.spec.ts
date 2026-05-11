import { expect, test } from "../support/axe-test";

test("@a11y A11Y-PUB: home route accessibility baseline", async ({
    page,
    scanForA11yViolations,
}) => {
    await test.step("A11Y-PUB-1: home route has no WCAG 2.x A/AA violations", async () => {
        await page.goto("/");
        await page.waitForLoadState("load");
        await expect(page.getByRole("heading", { name: "Polyratings" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Add a Professor" }).first()).toBeVisible();
        await expect(page.getByRole("link", { name: "Professor List" }).first()).toBeVisible();
        await scanForA11yViolations();
    });
});

test("@a11y A11Y-PUB: about route accessibility baseline", async ({
    page,
    scanForA11yViolations,
}) => {
    await test.step("A11Y-PUB-2: about route has no WCAG 2.x A/AA violations", async () => {
        await page.goto("/about");
        await page.waitForLoadState("load");
        await expect(page.getByRole("heading", { name: "About Polyratings" })).toBeVisible();
        await scanForA11yViolations();
    });
});

test("@a11y A11Y-PUB: FAQ route accessibility baseline", async ({ page, scanForA11yViolations }) => {
    await test.step("A11Y-PUB-3: FAQ route has no WCAG 2.x A/AA violations", async () => {
        await page.goto("/faq");
        await page.waitForLoadState("load");
        await expect(
            page.getByRole("heading", { name: "Frequently Asked Questions" }),
        ).toBeVisible();
        await scanForA11yViolations();
    });
});
